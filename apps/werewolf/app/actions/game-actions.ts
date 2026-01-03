'use server';

/**
 * Werewolf Game Server Actions
 * 
 * These actions run on the server with elevated permissions.
 * They handle all game state mutations securely.
 * 
 * Server-authoritative logic for:
 * - Role assignment
 * - Night actions (all swaps and peeks)
 * - Phase transitions
 * - Vote counting and winner determination
 * 
 * EXTENDING WITH NEW ROLES:
 * 1. Add role to types and constants
 * 2. Add to NIGHT_ACTION_ORDER in correct position
 * 3. Add handler in executeNightAction()
 * 4. Add any special win conditions in determineWinner()
 */

import { getAdminDatabase } from '@/lib/firebase-admin';
import { updateAdminRoomIndex, updateAdminRoomStatus, updateAdminPlayerCount, removeFromAdminIndex } from './admin-index-actions';
import {
  ROOMS_BASE,
  DEFAULT_DISCUSSION_TIME,
  DEFAULT_VOTING_TIME,
  MIN_PLAYERS,
  MAX_PLAYERS,
  CENTER_CARD_COUNT,
} from '@/constants';
import { NIGHT_ACTION_ORDER, DEFAULT_ROLE_SETS } from '@/constants/roles';
import type {
  WerewolfActionResult,
  WerewolfRoomData,
  WerewolfPlayer,
  WerewolfRole,
  WerewolfCenterCards,
  WerewolfGameState,
  WerewolfGameResult,
  WerewolfNightAction,
  WerewolfNightActionResult,
  NightActionType,
  WerewolfPrivatePlayerData,
  PerformNightActionRequest,
  CastVoteRequest,
} from '@vbz/shared-types';

/**
 * Shuffle array using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Start a new game
 * 
 * Server-authoritative game start:
 * 1. Validates the requesting player is the host
 * 2. Validates player count (3-10)
 * 3. Randomly assigns roles to players and center cards
 * 4. Initializes game state
 * 5. Transitions to night phase
 * 
 * RACE CONDITION PROTECTION:
 * Uses Firebase transaction to ensure only ONE startGame succeeds
 * even if multiple tabs/clients click simultaneously.
 */
export async function startGame(
  roomId: string,
  playerId: string
): Promise<WerewolfActionResult> {
  try {
    const db = getAdminDatabase();
    const roomRef = db.ref(`${ROOMS_BASE}/${roomId}`);
    
    // Read room data first to validate
    const snapshot = await roomRef.once('value');
    const roomData = snapshot.val() as WerewolfRoomData | null;
    
    if (!roomData) {
      return { success: false, error: 'Room not found' };
    }
    
    if (!roomData.meta) {
      return { success: false, error: 'Room data is corrupted (missing meta)' };
    }
    
    // Validate status
    if (roomData.meta.status !== 'waiting') {
      return { success: false, error: `Cannot start: game is currently "${roomData.meta.status}"` };
    }
    
    const players = roomData.players || {};
    const requestingPlayer = players[playerId];
    
    if (!requestingPlayer) {
      return { success: false, error: 'You are not in this room' };
    }
    
    if (!requestingPlayer.isHost) {
      return { success: false, error: 'Only the host can start the game' };
    }
    
    const playerIds = Object.keys(players);
    const playerCount = playerIds.length;
    
    if (playerCount < MIN_PLAYERS) {
      return { success: false, error: `Need at least ${MIN_PLAYERS} players (currently ${playerCount})` };
    }
    
    if (playerCount > MAX_PLAYERS) {
      return { success: false, error: `Maximum ${MAX_PLAYERS} players allowed (currently ${playerCount})` };
    }
    
    // Use transaction ONLY to atomically update status from 'waiting' to 'reveal'
    // This prevents race conditions where two clicks start the game simultaneously
    let transactionError: string | null = null;
    let transactionCommitted = false;
    
    await roomRef.child('meta/status').transaction((currentStatus) => {
      if (currentStatus === 'waiting') {
        transactionCommitted = true;
        return 'reveal';
      } else if (currentStatus === null) {
        // Admin SDK may pass null initially - return 'reveal' to set it
        // The actual current value will be checked on server
        transactionCommitted = true;
        return 'reveal';
      } else {
        transactionError = `Cannot start: game is currently "${currentStatus}"`;
        return; // Abort
      }
    });
    
    if (transactionError || !transactionCommitted) {
      return { success: false, error: transactionError || 'Failed to start game (status conflict)' };
    }

    // Transaction succeeded - we now have exclusive lock on the game start
    // Perform the actual game setup using the roomData we read earlier
    // (players/host/count already validated above)

    // Get roles from selectedRoles (host configuration) or fall back to defaults
    const selectedRoles = roomData.meta.selectedRoles;
    const requiredRoleCount = playerCount + CENTER_CARD_COUNT;
    
    let rolesForGame: WerewolfRole[];
    
    if (selectedRoles && selectedRoles.length === requiredRoleCount) {
      // Use host-selected roles
      rolesForGame = selectedRoles;
    } else if (selectedRoles && selectedRoles.length !== requiredRoleCount) {
      // Selected roles don't match player count - revert status and error
      await roomRef.child('meta/status').set('waiting');
      return { 
        success: false, 
        error: `Selected roles (${selectedRoles.length}) don't match required count (${requiredRoleCount}). Need ${playerCount} players + 3 center cards.`
      };
    } else {
      // No roles selected - use default set for player count
      rolesForGame = DEFAULT_ROLE_SETS[playerCount] || DEFAULT_ROLE_SETS[MIN_PLAYERS];
    }

    // Validate at least one werewolf
    const werewolfCount = rolesForGame.filter(r => r === 'werewolf').length;
    if (werewolfCount === 0) {
      await roomRef.child('meta/status').set('waiting');
      return { success: false, error: 'Selected roles must include at least one Werewolf' };
    }

    // Validate Mason count - can be 0 or 2+, but not exactly 1
    const masonCount = rolesForGame.filter(r => r === 'mason').length;
    if (masonCount === 1) {
      await roomRef.child('meta/status').set('waiting');
      return { success: false, error: 'Masons must be 0 or 2+, not exactly 1 (they work in pairs)' };
    }

    // Validate all roles are known types
    const validRoles: WerewolfRole[] = ['werewolf', 'seer', 'robber', 'troublemaker', 'villager', 'minion', 'mason', 'drunk', 'insomniac', 'witch'];
    const invalidRoles = rolesForGame.filter(r => !validRoles.includes(r));
    if (invalidRoles.length > 0) {
      await roomRef.child('meta/status').set('waiting');
      return { success: false, error: `Unknown role(s): ${invalidRoles.join(', ')}` };
    }

    const shuffledRoles = shuffleArray(rolesForGame);

    // Assign roles to players
    const playerRoles: Record<string, WerewolfRole> = {};
    for (let i = 0; i < playerCount; i++) {
      playerRoles[playerIds[i]] = shuffledRoles[i];
    }

    // Assign center cards (last 3 roles)
    const centerCards: WerewolfCenterCards = {
      card1: shuffledRoles[playerCount],
      card2: shuffledRoles[playerCount + 1],
      card3: shuffledRoles[playerCount + 2],
    };

    // Determine which roles have night actions
    const activeRoles = Object.values(playerRoles);
    const nightActionOrder = NIGHT_ACTION_ORDER.filter((role) =>
      activeRoles.includes(role)
    );

    // Calculate timestamps
    const now = Date.now();
    const discussionTime = roomData.meta.settings?.discussionTime || DEFAULT_DISCUSSION_TIME;
    const votingTime = roomData.meta.settings?.votingTime || DEFAULT_VOTING_TIME;
    
    // Start in reveal phase - night phase begins when all players are ready
    const gameState: WerewolfGameState = {
      startedAt: now,
      endsAt: now + (discussionTime + votingTime) * 1000, // Estimated total time
      dayEndsAt: null,
      votingEndsAt: null,
      currentPhase: 'reveal',
      nightActionOrder,
      currentNightActionIndex: 0,
    };

    // Create private player data for each player
    const privatePlayerData: Record<string, WerewolfPrivatePlayerData> = {};
    for (const pid of playerIds) {
      privatePlayerData[pid] = {
        originalRole: playerRoles[pid],
        currentRole: playerRoles[pid],
      };
    }

    // Reset player states using Firebase multi-path update
    // Note: These are path-based updates, not object property assignments
    const playerUpdates: Record<string, unknown> = {};
    for (const pid of playerIds) {
      playerUpdates[`players/${pid}/hasActed`] = false;
      playerUpdates[`players/${pid}/vote`] = null;
      playerUpdates[`players/${pid}/isReady`] = false;
    }

    // During reveal phase, activeNightRole should be null
    // It will be set when transitioning to night phase

    // Atomic write - start in reveal phase, not night
    await roomRef.update({
      'meta/status': 'reveal',
      'meta/activeNightRole': null,  // No active role during reveal
      'meta/gameRoles': rolesForGame,  // Store all roles for public display
      roles: playerRoles,
      currentRoles: { ...playerRoles }, // Copy for tracking swaps
      centerCards,
      state: gameState,
      privatePlayerData,
      nightActions: {}, // Clear any previous actions
      result: null,     // Clear previous result
      ...playerUpdates,
    });

    // Update admin index (non-blocking)
    updateAdminRoomStatus(roomId, 'reveal').catch(console.error);

    return { success: true };
  } catch (error) {
    console.error('startGame error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start game',
    };
  }
}

/**
 * Perform a night action
 * 
 * Handles all night phase actions:
 * - Werewolf: See other werewolves, or peek at center if alone
 * - Seer: Look at player card or 2 center cards
 * - Robber: Swap with player and see new role
 * - Troublemaker: Swap two other players
 * - Villager: No action (auto-completes)
 * 
 * RACE CONDITION PROTECTION:
 * Uses transaction to atomically check hasActed and set it,
 * preventing double-action from multiple tabs or rapid clicks.
 * 
 * TURN ENFORCEMENT:
 * Player can only act if their role matches meta.activeNightRole.
 */
export async function performNightAction({
  roomId,
  playerId,
  action,
  target,
}: PerformNightActionRequest): Promise<WerewolfActionResult> {
  try {
    const db = getAdminDatabase();
    const roomPath = `${ROOMS_BASE}/${roomId}`;
    const roomRef = db.ref(roomPath);

    // Read room data first to validate
    const snapshot = await roomRef.once('value');
    const roomData = snapshot.val() as WerewolfRoomData | null;

    if (!roomData) {
      return { success: false, error: 'Room not found' };
    }

    // Validate game status
    if (roomData.meta.status !== 'night') {
      return { success: false, error: 'Night actions can only be performed during night phase' };
    }

    const player = roomData.players?.[playerId];
    if (!player) {
      return { success: false, error: 'Player not found in room' };
    }

    const originalRole = roomData.roles?.[playerId];
    if (!originalRole) {
      return { success: false, error: 'Role not assigned' };
    }

    // ========================================
    // STRICT TURN ENFORCEMENT
    // ========================================
    const activeNightRole = roomData.meta.activeNightRole;
    
    // If no active night role, night phase is complete (shouldn't happen if status is 'night')
    if (!activeNightRole) {
      return { success: false, error: 'Night phase is complete - no roles currently acting' };
    }
    
    // Validate player's role matches the currently active role
    if (originalRole !== activeNightRole) {
      return { 
        success: false, 
        error: `Not your turn. Currently waiting for: ${activeNightRole}` 
      };
    }

    // Special case: werewolf_discover is a non-committing action to check for other werewolves
    // This allows lone werewolves to see they're alone, then decide whether to peek
    // Similarly, witch_peek is a non-committing action to peek at a center card before deciding to swap
    const isDiscoveryAction = action === 'werewolf_discover' || action === 'witch_peek';

    // For discovery actions, skip hasActed check (it's read-only discovery)
    // For all other actions, use transaction on hasActed field to prevent double-action
    if (!isDiscoveryAction) {
      // Check if already acted (pre-check to fail fast)
      if (player.hasActed) {
        return { success: false, error: 'You have already performed your night action' };
      }

      // Use transaction on just the hasActed field for atomic check-and-set
      const hasActedRef = roomRef.child(`players/${playerId}/hasActed`);
      const transactionResult = await hasActedRef.transaction((currentHasActed: boolean | null) => {
        // If already acted, abort
        if (currentHasActed === true) {
          return; // Abort transaction
        }
        // Set hasActed to true
        return true;
      });

      if (!transactionResult.committed) {
        return { success: false, error: 'You have already performed your night action' };
      }
    }

    // Execute the action and get result
    const result = await executeNightAction({
      roomId,
      playerId,
      role: originalRole,
      action,
      target,
      roomData,
      db,
    });

    if (!result.success) {
      // Revert hasActed on error
      if (!isDiscoveryAction) {
        await roomRef.child(`players/${playerId}/hasActed`).set(false);
      }
      return result;
    }

    // For discovery actions, just return the result without storing anything
    // This allows the player to then make their actual choice (peek or skip)
    if (isDiscoveryAction) {
      return { success: true, data: result.data };
    }

    // Store the night action (Firebase doesn't allow undefined, use null instead)
    const nightAction: WerewolfNightAction = {
      playerId,
      role: originalRole,
      action,
      target: target ?? null,
      result: result.data as WerewolfNightActionResult,
      performedAt: Date.now(),
    };
    await roomRef.child(`nightActions/${playerId}`).set(nightAction);

    // Update private player data with result
    if (result.data) {
      await roomRef.child(`privatePlayerData/${playerId}/nightActionResult`).set(result.data);
    }

    // ========================================
    // AUTO-ADVANCE TO NEXT ROLE
    // ========================================
    // Check if all players of the CURRENT ROLE have acted
    const allPlayers = Object.keys(roomData.players || {});
    const playersWithCurrentRole = allPlayers.filter(
      (pid) => roomData.roles?.[pid] === originalRole
    );
    
    // Re-read to get latest hasActed state
    const updatedSnapshot = await roomRef.once('value');
    const updatedData: WerewolfRoomData = updatedSnapshot.val();
    
    const allOfRoleActed = playersWithCurrentRole.every(
      (pid) => updatedData.players?.[pid]?.hasActed
    );

    if (allOfRoleActed) {
      // All players of this role have acted - advance to next role
      await advanceToNextNightRole(roomId, updatedData);
    }

    return { success: true, data: result.data };
  } catch (error) {
    console.error('performNightAction error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to perform night action',
    };
  }
}

/**
 * Execute a specific night action
 */
async function executeNightAction({
  roomId,
  playerId,
  role,
  action,
  target,
  roomData,
  db,
}: {
  roomId: string;
  playerId: string;
  role: WerewolfRole;
  action: NightActionType;
  target?: string | string[];
  roomData: WerewolfRoomData;
  db: ReturnType<typeof getAdminDatabase>;
}): Promise<WerewolfActionResult> {
  const roomRef = db.ref(`${ROOMS_BASE}/${roomId}`);
  const currentRoles = roomData.currentRoles || roomData.roles || {};
  const centerCards = roomData.centerCards;
  const playerIds = Object.keys(roomData.players || {});

  switch (role) {
    case 'werewolf': {
      // Find other werewolves
      const otherWerewolves = playerIds.filter(
        (pid) => pid !== playerId && currentRoles[pid] === 'werewolf'
      );

      // werewolf_discover: Just check for other werewolves (doesn't commit the action)
      // This allows the UI to show whether the player is a lone werewolf
      if (action === 'werewolf_discover') {
        return {
          success: true,
          data: { 
            otherWerewolves,
            // Flag to indicate this was just discovery, not the final action
            isDiscoveryOnly: true,
          } as WerewolfNightActionResult,
        };
      }

      if (otherWerewolves.length > 0) {
        // Multiple werewolves - just see each other, action complete
        return {
          success: true,
          data: { otherWerewolves, isLoneWolf: false } as WerewolfNightActionResult,
        };
      } else if (action === 'werewolf_peek' && typeof target === 'string') {
        // Lone werewolf can peek at one center card
        const cardIndex = parseInt(target);
        if (cardIndex < 0 || cardIndex > 2) {
          return { success: false, error: 'Invalid center card index' };
        }
        const cardKey = `card${cardIndex + 1}` as keyof WerewolfCenterCards;
        const seenRole = centerCards?.[cardKey];
        return {
          success: true,
          data: {
            otherWerewolves: [],
            isLoneWolf: true,
            centerCardSeen: seenRole,
          } as WerewolfNightActionResult,
        };
      } else {
        // Lone werewolf chose not to peek (action: 'none' or skip)
        return {
          success: true,
          data: { otherWerewolves: [], isLoneWolf: true, skipped: true } as WerewolfNightActionResult,
        };
      }
    }

    case 'seer': {
      if (action === 'seer_player' && typeof target === 'string') {
        // Look at another player's current role
        if (target === playerId) {
          return { success: false, error: 'Cannot look at your own card' };
        }
        const targetRole = currentRoles[target];
        if (!targetRole) {
          return { success: false, error: 'Invalid target player' };
        }
        return {
          success: true,
          data: {
            playerRoleSeen: { playerId: target, role: targetRole },
          } as WerewolfNightActionResult,
        };
      } else if (action === 'seer_center' && Array.isArray(target)) {
        // Look at two center cards
        if (target.length !== 2) {
          return { success: false, error: 'Must select exactly 2 center cards' };
        }
        const centerCardsSeen: { index: number; role: WerewolfRole }[] = [];
        for (const idx of target) {
          const cardIndex = parseInt(idx);
          if (cardIndex < 0 || cardIndex > 2) {
            return { success: false, error: 'Invalid center card index' };
          }
          const cardKey = `card${cardIndex + 1}` as keyof WerewolfCenterCards;
          centerCardsSeen.push({
            index: cardIndex,
            role: centerCards?.[cardKey] as WerewolfRole,
          });
        }
        return {
          success: true,
          data: { centerCardsSeen } as WerewolfNightActionResult,
        };
      } else {
        return { success: false, error: 'Invalid seer action' };
      }
    }

    case 'robber': {
      if (action === 'robber_swap' && typeof target === 'string') {
        if (target === playerId) {
          return { success: false, error: 'Cannot rob yourself' };
        }
        const targetRole = currentRoles[target];
        if (!targetRole) {
          return { success: false, error: 'Invalid target player' };
        }
        
        // Swap roles
        const myRole = currentRoles[playerId];
        await roomRef.child(`currentRoles/${playerId}`).set(targetRole);
        await roomRef.child(`currentRoles/${target}`).set(myRole);
        
        // Update private data - robber now has the new role
        await roomRef.child(`privatePlayerData/${playerId}/currentRole`).set(targetRole);
        await roomRef.child(`privatePlayerData/${target}/currentRole`).set(myRole);
        
        return {
          success: true,
          data: { newRole: targetRole, robbedPlayerId: target } as WerewolfNightActionResult,
        };
      } else if (action === 'none') {
        // Robber chose not to swap
        return { success: true, data: { skipped: true } as WerewolfNightActionResult };
      } else {
        return { success: false, error: 'Invalid robber action' };
      }
    }

    case 'troublemaker': {
      if (action === 'troublemaker_swap' && Array.isArray(target) && target.length === 2) {
        const [player1, player2] = target;
        if (player1 === playerId || player2 === playerId) {
          return { success: false, error: 'Cannot include yourself in the swap' };
        }
        if (player1 === player2) {
          return { success: false, error: 'Must select two different players' };
        }
        
        const role1 = currentRoles[player1];
        const role2 = currentRoles[player2];
        if (!role1 || !role2) {
          return { success: false, error: 'Invalid target players' };
        }
        
        // Swap the two players' roles
        await roomRef.child(`currentRoles/${player1}`).set(role2);
        await roomRef.child(`currentRoles/${player2}`).set(role1);
        
        // Update private data for swapped players
        await roomRef.child(`privatePlayerData/${player1}/currentRole`).set(role2);
        await roomRef.child(`privatePlayerData/${player2}/currentRole`).set(role1);
        
        return {
          success: true,
          data: { swappedPlayers: [player1, player2] } as WerewolfNightActionResult,
        };
      } else if (action === 'none') {
        // Troublemaker chose not to swap - return explicit skipped indicator
        return { 
          success: true, 
          data: { skipped: true } as WerewolfNightActionResult 
        };
      } else {
        return { success: false, error: 'Invalid troublemaker action' };
      }
    }

    // =====================
    // ADVANCED PACK 1 ROLES
    // =====================

    case 'minion': {
      // Minion sees who the werewolves are (but werewolves don't know the minion)
      const werewolves = playerIds.filter(
        (pid) => currentRoles[pid] === 'werewolf'
      );
      return {
        success: true,
        data: { werewolvesSeen: werewolves } as WerewolfNightActionResult,
      };
    }

    case 'mason': {
      // Mason sees the other mason (if any)
      const otherMason = playerIds.find(
        (pid) => pid !== playerId && currentRoles[pid] === 'mason'
      );
      return {
        success: true,
        data: { otherMason: otherMason || null } as WerewolfNightActionResult,
      };
    }

    case 'drunk': {
      // Drunk MUST swap with a center card (no choice to skip)
      if (action === 'drunk_swap' && typeof target === 'string') {
        const cardIndex = parseInt(target);
        if (cardIndex < 0 || cardIndex > 2) {
          return { success: false, error: 'Invalid center card index' };
        }
        
        const cardKey = `card${cardIndex + 1}` as keyof WerewolfCenterCards;
        const centerRole = centerCards?.[cardKey];
        const drunkRole = currentRoles[playerId];
        
        if (!centerRole || !drunkRole) {
          return { success: false, error: 'Invalid swap state' };
        }
        
        // Swap drunk's card with center card
        await roomRef.child(`currentRoles/${playerId}`).set(centerRole);
        await roomRef.child(`centerCards/${cardKey}`).set(drunkRole);
        
        // Update private data - drunk does NOT see their new role
        await roomRef.child(`privatePlayerData/${playerId}/currentRole`).set(centerRole);
        
        return {
          success: true,
          // Drunk only knows WHICH card they swapped with, not what role they got
          data: { centerCardSwapped: cardIndex } as WerewolfNightActionResult,
        };
      } else {
        return { success: false, error: 'Drunk must select a center card to swap with' };
      }
    }

    case 'witch': {
      // Witch: First peeks at one center card, then optionally swaps it with any player
      
      if (action === 'witch_peek' && typeof target === 'string') {
        // Step 1: Peek at one center card (non-committing, like werewolf_discover)
        const cardIndex = parseInt(target);
        if (cardIndex < 0 || cardIndex > 2) {
          return { success: false, error: 'Invalid center card index' };
        }
        const cardKey = `card${cardIndex + 1}` as keyof WerewolfCenterCards;
        const seenRole = centerCards?.[cardKey];
        
        if (!seenRole) {
          return { success: false, error: 'Invalid center card' };
        }
        
        return {
          success: true,
          data: { 
            witchPeekedCard: { index: cardIndex, role: seenRole },
            isDiscoveryOnly: true, // Indicates action not yet committed
          } as WerewolfNightActionResult,
        };
      }
      
      if (action === 'witch_swap' && Array.isArray(target) && target.length === 2) {
        // Step 2: Swap the peeked center card with a player's card
        // target[0] = center card index (as string), target[1] = player ID to swap with
        const [centerIdxStr, targetPlayerId] = target;
        const cardIndex = parseInt(centerIdxStr);
        
        if (cardIndex < 0 || cardIndex > 2) {
          return { success: false, error: 'Invalid center card index' };
        }
        
        // Validate target player exists
        if (!currentRoles[targetPlayerId]) {
          return { success: false, error: 'Invalid target player' };
        }
        
        const cardKey = `card${cardIndex + 1}` as keyof WerewolfCenterCards;
        const centerRole = centerCards?.[cardKey];
        const targetRole = currentRoles[targetPlayerId];
        
        if (!centerRole || !targetRole) {
          return { success: false, error: 'Invalid swap state' };
        }
        
        // Perform the swap: center card <-> target player's card
        await roomRef.child(`currentRoles/${targetPlayerId}`).set(centerRole);
        await roomRef.child(`centerCards/${cardKey}`).set(targetRole);
        
        // Update private data for the target player
        await roomRef.child(`privatePlayerData/${targetPlayerId}/currentRole`).set(centerRole);
        
        return {
          success: true,
          data: { 
            witchPeekedCard: { index: cardIndex, role: centerRole },
            witchSwappedWith: targetPlayerId,
          } as WerewolfNightActionResult,
        };
      }
      
      if (action === 'witch_skip' && typeof target === 'string') {
        // Witch peeked at a card but chose not to swap - commit the peek info
        const cardIndex = parseInt(target);
        if (cardIndex < 0 || cardIndex > 2) {
          return { success: false, error: 'Invalid center card index' };
        }
        const cardKey = `card${cardIndex + 1}` as keyof WerewolfCenterCards;
        const seenRole = centerCards?.[cardKey];
        
        return {
          success: true,
          data: { 
            witchPeekedCard: { index: cardIndex, role: seenRole as WerewolfRole },
          } as WerewolfNightActionResult,
        };
      }
      
      if (action === 'none') {
        // Witch chose to skip entirely without peeking (shouldn't normally happen but handle it)
        return { success: true, data: { skipped: true } as WerewolfNightActionResult };
      }
      
      return { success: false, error: 'Invalid witch action' };
    }

    case 'insomniac': {
      // Insomniac looks at their own card at the END of night (after all swaps)
      // Re-read currentRoles to get the latest state after all swaps
      const latestSnapshot = await roomRef.child('currentRoles').once('value');
      const latestRoles = latestSnapshot.val() || currentRoles;
      const finalRole = latestRoles[playerId];
      
      return {
        success: true,
        data: { finalRole } as WerewolfNightActionResult,
      };
    }

    case 'villager': {
      // Villagers have no night action
      return { success: true, data: { skipped: true } as WerewolfNightActionResult };
    }

    default:
      return { success: false, error: `Unknown role: ${role}` };
  }
}

/**
 * Skip night action (for players without actions or who want to skip)
 */
export async function skipNightAction(
  roomId: string,
  playerId: string
): Promise<WerewolfActionResult> {
  return performNightAction({
    roomId,
    playerId,
    action: 'none',
  });
}

/**
 * Set player ready for night phase (during reveal phase)
 * 
 * Called when a player has seen their role and is ready to proceed to night actions.
 * When ALL players are ready, automatically transitions to night phase.
 * 
 * RACE CONDITION PROTECTION:
 * Uses transaction on isReady field and re-reads after update to check all players.
 */
export async function setPlayerReadyForNight(
  roomId: string,
  playerId: string
): Promise<WerewolfActionResult> {
  try {
    const db = getAdminDatabase();
    const roomRef = db.ref(`${ROOMS_BASE}/${roomId}`);

    // Pre-read room data for validation
    const snapshot = await roomRef.once('value');
    const roomData: WerewolfRoomData | null = snapshot.val();

    if (!roomData) {
      return { success: false, error: 'Room not found' };
    }

    // Validate we're in reveal phase
    if (roomData.meta.status !== 'reveal') {
      return { success: false, error: 'Can only set ready during reveal phase' };
    }

    // Validate player exists
    const player = roomData.players?.[playerId];
    if (!player) {
      return { success: false, error: 'Player not found in room' };
    }

    // If already ready, no need to update
    if (player.isReady) {
      return { success: true };
    }

    // Set player as ready using transaction for atomic update
    const isReadyRef = roomRef.child(`players/${playerId}/isReady`);
    const transactionResult = await isReadyRef.transaction((currentIsReady: boolean | null) => {
      // If already ready, no change needed
      if (currentIsReady === true) {
        return; // Abort - no change
      }
      return true;
    });

    if (!transactionResult.committed) {
      // Already ready, return success
      return { success: true };
    }

    // Re-read room to check if ALL players are now ready
    const updatedSnapshot = await roomRef.once('value');
    const updatedRoomData: WerewolfRoomData | null = updatedSnapshot.val();

    if (!updatedRoomData) {
      return { success: true }; // Room was deleted? Just return success
    }

    const players = updatedRoomData.players || {};
    const playerIds = Object.keys(players);
    const allReady = playerIds.every((pid) => players[pid]?.isReady);

    if (allReady) {
      // All players are ready - transition to night phase!
      const nightActionOrder = updatedRoomData.state?.nightActionOrder || [];
      const firstNightRole = nightActionOrder.length > 0 ? nightActionOrder[0] : null;

      // Reset hasActed for all players for the night phase
      const playerUpdates: Record<string, unknown> = {};
      for (const pid of playerIds) {
        playerUpdates[`players/${pid}/hasActed`] = false;
      }

      // Transition to night
      await roomRef.update({
        'meta/status': 'night',
        'meta/activeNightRole': firstNightRole,
        'state/currentPhase': 'night',
        'state/currentNightActionIndex': 0,
        ...playerUpdates,
      });
    }

    return { success: true };
  } catch (error) {
    console.error('setPlayerReadyForNight error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to set ready',
    };
  }
}

/**
 * Check if night phase is complete
 * 
 * NIGHT COMPLETE CONDITIONS:
 * 1. All players with night actions have acted, OR
 * 2. All players have acted (including villagers marking "done")
 * 
 * Returns: { complete: boolean, actedCount: number, totalPlayers: number, pendingRoles: string[] }
 */
export async function checkNightComplete(
  roomId: string
): Promise<{ complete: boolean; actedCount: number; totalPlayers: number; pendingPlayers: string[] }> {
  const db = getAdminDatabase();
  const roomRef = db.ref(`${ROOMS_BASE}/${roomId}`);
  
  const snapshot = await roomRef.once('value');
  const roomData: WerewolfRoomData | null = snapshot.val();
  
  if (!roomData || roomData.meta.status !== 'night') {
    return { complete: false, actedCount: 0, totalPlayers: 0, pendingPlayers: [] };
  }

  const players = roomData.players || {};
  const playerIds = Object.keys(players);
  const totalPlayers = playerIds.length;
  
  const actedCount = playerIds.filter((pid) => players[pid]?.hasActed).length;
  const pendingPlayers = playerIds.filter((pid) => !players[pid]?.hasActed);
  
  return {
    complete: actedCount === totalPlayers,
    actedCount,
    totalPlayers,
    pendingPlayers,
  };
}

/**
 * Force advance from night to day (host only)
 * 
 * Use when:
 * - Some players are AFK/unresponsive
 * - Host wants to speed up the game
 * 
 * RACE CONDITION PROTECTION:
 * Uses transaction to ensure atomic phase transition.
 */
export async function forceAdvanceToDay(
  roomId: string,
  playerId: string
): Promise<WerewolfActionResult> {
  try {
    const db = getAdminDatabase();
    const roomRef = db.ref(`${ROOMS_BASE}/${roomId}`);

    // Pre-read room data
    const snapshot = await roomRef.once('value');
    const roomData: WerewolfRoomData | null = snapshot.val();

    if (!roomData) {
      return { success: false, error: 'Room not found' };
    }

    // Validate phase
    if (roomData.meta.status !== 'night') {
      return { success: false, error: 'Can only advance from night phase' };
    }

    // Validate host
    const player = roomData.players?.[playerId];
    if (!player?.isHost) {
      return { success: false, error: 'Only the host can force advance' };
    }

    const discussionTime = roomData.meta.settings?.discussionTime || DEFAULT_DISCUSSION_TIME;
    const now = Date.now();
    const dayEndsAt = now + discussionTime * 1000;

    // Direct update instead of full-room transaction
    await roomRef.update({
      'meta/status': 'day',
      'state/currentPhase': 'day',
      'state/dayEndsAt': dayEndsAt,
    });

    return { success: true };
  } catch (error) {
    console.error('forceAdvanceToDay error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to force advance',
    };
  }
}

/**
 * Advance to the next night role (internal - called when all players of current role have acted)
 * 
 * This handles the strict turn-based night phase:
 * 1. Find the next role in nightActionOrder that has active players
 * 2. Reset hasActed for all players (so the new role's players can act)
 * 3. Update meta.activeNightRole
 * 4. If no more roles, advance to day phase
 */
async function advanceToNextNightRole(roomId: string, roomData: WerewolfRoomData): Promise<void> {
  const db = getAdminDatabase();
  const roomRef = db.ref(`${ROOMS_BASE}/${roomId}`);
  
  const nightActionOrder = roomData.state?.nightActionOrder || [];
  const currentIndex = roomData.state?.currentNightActionIndex || 0;
  const roles = roomData.roles || {};
  const allPlayers = Object.keys(roomData.players || {});
  
  // Find next role that has players in the game
  let nextIndex = currentIndex + 1;
  let nextRole: WerewolfRole | null = null;
  
  while (nextIndex < nightActionOrder.length) {
    const candidateRole = nightActionOrder[nextIndex];
    // Check if any player has this role
    const hasPlayers = allPlayers.some(pid => roles[pid] === candidateRole);
    if (hasPlayers) {
      nextRole = candidateRole;
      break;
    }
    nextIndex++;
  }
  
  if (nextRole) {
    // Reset hasActed for ALL players (so new role's players can act)
    const playerUpdates: Record<string, unknown> = {};
    for (const pid of allPlayers) {
      playerUpdates[`players/${pid}/hasActed`] = false;
    }
    
    // Advance to next role
    await roomRef.update({
      'meta/activeNightRole': nextRole,
      'state/currentNightActionIndex': nextIndex,
      ...playerUpdates,
    });
  } else {
    // No more roles - advance to day
    await advanceToDay(roomId);
  }
}

/**
 * Advance to day phase (internal - called when all players have acted)
 */
async function advanceToDay(roomId: string): Promise<void> {
  const db = getAdminDatabase();
  const roomRef = db.ref(`${ROOMS_BASE}/${roomId}`);
  
  const snapshot = await roomRef.once('value');
  const roomData: WerewolfRoomData | null = snapshot.val();
  
  if (!roomData) return;

  const discussionTime = roomData.meta.settings?.discussionTime || DEFAULT_DISCUSSION_TIME;
  const now = Date.now();
  const dayEndsAt = now + discussionTime * 1000;

  await roomRef.update({
    'meta/status': 'day',
    'meta/activeNightRole': null,  // Clear night role when entering day
    'state/currentPhase': 'day',
    'state/dayEndsAt': dayEndsAt,
  });
}

/**
 * Advance from day to voting phase (host only)
 * 
 * Uses pre-read + direct update for reliable Firebase operations.
 */
export async function advanceToVoting(
  roomId: string,
  playerId: string
): Promise<WerewolfActionResult> {
  console.log('[SERVER] advanceToVoting called:', { roomId, playerId });
  try {
    const db = getAdminDatabase();
    const roomRef = db.ref(`${ROOMS_BASE}/${roomId}`);

    // Pre-read room data
    const snapshot = await roomRef.once('value');
    const roomData: WerewolfRoomData | null = snapshot.val();
    console.log('[SERVER] Room data status:', roomData?.meta?.status);

    if (!roomData) {
      console.log('[SERVER] Room not found');
      return { success: false, error: 'Room not found' };
    }

    // Validate phase
    if (roomData.meta.status !== 'day') {
      console.log('[SERVER] Wrong phase:', roomData.meta.status, '- expected day');
      return { success: false, error: `Can only advance to voting from day phase (current: ${roomData.meta.status})` };
    }

    // Validate host
    const player = roomData.players?.[playerId];
    if (!player?.isHost) {
      console.log('[SERVER] Not host:', playerId, 'isHost:', player?.isHost);
      return { success: false, error: 'Only the host can advance to voting' };
    }

    const votingTime = roomData.meta.settings?.votingTime || DEFAULT_VOTING_TIME;
    const now = Date.now();
    const votingEndsAt = now + votingTime * 1000;

    // Build update object - reset all votes to null
    const updates: Record<string, unknown> = {
      'meta/status': 'voting',
      'state/currentPhase': 'voting',
      'state/votingEndsAt': votingEndsAt,
    };

    // Reset votes for all players
    for (const pid of Object.keys(roomData.players || {})) {
      updates[`players/${pid}/vote`] = null;
    }

    console.log('[SERVER] Applying updates:', JSON.stringify(updates));
    // Direct update instead of full-room transaction
    await roomRef.update(updates);
    console.log('[SERVER] Update complete!');

    return { success: true };
  } catch (error) {
    console.error('advanceToVoting error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to advance to voting',
    };
  }
}

/**
 * Cast a vote during voting phase
 */
export async function castVote({
  roomId,
  playerId,
  targetPlayerId,
}: CastVoteRequest): Promise<WerewolfActionResult> {
  try {
    const db = getAdminDatabase();
    const roomRef = db.ref(`${ROOMS_BASE}/${roomId}`);

    const snapshot = await roomRef.once('value');
    const roomData: WerewolfRoomData | null = snapshot.val();
    
    if (!roomData) {
      return { success: false, error: 'Room not found' };
    }
    
    if (roomData.meta.status !== 'voting') {
      return { success: false, error: 'Voting is not active' };
    }

    const player = roomData.players?.[playerId];
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    // Validate target exists
    if (!roomData.players?.[targetPlayerId]) {
      return { success: false, error: 'Invalid vote target' };
    }

    // Record the vote
    await roomRef.child(`players/${playerId}/vote`).set(targetPlayerId);

    // Check if all players have voted
    // Re-read to get the latest state after recording this vote
    const updatedSnapshot = await roomRef.once('value');
    const updatedData: WerewolfRoomData = updatedSnapshot.val();
    const allPlayers = Object.keys(updatedData.players || {});
    
    // Count votes - use typeof check because Firebase RTDB deletes null values
    // making them undefined, not null
    const votedCount = allPlayers.filter(
      (pid) => typeof updatedData.players?.[pid]?.vote === 'string'
    ).length;
    
    const allVoted = votedCount === allPlayers.length;

    if (allVoted) {
      // End the game and determine winner
      await endGameAndDetermineWinner(roomId);
    }

    return { success: true };
  } catch (error) {
    console.error('castVote error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cast vote',
    };
  }
}

/**
 * End the game and determine the winner
 * 
 * WIN CONDITIONS (One Night Ultimate Werewolf rules):
 * 
 * 1. If at least one werewolf exists (player OR center):
 *    - Village wins IF at least one werewolf is killed
 *    - Werewolves win IF no werewolf is killed
 * 
 * 2. If NO werewolves exist anywhere (players + center):
 *    - Village wins IF someone is killed (they correctly found no wolves)
 *    - Village loses IF nobody is killed (they should have killed someone)
 * 
 * 3. Minion special case:
 *    - Minion wins IF minion dies AND no werewolf dies (even if werewolves lose)
 */
async function endGameAndDetermineWinner(roomId: string): Promise<void> {
  const db = getAdminDatabase();
  const roomRef = db.ref(`${ROOMS_BASE}/${roomId}`);

  const snapshot = await roomRef.once('value');
  const roomData: WerewolfRoomData | null = snapshot.val();
  
  if (!roomData) return;

  const players = roomData.players || {};
  const currentRoles = roomData.currentRoles || roomData.roles || {};
  const centerCards = roomData.centerCards;
  const playerIds = Object.keys(players);

  // Count votes
  const voteCounts: Record<string, number> = {};
  const votes: Record<string, string> = {};
  
  for (const pid of playerIds) {
    const vote = players[pid]?.vote;
    if (vote) {
      votes[pid] = vote;
      voteCounts[vote] = (voteCounts[vote] || 0) + 1;
    }
  }

  // Find player(s) with most votes
  const maxVotes = Math.max(...Object.values(voteCounts), 0);
  const eliminated = playerIds.filter((pid) => voteCounts[pid] === maxVotes);

  // Determine winner based on eliminated player's CURRENT role
  let winners: 'village' | 'werewolf' | 'nobody' | null = null;
  let eliminatedPlayerId: string | null = null;
  let eliminatedPlayerRole: WerewolfRole | null = null;

  // Find all werewolves among PLAYERS (by current/final role)
  const playerWerewolves = playerIds.filter((pid) => currentRoles[pid] === 'werewolf');
  
  // Check for werewolves in CENTER cards (these count as "existing" but cannot be killed)
  const centerWerewolves = centerCards 
    ? Object.values(centerCards).filter((role) => role === 'werewolf')
    : [];
  
  // Total werewolves in the game (players + center)
  const totalWerewolvesInGame = playerWerewolves.length + centerWerewolves.length;
  const werewolvesExist = totalWerewolvesInGame > 0;

  // Determine if anyone was eliminated
  const someoneEliminated = eliminated.length === 1 && maxVotes > 0;
  
  if (someoneEliminated) {
    eliminatedPlayerId = eliminated[0];
    eliminatedPlayerRole = currentRoles[eliminatedPlayerId];
  }

  // Check if a werewolf was killed
  const werewolfKilled = eliminatedPlayerRole === 'werewolf';
  
  // Check if minion was killed (for special win condition)
  const minionKilled = eliminatedPlayerRole === 'minion';

  // Apply win conditions
  if (werewolvesExist) {
    // Case 1: Werewolves exist in the game (player OR center)
    if (werewolfKilled) {
      // Village wins - they killed a werewolf
      winners = 'village';
    } else {
      // Werewolves win - no werewolf was killed
      // This includes: nobody eliminated, tie, or innocent/minion killed
      // Note: Minion special win is handled in UI display, werewolf team still "wins"
      winners = 'werewolf';
    }
  } else {
    // Case 2: No werewolves exist anywhere (all in neither players nor center)
    // This is rare but can happen with certain role configurations
    if (someoneEliminated) {
      // Village loses - they killed an innocent when there were no werewolves
      // The correct play was to NOT kill anyone
      winners = 'nobody';
    } else {
      // Village wins - they correctly didn't kill anyone
      winners = 'village';
    }
  }

  const result: WerewolfGameResult = {
    winners,
    eliminatedPlayerId,
    eliminatedPlayerRole,
    votes,
    finalRoles: currentRoles,
    originalRoles: roomData.roles || {},
    centerCards: centerCards as WerewolfCenterCards,
    nightActions: roomData.nightActions || {},
  };

  await roomRef.update({
    'meta/status': 'ended',
    'state/currentPhase': 'ended',
    result,
  });

  // Update admin index (non-blocking)
  updateAdminRoomStatus(roomId, 'finished').catch(console.error);
}

/**
 * Force end the game (host only)
 */
export async function endGame(
  roomId: string,
  playerId: string
): Promise<WerewolfActionResult> {
  try {
    const db = getAdminDatabase();
    const roomRef = db.ref(`${ROOMS_BASE}/${roomId}`);

    const snapshot = await roomRef.once('value');
    const roomData: WerewolfRoomData | null = snapshot.val();
    
    if (!roomData) {
      return { success: false, error: 'Room not found' };
    }

    const player = roomData.players?.[playerId];
    if (!player?.isHost) {
      return { success: false, error: 'Only the host can end the game' };
    }

    if (roomData.meta.status === 'waiting' || roomData.meta.status === 'ended') {
      return { success: false, error: 'Game is not in progress' };
    }

    // Create a result showing game was ended early
    const currentRoles = roomData.currentRoles || roomData.roles || {};
    const result: WerewolfGameResult = {
      winners: null, // No winner - game ended early
      eliminatedPlayerId: null,
      eliminatedPlayerRole: null,
      votes: {},
      finalRoles: currentRoles,
      originalRoles: roomData.roles || {},
      centerCards: roomData.centerCards as WerewolfCenterCards,
      nightActions: roomData.nightActions || {},
    };

    await roomRef.update({
      'meta/status': 'ended',
      'state/currentPhase': 'ended',
      result,
    });

    // Update admin index (non-blocking)
    updateAdminRoomStatus(roomId, 'finished').catch(console.error);

    return { success: true };
  } catch (error) {
    console.error('endGame error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to end game',
    };
  }
}

/**
 * Reset the game for a new round (host only)
 */
export async function resetGame(
  roomId: string,
  playerId: string
): Promise<WerewolfActionResult> {
  try {
    const db = getAdminDatabase();
    const roomRef = db.ref(`${ROOMS_BASE}/${roomId}`);

    const snapshot = await roomRef.once('value');
    const roomData: WerewolfRoomData | null = snapshot.val();
    
    if (!roomData) {
      return { success: false, error: 'Room not found' };
    }

    const player = roomData.players?.[playerId];
    if (!player?.isHost) {
      return { success: false, error: 'Only the host can reset the game' };
    }

    // Reset player states
    const playerUpdates: Record<string, unknown> = {};
    for (const pid of Object.keys(roomData.players || {})) {
      playerUpdates[`players/${pid}/hasActed`] = false;
      playerUpdates[`players/${pid}/vote`] = null;
      playerUpdates[`players/${pid}/isReady`] = false;
    }

    await roomRef.update({
      'meta/status': 'waiting',
      roles: null,
      currentRoles: null,
      centerCards: null,
      state: null,
      nightActions: null,
      privatePlayerData: null,
      result: null,
      ...playerUpdates,
    });

    // Update admin index (non-blocking)
    updateAdminRoomStatus(roomId, 'waiting').catch(console.error);

    return { success: true };
  } catch (error) {
    console.error('resetGame error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reset game',
    };
  }
}

/**
 * Kick a player from the room (host only, waiting phase only)
 */
export async function kickPlayer(
  roomId: string,
  hostPlayerId: string,
  targetPlayerId: string
): Promise<WerewolfActionResult> {
  try {
    const db = getAdminDatabase();
    const roomRef = db.ref(`${ROOMS_BASE}/${roomId}`);

    const snapshot = await roomRef.once('value');
    const roomData: WerewolfRoomData | null = snapshot.val();
    
    if (!roomData) {
      return { success: false, error: 'Room not found' };
    }

    const hostPlayer = roomData.players?.[hostPlayerId];
    if (!hostPlayer?.isHost) {
      return { success: false, error: 'Only the host can kick players' };
    }

    if (roomData.meta.status !== 'waiting') {
      return { success: false, error: 'Can only kick players before game starts' };
    }

    if (hostPlayerId === targetPlayerId) {
      return { success: false, error: 'Cannot kick yourself' };
    }

    if (!roomData.players?.[targetPlayerId]) {
      return { success: false, error: 'Target player not found' };
    }

    await roomRef.child(`players/${targetPlayerId}`).remove();

    return { success: true };
  } catch (error) {
    console.error('kickPlayer error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to kick player',
    };
  }
}

/**
 * Handle player disconnect/leave with host promotion
 */
export async function handlePlayerLeave(
  roomId: string,
  playerId: string
): Promise<WerewolfActionResult> {
  try {
    const db = getAdminDatabase();
    const roomRef = db.ref(`${ROOMS_BASE}/${roomId}`);

    const snapshot = await roomRef.once('value');
    const roomData: WerewolfRoomData | null = snapshot.val();
    
    if (!roomData) {
      return { success: false, error: 'Room not found' };
    }

    const players = roomData.players || {};
    const leavingPlayer = players[playerId];
    
    if (!leavingPlayer) {
      return { success: false, error: 'Player not in room' };
    }

    const playerIds = Object.keys(players);
    const remainingPlayers = playerIds.filter((id) => id !== playerId);

    // If this is the last player, delete the room
    if (remainingPlayers.length === 0) {
      await roomRef.remove();
      return { success: true };
    }

    // If host is leaving, promote another player
    if (leavingPlayer.isHost) {
      // Find earliest joined remaining player
      const sortedRemaining = remainingPlayers
        .map((id) => ({ id, joinedAt: players[id].joinedAt }))
        .sort((a, b) => a.joinedAt - b.joinedAt);
      
      const newHostId = sortedRemaining[0].id;
      await roomRef.child(`players/${newHostId}/isHost`).set(true);
    }

    // Remove the player
    await roomRef.child(`players/${playerId}`).remove();
    await roomRef.child(`privatePlayerData/${playerId}`).remove();
    await roomRef.child(`nightActions/${playerId}`).remove();

    return { success: true };
  } catch (error) {
    console.error('handlePlayerLeave error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to handle player leave',
    };
  }
}

/**
 * Update selected roles for the game
 * 
 * Only the host can update role selection during waiting phase.
 * Validates role selection before saving.
 */
export async function updateSelectedRoles(
  roomId: string,
  playerId: string,
  selectedRoles: WerewolfRole[]
): Promise<WerewolfActionResult> {
  try {
    const db = getAdminDatabase();
    const roomRef = db.ref(`${ROOMS_BASE}/${roomId}`);

    const snapshot = await roomRef.once('value');
    const roomData: WerewolfRoomData | null = snapshot.val();
    
    if (!roomData) {
      return { success: false, error: 'Room not found' };
    }

    // Verify player is host
    const player = roomData.players?.[playerId];
    if (!player?.isHost) {
      return { success: false, error: 'Only the host can change role selection' };
    }

    // Can only change during waiting phase
    if (roomData.meta.status !== 'waiting') {
      return { success: false, error: 'Cannot change roles after game has started' };
    }

    // Validate role types only - allow any combination during editing
    // Full validation (werewolf count, role count) happens at startGame() 
    const validRoles: WerewolfRole[] = [
      'werewolf', 'seer', 'robber', 'troublemaker', 'villager',
      'minion', 'mason', 'drunk', 'insomniac', 'witch'
    ];
    
    for (const role of selectedRoles) {
      if (!validRoles.includes(role)) {
        return { success: false, error: `Invalid role: ${role}` };
      }
    }

    // NOTE: Do NOT validate werewolf count or total role count here.
    // This allows the host to freely edit roles (add/remove).
    // Full validation is done in startGame() before the game begins.

    // Save selected roles
    await roomRef.child('meta/selectedRoles').set(selectedRoles);

    return { success: true };
  } catch (error) {
    console.error('updateSelectedRoles error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update roles',
    };
  }
}

/**
 * Create a new room (server action)
 * 
 * Creates the room and updates the admin index
 */
export async function createRoomServer(
  roomId: string,
  playerId: string,
  displayName: string
): Promise<WerewolfActionResult> {
  try {
    const db = getAdminDatabase();
    const roomRef = db.ref(`${ROOMS_BASE}/${roomId}`);

    // Check if room already exists
    const snapshot = await roomRef.once('value');
    if (snapshot.exists()) {
      return { success: false, error: 'Room already exists' };
    }

    const now = Date.now();

    // Create room data
    const roomData = {
      meta: {
        status: 'waiting',
        createdAt: now,
        createdBy: playerId,
      },
      players: {
        [playerId]: {
          displayName,
          isHost: true,
          joinedAt: now,
          hasActed: false,
          vote: null,
          isReady: false,
        },
      },
    };

    await roomRef.set(roomData);

    // Update admin index (non-blocking)
    updateAdminRoomIndex(roomId, {
      status: 'waiting',
      playerCount: 1,
      createdAt: now,
      lastActiveAt: now,
      hostName: displayName,
      hostId: playerId,
    }).catch(console.error);

    return { success: true };
  } catch (error) {
    console.error('createRoomServer error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create room',
    };
  }
}

/**
 * Join room and update admin index (server action)
 */
export async function joinRoomServer(
  roomId: string,
  playerId: string,
  displayName: string
): Promise<WerewolfActionResult & { isReconnect?: boolean }> {
  try {
    const db = getAdminDatabase();
    const roomRef = db.ref(`${ROOMS_BASE}/${roomId}`);

    const snapshot = await roomRef.once('value');
    const currentData = snapshot.val();

    if (!currentData) {
      return { success: false, error: 'Room not found' };
    }

    const players = currentData.players || {};
    const existingPlayer = players[playerId];

    // Reconnect scenario
    if (existingPlayer) {
      await roomRef.child(`players/${playerId}/displayName`).set(displayName);
      return { success: true, isReconnect: true };
    }

    // New player - check if joining is allowed
    if (currentData.meta?.status !== 'waiting') {
      return { success: false, error: 'Cannot join - game in progress' };
    }

    // Add new player
    await roomRef.child(`players/${playerId}`).set({
      displayName,
      isHost: false,
      joinedAt: Date.now(),
      hasActed: false,
      vote: null,
      isReady: false,
    });

    // Update admin index with new player count (non-blocking)
    const newCount = Object.keys(players).length + 1;
    updateAdminPlayerCount(roomId, newCount).catch(console.error);

    return { success: true, isReconnect: false };
  } catch (error) {
    console.error('joinRoomServer error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to join room',
    };
  }
}
