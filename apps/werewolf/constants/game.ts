/**
 * Werewolf Game Constants
 * 
 * Configuration values and constants for game mechanics
 */

// Player limits
export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 10;
export const CENTER_CARD_COUNT = 3;

// Timer defaults (in seconds)
export const DEFAULT_DISCUSSION_TIME = 300;  // 5 minutes
export const DEFAULT_VOTING_TIME = 60;       // 1 minute
export const NIGHT_ACTION_TIMEOUT = 30;      // 30 seconds per action

// Game phases
export const PHASES = {
  WAITING: 'waiting',
  NIGHT: 'night',
  DAY: 'day',
  VOTING: 'voting',
  ENDED: 'ended',
} as const;

// Firebase paths
export const ROOMS_BASE = 'games/werewolf/rooms';

// Helper to get room path
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

export function getPrivatePlayerDataPath(roomId: string, playerId: string): string {
  return `${ROOMS_BASE}/${roomId}/privatePlayerData/${playerId}`;
}

export function getRolesPath(roomId: string): string {
  return `${ROOMS_BASE}/${roomId}/roles`;
}

export function getCurrentRolesPath(roomId: string): string {
  return `${ROOMS_BASE}/${roomId}/currentRoles`;
}

export function getCenterCardsPath(roomId: string): string {
  return `${ROOMS_BASE}/${roomId}/centerCards`;
}

export function getNightActionsPath(roomId: string): string {
  return `${ROOMS_BASE}/${roomId}/nightActions`;
}

export function getStatePath(roomId: string): string {
  return `${ROOMS_BASE}/${roomId}/state`;
}

export function getResultPath(roomId: string): string {
  return `${ROOMS_BASE}/${roomId}/result`;
}
