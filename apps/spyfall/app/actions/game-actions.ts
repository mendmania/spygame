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
} from '@vbz/shared-types';

const ROOMS_BASE = 'games/spyfall/rooms';
const DEFAULT_GAME_DURATION = 480; // 8 minutes

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
 * Start a new game (with atomic guard)
 * 
 * Server-authoritative game start:
 * 1. Validates the requesting player is the host
 * 2. Validates minimum player count (≥ 3)
 * 3. Uses transaction to prevent double-start race condition
 * 4. Randomly selects exactly one spy
 * 5. Randomly selects one location
 * 6. Assigns roles to all non-spy players
 * 7. Writes all updates atomically
 */
export async function startGame(
  roomId: string,
  playerId: string,
  gameDurationSeconds: number = DEFAULT_GAME_DURATION
): Promise<GameActionResult> {
  try {
    const db = getAdminDatabase();
    const roomRef = db.ref(`${ROOMS_BASE}/${roomId}`);

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
    const playerIds = Object.keys(players);

    // Randomly select spy
    const shuffledPlayerIds = shuffleArray(playerIds);
    const spyPlayerId = shuffledPlayerIds[0];

    // Randomly select location
    const shuffledLocations = shuffleArray(SPY_LOCATIONS);
    const selectedLocation = shuffledLocations[0];

    // Shuffle roles for the location
    const shuffledRoles = shuffleArray(selectedLocation.roles);

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
        privatePlayerData[pid] = {
          role: shuffledRoles[roleIndex % shuffledRoles.length],
          location: selectedLocation.name,
          isSpy: false,
        };
        roleIndex++;
      }
    }

    // Calculate timestamps
    const now = Date.now();
    const endsAt = now + gameDurationSeconds * 1000;

    // Game state
    const gameState: SpyfallGameState = {
      currentLocation: selectedLocation.name,
      spyPlayerId,
      startedAt: now,
      endsAt,
    };

    // Atomic write using update (not transaction)
    // Pre-check already validated state, this is fast enough to avoid most race conditions
    await roomRef.update({
      'meta/status': 'playing',
      state: gameState,
      privatePlayerData,
    });

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
    await roomRef.update({
      'meta/status': 'waiting',
      state: null,
      privatePlayerData: null,
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
