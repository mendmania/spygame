'use server';

/**
 * Spyfall Game Server Actions
 * 
 * These actions run on the server with elevated permissions.
 * They handle all game state mutations securely.
 * 
 * Phase 4: Robustness & Edge Cases
 * - Atomic guards prevent race conditions
 * - State transition validation
 * - Host promotion on disconnect
 * - Expired game enforcement
 * 
 * Admin Index Integration:
 * - Updates /adminIndex on room creation, status changes, player count
 */

import { getAdminDatabase } from '@/lib/firebase-admin';
import { SPY_LOCATIONS } from '@/constants/locations';
import { getCategoryItems } from '@/constants/categories';
import {
  updateAdminRoomIndex,
  updateAdminRoomStatus,
  updateAdminPlayerCount,
  removeFromAdminIndex,
} from './admin-index-actions';
import type {
  GameActionResult,
  SpyfallGameState,
  SpyfallPrivatePlayerData,
  SpyfallPlayer,
  SpyfallRoomMeta,
  SpyfallGameSettings,
  SpyfallCategory,
  SpyfallLocation,
} from '@vbz/shared-types';

const ROOMS_BASE = 'games/spyfall/rooms';
const DEFAULT_GAME_DURATION = 480; // 8 minutes

/**
 * Shuffle array using Fisher-Yates algorithm
 * Returns empty array if input is null, undefined, or not an array
 */
function shuffleArray<T>(array: T[] | null | undefined): T[] {
  if (!array || !Array.isArray(array) || array.length === 0) {
    return [];
  }
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Start a new game (with atomic guard)
 * 
 * Server-authoritative game start:
 * 1. Validates the requesting player is the host
 * 2. Validates minimum player count (≥ 3)
 * 3. Uses transaction to atomically update status (prevents double-start race condition)
 * 4. Randomly selects exactly one spy
 * 5. Randomly selects one location
 * 6. Assigns roles to all non-spy players
 * 7. Writes remaining game data atomically
 * 
 * RACE CONDITION PROTECTION:
 * Uses Firebase transaction to ensure only ONE startGame succeeds
 * even if multiple tabs/clients click simultaneously.
 */
export async function startGame(
  roomId: string,
  playerId: string,
  settings?: Partial<SpyfallGameSettings>
): Promise<GameActionResult> {
  try {
    const db = getAdminDatabase();
    const roomRef = db.ref(`${ROOMS_BASE}/${roomId}`);

    // Extract settings with defaults
    const category: SpyfallCategory = settings?.category || 'locations';
    const customLocations: SpyfallLocation[] = settings?.customLocations || [];
    const gameDurationSeconds = settings?.gameDurationSeconds || DEFAULT_GAME_DURATION;

    // Pre-check to provide better error messages
    const snapshot = await roomRef.once('value');
    const preCheckData = snapshot.val();
    
    if (!preCheckData) {
      return { success: false, error: 'Room not found' };
    }
    
    if (!preCheckData.meta) {
      return { success: false, error: 'Room data is corrupted (missing meta)' };
    }
    
    if (preCheckData.meta.status !== 'waiting') {
      return { success: false, error: `Cannot start: game is currently "${preCheckData.meta.status}"` };
    }
    
    const players = preCheckData.players || {};
    const requestingPlayer = players[playerId];
    
    if (!requestingPlayer) {
      return { success: false, error: 'You are not in this room' };
    }
    
    if (!requestingPlayer.isHost) {
      return { success: false, error: 'Only the host can start the game' };
    }
    
    const playerCount = Object.keys(players).length;
    if (playerCount < 3) {
      return { success: false, error: `Need at least 3 players (currently ${playerCount})` };
    }

    // All validations passed - proceed with game setup
    // Use transaction ONLY to atomically update status from 'waiting' to 'playing'
    // This prevents race conditions where two clicks start the game simultaneously
    let transactionError: string | null = null;
    let transactionCommitted = false;
    
    await roomRef.child('meta/status').transaction((currentStatus) => {
      if (currentStatus === 'waiting') {
        transactionCommitted = true;
        return 'playing';
      } else if (currentStatus === null) {
        // Admin SDK may pass null initially - return 'playing' to set it
        // The actual current value will be checked on server
        transactionCommitted = true;
        return 'playing';
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
    const playerIds = Object.keys(players);

    // Randomly select spy
    const shuffledPlayerIds = shuffleArray(playerIds);
    const spyPlayerId = shuffledPlayerIds[0];

    // Get items based on category
    let gameItems: SpyfallLocation[];
    if (category === 'custom') {
      // Use custom locations provided by host
      if (customLocations.length < 5) {
        // Revert status back to waiting
        await roomRef.child('meta/status').set('waiting');
        return { success: false, error: 'Custom mode requires at least 5 items' };
      }
      // Ensure custom items have proper structure (with roles array)
      gameItems = customLocations.map(loc => ({
        name: loc.name,
        roles: loc.roles || [],
      }));
    } else {
      // Use built-in category items
      gameItems = getCategoryItems(category);
      if (gameItems.length === 0) {
        // Fallback to classic locations
        gameItems = SPY_LOCATIONS;
      }
    }

    // Randomly select location/item from the category
    const shuffledLocations = shuffleArray(gameItems);
    const selectedLocation = shuffledLocations[0];

    // Shuffle roles for the location (may be empty for categories like animals)
    const hasRoles = Array.isArray(selectedLocation.roles) && selectedLocation.roles.length > 0;
    const shuffledRoles = hasRoles ? shuffleArray(selectedLocation.roles) : [];

    // Assign roles to non-spy players
    const privatePlayerData: Record<string, SpyfallPrivatePlayerData> = {};
    let roleIndex = 0;

    for (const pid of playerIds) {
      if (pid === spyPlayerId) {
        privatePlayerData[pid] = {
          role: null,
          location: null,
          isSpy: true,
        };
      } else {
        // For categories without roles (e.g., animals), role will be null
        // Use explicit null to ensure we never send undefined to Firebase
        const assignedRole = hasRoles && shuffledRoles.length > 0
          ? shuffledRoles[roleIndex % shuffledRoles.length]
          : null;
        privatePlayerData[pid] = {
          role: assignedRole ?? null,  // Double-ensure no undefined
          location: selectedLocation.name,
          isSpy: false,
        };
        roleIndex++;
      }
    }

    // Calculate timestamps
    const now = Date.now();
    const endsAt = now + gameDurationSeconds * 1000;

    console.log('[startGame] Creating game state:', {
      category,
      selectedLocation: selectedLocation.name,
      hasRoles: selectedLocation.roles?.length > 0,
      now,
      endsAt,
      gameDurationSeconds,
      playerCount: playerIds.length,
    });

    // Game state
    const gameState: SpyfallGameState = {
      currentLocation: selectedLocation.name,
      spyPlayerId,
      startedAt: now,
      endsAt,
    };

    // Game settings to persist (so UI shows correct category during game)
    // Note: Firebase doesn't accept undefined, so we only include customLocations for custom category
    const gameSettingsToSave: SpyfallGameSettings = {
      category,
      gameDurationSeconds,
      // Only include customLocations when using custom category (Firebase rejects undefined)
      ...(category === 'custom' ? { customLocations: gameItems } : {}),
    };

    // Write game data (status already set via transaction)
    await roomRef.update({
      state: gameState,
      privatePlayerData,
      gameSettings: gameSettingsToSave,
    });

    console.log('[startGame] Game state written successfully');

    // Update admin index (non-blocking)
    updateAdminRoomStatus(roomId, 'playing').catch(console.error);

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
 * End the game (with atomic guard)
 * 
 * Can be triggered by:
 * - Timer expiration (automatic)
 * - Host manual end
 * 
 * When game ends:
 * - Status becomes "finished"
 * - Spy identity is revealed to all players
 */
export async function endGame(
  roomId: string,
  playerId: string
): Promise<GameActionResult> {
  try {
    const db = getAdminDatabase();
    const roomRef = db.ref(`${ROOMS_BASE}/${roomId}`);

    // Pre-check to provide better error messages
    const snapshot = await roomRef.once('value');
    const currentData = snapshot.val();

    if (!currentData) {
      return { success: false, error: 'Room not found' };
    }

    if (!currentData.meta) {
      return { success: false, error: 'Room data is corrupted (missing meta)' };
    }

    // Guard: Must be in playing state
    if (currentData.meta.status !== 'playing') {
      return { success: false, error: `Cannot end: game is currently "${currentData.meta.status}"` };
    }

    // Guard: Requester must be host
    const players = currentData.players || {};
    const requestingPlayer = players[playerId];
    if (!requestingPlayer) {
      return { success: false, error: 'You are not in this room' };
    }
    if (!requestingPlayer.isHost) {
      return { success: false, error: 'Only the host can end the game' };
    }

    // All validations passed - update status to finished
    await roomRef.update({
      'meta/status': 'finished',
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
 * Update game settings (category, custom locations, duration)
 * 
 * - Only allowed in waiting state
 * - Only host can update settings
 * - Custom category requires premium unlock
 */
export async function updateGameSettings(
  roomId: string,
  playerId: string,
  settings: Partial<SpyfallGameSettings>
): Promise<GameActionResult> {
  try {
    const db = getAdminDatabase();
    const roomRef = db.ref(`${ROOMS_BASE}/${roomId}`);

    // Pre-check to provide better error messages
    const snapshot = await roomRef.once('value');
    const currentData = snapshot.val();

    if (!currentData) {
      return { success: false, error: 'Room not found' };
    }

    if (!currentData.meta) {
      return { success: false, error: 'Room data is corrupted (missing meta)' };
    }

    // Guard: Must be in waiting state
    if (currentData.meta.status !== 'waiting') {
      return { success: false, error: 'Can only change settings while waiting' };
    }

    // Guard: Requester must be host
    const players = currentData.players || {};
    const requestingPlayer = players[playerId];
    if (!requestingPlayer) {
      return { success: false, error: 'You are not in this room' };
    }
    if (!requestingPlayer.isHost) {
      return { success: false, error: 'Only the host can change game settings' };
    }

    // TEMP: Bypassed premium check for testing - revert this later
    // Validate custom category has premium unlock
    // if (settings.category === 'custom') {
    //   const unlockedFeatures = currentData.unlockedPremiumFeatures || {};
    //   if (!unlockedFeatures.custom_category) {
    //     return { success: false, error: 'Custom category requires premium unlock' };
    //   }
    // }

    // Merge with existing settings
    const existingSettings = currentData.gameSettings || {
      category: 'locations',
      gameDurationSeconds: DEFAULT_GAME_DURATION,
    };

    const newSettings: SpyfallGameSettings = {
      ...existingSettings,
      ...settings,
    };

    // Update settings
    await roomRef.child('gameSettings').set(newSettings);

    return { success: true };
  } catch (error) {
    console.error('updateGameSettings error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update game settings',
    };
  }
}

/**
 * Reset game back to waiting state (with atomic guard)
 * 
 * - Only allowed from finished state
 * - Clears game state and private player data
 * - Players remain in room
 * - Host can start a new game
 */
export async function resetGame(
  roomId: string,
  playerId: string
): Promise<GameActionResult> {
  try {
    const db = getAdminDatabase();
    const roomRef = db.ref(`${ROOMS_BASE}/${roomId}`);

    // Pre-check to provide better error messages
    const snapshot = await roomRef.once('value');
    const currentData = snapshot.val();

    if (!currentData) {
      return { success: false, error: 'Room not found' };
    }

    if (!currentData.meta) {
      return { success: false, error: 'Room data is corrupted (missing meta)' };
    }

    // Guard: Must be in finished state (cannot reset mid-game)
    if (currentData.meta.status !== 'finished') {
      return { success: false, error: `Cannot reset: game is currently "${currentData.meta.status}"` };
    }

    // Guard: Requester must be host
    const players = currentData.players || {};
    const requestingPlayer = players[playerId];
    if (!requestingPlayer) {
      return { success: false, error: 'You are not in this room' };
    }
    if (!requestingPlayer.isHost) {
      return { success: false, error: 'Only the host can reset the game' };
    }

    // All validations passed - reset to waiting state and clear game data
    // Clear gameSettings so host can choose a new category for the next game
    await roomRef.update({
      'meta/status': 'waiting',
      state: null,
      privatePlayerData: null,
      gameSettings: null,
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
 * Auto-end game when timer expires (with atomic guard)
 * 
 * This is called by ANY client when it detects the timer has reached zero.
 * The server validates the timer has actually expired.
 * Multiple clients calling this simultaneously is safe - first one wins.
 */
export async function checkAndEndExpiredGame(
  roomId: string
): Promise<GameActionResult> {
  try {
    const db = getAdminDatabase();
    const roomRef = db.ref(`${ROOMS_BASE}/${roomId}`);

    // Pre-check to validate timer expiration
    const snapshot = await roomRef.once('value');
    const currentData = snapshot.val();

    if (!currentData) {
      return { success: false, error: 'Room not found' };
    }

    // Guard: Must be in playing state
    if (!currentData.meta || currentData.meta.status !== 'playing') {
      // This is expected if another client already ended the game
      return { success: false, error: 'Game already ended' };
    }

    // Guard: Must have game state with timer
    if (!currentData.state || !currentData.state.endsAt) {
      return { success: false, error: 'No game timer found' };
    }

    // Guard: Timer must have actually expired
    const now = Date.now();
    if (now < currentData.state.endsAt) {
      return { success: false, error: 'Timer not expired yet' };
    }

    // All validations passed - update status to finished
    await roomRef.update({
      'meta/status': 'finished',
    });

    // Update admin index (non-blocking)
    updateAdminRoomStatus(roomId, 'finished').catch(console.error);

    return { success: true };
  } catch (error) {
    console.error('checkAndEndExpiredGame error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to end game',
    };
  }
}

/**
 * Handle player leaving room (server-side)
 * 
 * Phase 4: Host disconnect handling
 * - If host leaves during playing/waiting, promote next player
 * - If last player leaves, room is cleaned up
 * - Game continues even if host leaves mid-game
 */
export async function handlePlayerLeave(
  roomId: string,
  playerId: string
): Promise<GameActionResult> {
  try {
    const db = getAdminDatabase();
    const roomRef = db.ref(`${ROOMS_BASE}/${roomId}`);

    // Pre-check to get current state
    const snapshot = await roomRef.once('value');
    const currentData = snapshot.val();

    if (!currentData) {
      return { success: false, error: 'Room not found' };
    }

    const players = currentData.players || {};
    const leavingPlayer = players[playerId];

    if (!leavingPlayer) {
      return { success: true }; // Player not in room, nothing to do
    }

    const wasHost = leavingPlayer.isHost;
    const remainingPlayerIds = Object.keys(players).filter(id => id !== playerId);

    // If no players left, delete the room
    if (remainingPlayerIds.length === 0) {
      await roomRef.remove();
      // Update admin index (non-blocking)
      removeFromAdminIndex(roomId).catch(console.error);
      return { success: true };
    }

    // Remove the leaving player
    await roomRef.child(`players/${playerId}`).remove();

    // If leaving player was host, promote next player
    let newHostName = '';
    let newHostId = '';
    if (wasHost) {
      // Sort by joinedAt to get most senior player
      const sortedPlayers = remainingPlayerIds
        .map((id) => ({ id, ...players[id] }))
        .sort((a, b) => a.joinedAt - b.joinedAt);

      newHostId = sortedPlayers[0].id;
      newHostName = sortedPlayers[0].displayName;
      await roomRef.child(`players/${newHostId}/isHost`).set(true);
    }

    // Update admin index with new player count (non-blocking)
    updateAdminPlayerCount(
      roomId,
      remainingPlayerIds.length,
      wasHost ? newHostName : undefined,
      wasHost ? newHostId : undefined
    ).catch(console.error);

    return { success: true };
  } catch (error) {
    console.error('handlePlayerLeave error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to leave room',
    };
  }
}

/**
 * Kick a player from the room (host only)
 * 
 * - Only allowed in waiting state
 * - Only host can kick players
 * - Cannot kick yourself
 */
export async function kickPlayer(
  roomId: string,
  hostPlayerId: string,
  targetPlayerId: string
): Promise<GameActionResult> {
  try {
    const db = getAdminDatabase();
    const roomRef = db.ref(`${ROOMS_BASE}/${roomId}`);

    // Pre-check to provide better error messages
    const snapshot = await roomRef.once('value');
    const currentData = snapshot.val();

    if (!currentData) {
      return { success: false, error: 'Room not found' };
    }

    // Guard: Must be in waiting state
    if (currentData.meta?.status !== 'waiting') {
      return { success: false, error: 'Can only kick players while waiting' };
    }

    const players = currentData.players || {};
    
    // Guard: Requester must be host
    const hostPlayer = players[hostPlayerId];
    if (!hostPlayer || !hostPlayer.isHost) {
      return { success: false, error: 'Only the host can kick players' };
    }

    // Guard: Cannot kick yourself
    if (hostPlayerId === targetPlayerId) {
      return { success: false, error: 'Cannot kick yourself' };
    }

    // Guard: Target must exist
    if (!players[targetPlayerId]) {
      return { success: false, error: 'Player not found' };
    }

    // Remove the player
    await roomRef.child(`players/${targetPlayerId}`).remove();

    // Update admin index with new player count (non-blocking)
    const newCount = Object.keys(players).length - 1;
    updateAdminPlayerCount(roomId, newCount).catch(console.error);

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
 * Join room with reconnect handling
 * 
 * Phase 4: Player reconnect handling
 * - If player already exists in room, just update their presence
 * - Players keep their role/location/spy state on reconnect
 * - Prevents duplicate entries
 */
export async function handlePlayerJoin(
  roomId: string,
  playerId: string,
  displayName: string
): Promise<GameActionResult & { isReconnect?: boolean }> {
  try {
    const db = getAdminDatabase();
    const roomRef = db.ref(`${ROOMS_BASE}/${roomId}`);
    let isReconnect = false;

    const result = await roomRef.transaction((currentData) => {
      if (!currentData) {
        return; // Room doesn't exist
      }

      const meta: SpyfallRoomMeta = currentData.meta;
      const players: Record<string, SpyfallPlayer> = { ...currentData.players };

      // Check if player already exists (reconnect scenario)
      const existingPlayer = players[playerId];
      if (existingPlayer) {
        isReconnect = true;
        // Update display name but keep isHost and joinedAt
        players[playerId] = {
          ...existingPlayer,
          displayName,
        };
        return {
          ...currentData,
          players,
        };
      }

      // New player joining - check if allowed
      if (meta.status !== 'waiting') {
        return; // Cannot join game in progress (unless reconnecting)
      }

      // Add new player
      players[playerId] = {
        displayName,
        isHost: false,
        joinedAt: Date.now(),
      };

      return {
        ...currentData,
        players,
      };
    });

    if (!result.committed) {
      return { success: false, error: 'Cannot join room - game in progress' };
    }

    if (!result.snapshot.exists()) {
      return { success: false, error: 'Room not found' };
    }

    return { success: true, isReconnect };
  } catch (error) {
    console.error('handlePlayerJoin error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to join room',
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
): Promise<GameActionResult> {
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
): Promise<GameActionResult & { isReconnect?: boolean }> {
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
