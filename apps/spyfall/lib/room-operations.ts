/**
 * Spyfall Room Operations
 * 
 * Firebase RTDB operations for room lifecycle management.
 * Phase 2: Room creation, joining, leaving, and player sync.
 * Phase 4: Reconnect handling, host promotion on disconnect.
 * NO game mechanics (spy assignment, roles, locations).
 */

import {
  writeData,
  readData,
  updateData,
  removeData,
  exists,
} from '@vbz/firebase/database';
import type {
  SpyfallRoomData,
  SpyfallRoomMeta,
  SpyfallPlayer,
  CreateRoomParams,
  JoinRoomParams,
  UpdateDisplayNameParams,
} from '@vbz/shared-types';

// Path helpers
const ROOMS_BASE = 'games/spyfall/rooms';

export function getRoomPath(roomId: string): string {
  return `${ROOMS_BASE}/${roomId}`;
}

export function getRoomMetaPath(roomId: string): string {
  return `${ROOMS_BASE}/${roomId}/meta`;
}

export function getPlayersPath(roomId: string): string {
  return `${ROOMS_BASE}/${roomId}/players`;
}

export function getPlayerPath(roomId: string, playerId: string): string {
  return `${ROOMS_BASE}/${roomId}/players/${playerId}`;
}

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
}: CreateRoomParams): Promise<void> {
  const now = Date.now();

  const meta: SpyfallRoomMeta = {
    status: 'waiting',
    createdAt: now,
    createdBy: playerId,
  };

  const player: SpyfallPlayer = {
    displayName,
    isHost: true,
    joinedAt: now,
  };

  const roomData: SpyfallRoomData = {
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
 * Handles two scenarios:
 * 1. RECONNECT: Player already exists in room (refresh/re-entry)
 *    - Updates display name, keeps role/spy status
 *    - Works during ANY game status (waiting, playing, finished)
 * 2. NEW JOIN: Player not in room yet
 *    - Only allowed during 'waiting' status
 *    - Blocked during 'playing' or 'finished' (returns false)
 * 
 * Returns: true if joined/reconnected, false if blocked
 */
export async function joinRoom({
  roomId,
  playerId,
  displayName,
}: JoinRoomParams): Promise<boolean> {
  // Check if room exists
  const roomExistsResult = await roomExists(roomId);
  if (!roomExistsResult) {
    return false;
  }

  // Check if player already exists (reconnect scenario)
  const existingPlayer = await readData<SpyfallPlayer>(getPlayerPath(roomId, playerId));
  if (existingPlayer) {
    // RECONNECT: Player refreshed or re-entered
    // Just update display name, keep isHost and joinedAt intact
    // This works regardless of game status (waiting, playing, finished)
    await updateData(getPlayerPath(roomId, playerId), { displayName });
    return true;
  }
  
  // NEW PLAYER: Check if joining is allowed
  const meta = await readData<SpyfallRoomMeta>(getRoomMetaPath(roomId));
  
  // Block new players if game is in progress or finished
  if (!meta || meta.status !== 'waiting') {
    return false;
  }

  // Add new player to room (waiting state only)
  const player: SpyfallPlayer = {
    displayName,
    isHost: false,
    joinedAt: Date.now(),
  };

  await writeData(getPlayerPath(roomId, playerId), player);
  return true;
}

/**
 * Leave a room (client-side version)
 * 
 * NOTE: For host promotion and race condition protection,
 * use handlePlayerLeave server action instead.
 * This is kept for simple cases and backward compatibility.
 * 
 * If the leaving player is the host, promote another player
 */
export async function leaveRoom(
  roomId: string,
  playerId: string
): Promise<void> {
  // Get current player data to check if host
  const player = await readData<SpyfallPlayer>(getPlayerPath(roomId, playerId));
  if (!player) return;

  // Remove the player
  await removeData(getPlayerPath(roomId, playerId));

  // If player was host, promote another player
  if (player.isHost) {
    const playersData = await readData<Record<string, SpyfallPlayer>>(
      getPlayersPath(roomId)
    );

    if (playersData) {
      const remainingPlayerIds = Object.keys(playersData);
      
      if (remainingPlayerIds.length > 0) {
        // Sort by joinedAt and promote the most senior player
        const sortedPlayers = remainingPlayerIds
          .map((id) => ({ id, player: playersData[id] }))
          .sort((a, b) => a.player.joinedAt - b.player.joinedAt);
        
        const newHostId = sortedPlayers[0].id;
        await updateData(getPlayerPath(roomId, newHostId), { isHost: true });
      } else {
        // No players left, delete the room
        await removeData(getRoomPath(roomId));
      }
    }
  }
}

/**
 * Update player's display name in a room
 */
export async function updatePlayerDisplayName({
  roomId,
  playerId,
  displayName,
}: UpdateDisplayNameParams): Promise<void> {
  await updateData(getPlayerPath(roomId, playerId), { displayName });
}

/**
 * Get room data (one-time read, not subscription)
 */
export async function getRoomData(
  roomId: string
): Promise<SpyfallRoomData | null> {
  return readData<SpyfallRoomData>(getRoomPath(roomId));
}

/**
 * Get path to private player data (role, location, isSpy)
 */
export function getPrivatePlayerDataPath(roomId: string, playerId: string): string {
  return `${ROOMS_BASE}/${roomId}/privatePlayerData/${playerId}`;
}
