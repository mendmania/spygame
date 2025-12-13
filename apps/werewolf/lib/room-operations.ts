/**
 * Werewolf Room Operations
 * 
 * Firebase RTDB operations for room lifecycle management.
 * Handles room creation, joining, leaving, and player sync.
 * NO game mechanics (role assignment, night actions, voting).
 * 
 * RECONNECT & MULTI-TAB SAFETY:
 * - Existing players can rejoin at any game state
 * - New players blocked after game starts
 * - Display name updates don't overwrite critical state
 */

import {
  writeData,
  readData,
  updateData,
  removeData,
  exists,
} from '@vbz/firebase/database';
import type {
  WerewolfRoomData,
  WerewolfRoomMeta,
  WerewolfPlayer,
  WerewolfGameSettings,
  CreateWerewolfRoomParams,
  JoinWerewolfRoomParams,
  UpdateWerewolfDisplayNameParams,
} from '@vbz/shared-types';
import {
  ROOMS_BASE,
  getRoomPath,
  getRoomMetaPath,
  getPlayersPath,
  getPlayerPath,
  DEFAULT_DISCUSSION_TIME,
  DEFAULT_VOTING_TIME,
} from '../constants';

/**
 * Check if a room exists
 */
export async function roomExists(roomId: string): Promise<boolean> {
  return exists(getRoomMetaPath(roomId));
}

/**
 * Create a new room
 * The creating player becomes the host
 */
export async function createRoom({
  roomId,
  playerId,
  displayName,
}: CreateWerewolfRoomParams): Promise<void> {
  const now = Date.now();

  const defaultSettings: WerewolfGameSettings = {
    discussionTime: DEFAULT_DISCUSSION_TIME,
    votingTime: DEFAULT_VOTING_TIME,
    roles: [], // Will be populated based on player count when game starts
  };

  const meta: WerewolfRoomMeta = {
    status: 'waiting',
    createdAt: now,
    createdBy: playerId,
    settings: defaultSettings,
  };

  const player: WerewolfPlayer = {
    displayName,
    isHost: true,
    joinedAt: now,
    hasActed: false,
    vote: null,
    isReady: false,
  };

  const roomData: WerewolfRoomData = {
    meta,
    players: {
      [playerId]: player,
    },
  };

  await writeData(getRoomPath(roomId), roomData);
}

/**
 * Join an existing room (client-side version)
 * 
 * Handles three scenarios:
 * 1. RECONNECT: Player already exists in room (refresh/re-entry)
 *    - Updates display name ONLY, preserves all other state
 *    - Works during ANY game status
 * 2. NEW JOIN during 'waiting': Player added to lobby
 * 3. NEW JOIN during active game: Returns { joined: false, reason: 'in_progress' }
 * 
 * MULTI-TAB SAFETY:
 * - Uses atomic update for display name only
 * - Never overwrites isHost, hasActed, vote, or joinedAt
 * 
 * Returns: { joined: boolean, isReconnect?: boolean, reason?: string }
 */
export interface JoinRoomResult {
  joined: boolean;
  isReconnect?: boolean;
  reason?: 'room_not_found' | 'in_progress' | 'full';
}

export async function joinRoom({
  roomId,
  playerId,
  displayName,
}: JoinWerewolfRoomParams): Promise<JoinRoomResult> {
  // Check if room exists
  const roomExistsResult = await roomExists(roomId);
  if (!roomExistsResult) {
    return { joined: false, reason: 'room_not_found' };
  }

  // Check if player already exists (reconnect scenario)
  const existingPlayer = await readData<WerewolfPlayer>(getPlayerPath(roomId, playerId));
  if (existingPlayer) {
    // RECONNECT: Player refreshed or re-entered
    // ONLY update display name - preserve all other state to avoid race conditions
    await updateData(getPlayerPath(roomId, playerId), { displayName });
    return { joined: true, isReconnect: true };
  }
  
  // NEW PLAYER: Check if joining is allowed
  const meta = await readData<WerewolfRoomMeta>(getRoomMetaPath(roomId));
  
  // Block new players if game is in progress
  if (!meta) {
    return { joined: false, reason: 'room_not_found' };
  }
  
  if (meta.status !== 'waiting' && meta.status !== 'ended') {
    return { joined: false, reason: 'in_progress' };
  }

  // Add new player to room
  const player: WerewolfPlayer = {
    displayName,
    isHost: false,
    joinedAt: Date.now(),
    hasActed: false,
    vote: null,
    isReady: false,
  };

  await writeData(getPlayerPath(roomId, playerId), player);
  return { joined: true, isReconnect: false };
}

/**
 * Leave a room (client-side version)
 * 
 * NOTE: For host promotion and race condition protection,
 * use handlePlayerLeave server action instead.
 */
export async function leaveRoom(
  roomId: string,
  playerId: string
): Promise<void> {
  // Get room data first to check if player is host
  const roomData = await readData<WerewolfRoomData>(getRoomPath(roomId));
  if (!roomData) return;

  const players = roomData.players || {};
  const leavingPlayer = players[playerId];
  if (!leavingPlayer) return;

  // If host is leaving, promote another player
  if (leavingPlayer.isHost) {
    const otherPlayerIds = Object.keys(players).filter((id) => id !== playerId);
    
    if (otherPlayerIds.length > 0) {
      // Promote the earliest joined player
      const sortedPlayers = otherPlayerIds
        .map((id) => ({ id, joinedAt: players[id].joinedAt }))
        .sort((a, b) => a.joinedAt - b.joinedAt);
      
      const newHostId = sortedPlayers[0].id;
      await updateData(getPlayerPath(roomId, newHostId), { isHost: true });
    }
  }

  // Remove the player
  await removeData(getPlayerPath(roomId, playerId));

  // If no players left, clean up room
  const remainingPlayers = Object.keys(players).filter((id) => id !== playerId);
  if (remainingPlayers.length === 0) {
    await removeData(getRoomPath(roomId));
  }
}

/**
 * Update a player's display name
 */
export async function updatePlayerDisplayName({
  roomId,
  playerId,
  displayName,
}: UpdateWerewolfDisplayNameParams): Promise<void> {
  await updateData(getPlayerPath(roomId, playerId), { displayName });
}

/**
 * Toggle player ready status (waiting phase)
 */
export async function togglePlayerReady(
  roomId: string,
  playerId: string,
  isReady: boolean
): Promise<void> {
  await updateData(getPlayerPath(roomId, playerId), { isReady });
}

/**
 * Get room data
 */
export async function getRoomData(roomId: string): Promise<WerewolfRoomData | null> {
  return readData<WerewolfRoomData>(getRoomPath(roomId));
}

/**
 * Get room metadata
 */
export async function getRoomMeta(roomId: string): Promise<WerewolfRoomMeta | null> {
  return readData<WerewolfRoomMeta>(getRoomMetaPath(roomId));
}

// Re-export path helpers for external use
export {
  getRoomPath,
  getRoomMetaPath,
  getPlayersPath,
  getPlayerPath,
  getPrivatePlayerDataPath,
} from '../constants';
