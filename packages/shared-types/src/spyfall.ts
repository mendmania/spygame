import { RoomStatus } from './index';

/**
 * Spyfall Room Types
 * 
 * Firebase RTDB Schema:
 * games/spyfall/rooms/{roomId}
 *   meta:
 *     status: "waiting" | "playing" | "finished"
 *     createdAt: number (timestamp)
 *     createdBy: string (playerId)
 *   state: (only exists when status != "waiting")
 *     currentLocation: string
 *     spyPlayerId: string (only revealed when finished)
 *     startedAt: number
 *     endsAt: number
 *   players:
 *     {playerId}:
 *       displayName: string
 *       isHost: boolean
 *       joinedAt: number
 *   privatePlayerData:
 *     {playerId}:
 *       role: string | null (null for spy)
 *       location: string | null (null for spy)
 *       isSpy: boolean
 */

// Room metadata
export interface SpyfallRoomMeta {
  status: RoomStatus;
  createdAt: number;
  createdBy: string;
}

// Game state (exists only when playing or finished)
export interface SpyfallGameState {
  currentLocation: string;
  spyPlayerId: string;
  startedAt: number;
  endsAt: number;
}

// Public player data (visible to all)
export interface SpyfallPlayer {
  displayName: string;
  isHost: boolean;
  joinedAt: number;
}

// Private player data (visible only to owning player)
export interface SpyfallPrivatePlayerData {
  role: string | null; // null for spy
  location: string | null; // null for spy
  isSpy: boolean;
}

// Players map keyed by playerId
export type SpyfallPlayersMap = Record<string, SpyfallPlayer>;
export type SpyfallPrivatePlayerDataMap = Record<string, SpyfallPrivatePlayerData>;

// Full room structure as stored in Firebase
export interface SpyfallRoomData {
  meta: SpyfallRoomMeta;
  state?: SpyfallGameState;
  players: SpyfallPlayersMap;
  privatePlayerData?: SpyfallPrivatePlayerDataMap;
}

// Room state for UI consumption
export interface SpyfallRoomState {
  roomId: string;
  meta: SpyfallRoomMeta;
  state: SpyfallGameState | null;
  players: Array<SpyfallPlayer & { id: string }>;
  currentPlayer: (SpyfallPlayer & { id: string }) | null;
  currentPlayerGameData: SpyfallPrivatePlayerData | null;
  isHost: boolean;
  playerCount: number;
  isPlaying: boolean;
  isFinished: boolean;
  revealedSpyId: string | null;
}

// Actions for room mutations
export interface CreateRoomParams {
  roomId: string;
  playerId: string;
  displayName: string;
}

export interface JoinRoomParams {
  roomId: string;
  playerId: string;
  displayName: string;
}

export interface UpdateDisplayNameParams {
  roomId: string;
  playerId: string;
  displayName: string;
}

// Server action params
export interface StartGameParams {
  roomId: string;
  playerId: string;
  gameDurationSeconds?: number;
}

export interface EndGameParams {
  roomId: string;
  playerId: string;
}

export interface ResetGameParams {
  roomId: string;
  playerId: string;
}

// Server action responses
export interface GameActionResult {
  success: boolean;
  error?: string;
}

// Location with roles for game setup
export interface SpyfallLocation {
  name: string;
  roles: string[];
}
