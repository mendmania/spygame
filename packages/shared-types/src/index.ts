// User types
export interface User {
  uid: string;
  displayName: string;
  createdAt: number;
}

// Base room types
export interface BaseRoom {
  id: string;
  createdAt: number;
  createdBy: string;
  status: RoomStatus;
}

export type RoomStatus = 'waiting' | 'playing' | 'finished';

// Base player types
export interface BasePlayer {
  odurplayerId: string;
  displayName: string;
  isHost: boolean;
  joinedAt: number;
}

// Game identifiers
export type GameType = 'spyfall' | 'codenames' | 'werewolf';

export interface GameInfo {
  id: GameType;
  name: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  subdomain: string;
}

// Re-export Spyfall types
export * from './spyfall';

// Re-export Werewolf types
export * from './werewolf';
