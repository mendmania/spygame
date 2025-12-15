/**
 * One Night Ultimate Werewolf Types
 *
 * Firebase RTDB Schema:
 * games/werewolf/rooms/{roomId}
 *   meta:
 *     status: "waiting" | "night" | "day" | "voting" | "ended"
 *     createdAt: number (timestamp)
 *     createdBy: string (playerId)
 *     phase: number (current phase index for night actions)
 *     settings:
 *       discussionTime: number (seconds for day discussion)
 *       votingTime: number (seconds for voting)
 *   players:
 *     {playerId}:
 *       displayName: string
 *       isHost: boolean
 *       joinedAt: number
 *       hasActed: boolean (whether player has done their night action)
 *       vote: string | null (playerId they voted for)
 *   centerCards:
 *     card1: WerewolfRole
 *     card2: WerewolfRole
 *     card3: WerewolfRole
 *   roles:
 *     {playerId}: WerewolfRole (original role assignment)
 *   currentRoles:
 *     {playerId}: WerewolfRole (after night actions - may be swapped)
 *   nightActions:
 *     {playerId}:
 *       action: NightActionType
 *       target?: string | string[]
 *       result?: any
 *   state:
 *     startedAt: number
 *     endsAt: number
 *     dayEndsAt: number | null
 *     votingEndsAt: number | null
 *     currentPhase: WerewolfPhase
 *     nightActionOrder: WerewolfRole[] (roles that need to act this night)
 *     currentNightActionIndex: number
 *   result:
 *     winners: "village" | "werewolf" | "tanner" | null
 *     eliminatedPlayerId: string | null
 *     eliminatedPlayerRole: WerewolfRole | null
 *     finalRoles: Record<string, WerewolfRole>
 *     centerCards: WerewolfRole[]
 */

import { RoomStatus } from './index';

/**
 * Available roles in One Night Ultimate Werewolf
 * 
 * Base roles:
 * - Werewolf: Wakes up and sees other werewolves. If alone, may look at center card.
 * - Seer: May look at another player's card OR two center cards.
 * - Robber: May swap their card with another player's and look at their new card.
 * - Troublemaker: May swap two other players' cards (without looking).
 * - Villager: No special ability. Just tries to find werewolves.
 * 
 * Advanced Pack 1:
 * - Minion: Knows who the werewolves are but isn't one. Wins with werewolves.
 * - Mason: Wakes up and sees other Masons (if any).
 * - Drunk: Must swap their card with a center card (without looking).
 * - Insomniac: Wakes up last and looks at their own final card.
 */
export type WerewolfRole =
  | 'werewolf'
  | 'seer'
  | 'robber'
  | 'troublemaker'
  | 'villager'
  // Advanced Pack 1
  | 'minion'
  | 'mason'
  | 'drunk'
  | 'insomniac'
  // Advanced Pack 2
  | 'witch';

/**
 * Night action order (roles act in this specific order)
 * This order is critical for game mechanics
 * 
 * Official One Night Ultimate Werewolf order:
 * 1. Doppelganger (future)
 * 2. Werewolves
 * 3. Minion
 * 4. Masons
 * 5. Seer
 * 6. Robber
 * 7. Troublemaker
 * 8. Witch
 * 9. Drunk
 * 10. Insomniac
 */
export const NIGHT_ACTION_ORDER: WerewolfRole[] = [
  // 'doppelganger', // Future
  'werewolf',
  'minion',
  'mason',
  'seer',
  'robber',
  'troublemaker',
  'witch',
  'drunk',
  'insomniac',
];

/**
 * Role configurations with metadata
 * 
 * EXTENSIBILITY PROPERTIES:
 * - nightOrderIndex: Position in night action sequence (lower = earlier)
 * - hasNightAction: Whether role wakes up at night
 * - discoveryOnly: Night action only reveals info, doesn't modify game state
 * - affectsFinalRoles: Whether night action can change roles (swaps)
 * - canTargetSelf: Whether role can target themselves
 * - canTargetCenter: Whether role can interact with center cards
 */
export interface WerewolfRoleConfig {
  id: WerewolfRole;
  name: string;
  team: 'village' | 'werewolf' | 'neutral';
  description: string;
  nightAction: boolean;
  actionDescription?: string;
  // Extensibility properties for future roles
  nightOrderIndex?: number;      // Position in night order (10=werewolf, 20=minion, etc)
  discoveryOnly?: boolean;       // True if action only reveals info (werewolf, minion, mason)
  affectsFinalRoles?: boolean;   // True if action can change player roles
  canTargetSelf?: boolean;       // True if role can target self (e.g., witch swap)
  canTargetCenter?: boolean;     // True if role can interact with center cards
}

export const WEREWOLF_ROLES: Record<WerewolfRole, WerewolfRoleConfig> = {
  werewolf: {
    id: 'werewolf',
    name: 'Werewolf',
    team: 'werewolf',
    description: 'You are a Werewolf! Try to avoid detection while the village votes.',
    nightAction: true,
    actionDescription: 'See other Werewolves. If alone, you may look at one center card.',
    nightOrderIndex: 10,
    discoveryOnly: false,  // Can peek at center if alone
    affectsFinalRoles: false,
    canTargetCenter: true,
  },
  minion: {
    id: 'minion',
    name: 'Minion',
    team: 'werewolf',
    description: 'You are the Minion! Help the werewolves win without being one yourself.',
    nightAction: true,
    actionDescription: 'See who the Werewolves are. They do not know you.',
    nightOrderIndex: 20,
    discoveryOnly: true,
    affectsFinalRoles: false,
  },
  mason: {
    id: 'mason',
    name: 'Mason',
    team: 'village',
    description: 'You are a Mason! You know the other Mason (if any) is on your side.',
    nightAction: true,
    actionDescription: 'See the other Mason. If alone, you know there is no other Mason.',
    nightOrderIndex: 30,
    discoveryOnly: true,
    affectsFinalRoles: false,
  },
  seer: {
    id: 'seer',
    name: 'Seer',
    team: 'village',
    description: 'You are the Seer! Use your vision to help the village.',
    nightAction: true,
    actionDescription: 'Look at another player\'s card OR two center cards.',
    nightOrderIndex: 40,
    discoveryOnly: true,
    affectsFinalRoles: false,
    canTargetCenter: true,
  },
  robber: {
    id: 'robber',
    name: 'Robber',
    team: 'village',
    description: 'You are the Robber! You may steal another player\'s role.',
    nightAction: true,
    actionDescription: 'Swap your card with another player\'s and look at your new card.',
    nightOrderIndex: 50,
    discoveryOnly: false,
    affectsFinalRoles: true,
    canTargetSelf: false,
  },
  troublemaker: {
    id: 'troublemaker',
    name: 'Troublemaker',
    team: 'village',
    description: 'You are the Troublemaker! Cause chaos among the players.',
    nightAction: true,
    actionDescription: 'Swap two other players\' cards (you don\'t get to look).',
    nightOrderIndex: 60,
    discoveryOnly: false,
    affectsFinalRoles: true,
    canTargetSelf: false,
  },
  witch: {
    id: 'witch',
    name: 'Witch',
    team: 'village',
    description: 'You are the Witch! You can peek at and redistribute a center card.',
    nightAction: true,
    actionDescription: 'Look at one center card. Then you may swap it with any player\'s card.',
    nightOrderIndex: 70,
    discoveryOnly: false,
    affectsFinalRoles: true,
    canTargetSelf: true,
    canTargetCenter: true,
  },
  drunk: {
    id: 'drunk',
    name: 'Drunk',
    team: 'village',
    description: 'You are the Drunk! You accidentally swapped your card with the center.',
    nightAction: true,
    actionDescription: 'Swap your card with a center card. You do NOT see your new role.',
    nightOrderIndex: 80,
    discoveryOnly: false,
    affectsFinalRoles: true,
    canTargetCenter: true,
  },
  insomniac: {
    id: 'insomniac',
    name: 'Insomniac',
    team: 'village',
    description: 'You are the Insomniac! You get to see your final card before day.',
    nightAction: true,
    actionDescription: 'Look at your own card at the end of night to see if it changed.',
    nightOrderIndex: 90,
    discoveryOnly: true,
    affectsFinalRoles: false,
    canTargetSelf: true,
  },
  villager: {
    id: 'villager',
    name: 'Villager',
    team: 'village',
    description: 'You are a Villager! Find and eliminate the Werewolves.',
    nightAction: false,
    nightOrderIndex: 999,  // No night action
    discoveryOnly: false,
    affectsFinalRoles: false,
  },
};

/**
 * Game phases
 */
export type WerewolfPhase = 'waiting' | 'night' | 'day' | 'voting' | 'ended';

/**
 * Extended room status for Werewolf (includes night/voting phases)
 */
export type WerewolfRoomStatus = WerewolfPhase;

/**
 * Game settings
 */
export interface WerewolfGameSettings {
  discussionTime: number;  // Seconds for day discussion (default: 300 = 5 min)
  votingTime: number;      // Seconds for voting (default: 60 = 1 min)
  roles: WerewolfRole[];   // Selected roles for the game
}

export const DEFAULT_WEREWOLF_SETTINGS: WerewolfGameSettings = {
  discussionTime: 300, // 5 minutes
  votingTime: 60,      // 1 minute
  roles: [
    'werewolf',
    'werewolf',
    'seer',
    'robber',
    'troublemaker',
    'villager',
  ],
};

/**
 * Room metadata
 */
export interface WerewolfRoomMeta {
  status: WerewolfRoomStatus;
  createdAt: number;
  createdBy: string;
  settings: WerewolfGameSettings;
  selectedRoles?: WerewolfRole[];  // Host-selected roles for the game (locked when game starts)
  activeNightRole?: WerewolfRole | null;  // Currently acting role during night phase (null when night is complete)
}

/**
 * Player data (public, visible to all)
 */
export interface WerewolfPlayer {
  displayName: string;
  isHost: boolean;
  joinedAt: number;
  hasActed: boolean;   // Has completed night action
  vote: string | null; // PlayerId they voted for (during voting phase)
  isReady: boolean;    // Ready to start (waiting phase)
}

/**
 * Center cards (3 cards in the middle)
 */
export interface WerewolfCenterCards {
  card1: WerewolfRole;
  card2: WerewolfRole;
  card3: WerewolfRole;
}

/**
 * Night action types
 */
export type NightActionType =
  | 'werewolf_discover'    // Werewolf wakes to see other werewolves (non-committing)
  | 'werewolf_peek'        // Lone werewolf peeks at center
  | 'seer_player'          // Seer looks at player's card
  | 'seer_center'          // Seer looks at 2 center cards
  | 'robber_swap'          // Robber swaps with player
  | 'troublemaker_swap'    // Troublemaker swaps 2 players
  | 'minion_see'           // Minion sees werewolves
  | 'mason_see'            // Mason sees other mason
  | 'witch_peek'           // Witch looks at one center card (non-committing)
  | 'witch_swap'           // Witch swaps center card with a player (or self)
  | 'witch_skip'           // Witch peeked but chose not to swap (commits the peek)
  | 'drunk_swap'           // Drunk swaps with center card
  | 'insomniac_check'      // Insomniac checks own card
  | 'none';                // No action taken (villager, etc)

/**
 * Night action data
 */
export interface WerewolfNightAction {
  playerId: string;
  role: WerewolfRole;
  action: NightActionType;
  target?: string | string[] | null;  // PlayerId(s) or center card indices (null for actions without targets)
  result?: WerewolfNightActionResult;
  performedAt: number;
}

/**
 * Night action result (what the player sees)
 */
export interface WerewolfNightActionResult {
  // For werewolves: other werewolf player IDs
  otherWerewolves?: string[];
  // For werewolf: indicates if they are the only werewolf
  isLoneWolf?: boolean;
  // For lone werewolf peek: the center card role
  centerCardSeen?: WerewolfRole;
  // For seer looking at player: the role seen
  playerRoleSeen?: { playerId: string; role: WerewolfRole };
  // For seer looking at center: the roles seen
  centerCardsSeen?: { index: number; role: WerewolfRole }[];
  // For robber: the new role they got
  newRole?: WerewolfRole;
  // For robber: who they robbed
  robbedPlayerId?: string;
  // For troublemaker: confirmation of swap
  swappedPlayers?: [string, string];
  // For minion: werewolf player IDs (empty if no werewolves)
  werewolvesSeen?: string[];
  // For mason: other mason player ID (null if lone mason)
  otherMason?: string | null;
  // For witch: the center card they peeked at
  witchPeekedCard?: { index: number; role: WerewolfRole };
  // For witch: the swap they performed (if any)
  witchSwappedWith?: string; // playerId they swapped the center card with
  // For drunk: which center card index was swapped (0, 1, or 2)
  centerCardSwapped?: number;
  // For insomniac: their final role after all swaps
  finalRole?: WerewolfRole;
  // For werewolf_discover: indicates this was just discovery, action not committed
  isDiscoveryOnly?: boolean;
  // For any role that skipped their action (e.g., troublemaker, seer choosing not to act)
  skipped?: boolean;
}

/**
 * Game state (during active game)
 */
export interface WerewolfGameState {
  startedAt: number;
  endsAt: number;
  dayEndsAt: number | null;
  votingEndsAt: number | null;
  currentPhase: WerewolfPhase;
  nightActionOrder: WerewolfRole[];        // Roles that need to act this night (filtered by active players)
  currentNightActionIndex: number;         // Index into nightActionOrder for current role
  playersActedThisRole?: Record<string, boolean>;  // Track who has acted for the current role
}

/**
 * Game result (after game ends)
 */
export interface WerewolfGameResult {
  winners: 'village' | 'werewolf' | 'nobody' | null;
  eliminatedPlayerId: string | null;
  eliminatedPlayerRole: WerewolfRole | null;
  votes: Record<string, string>; // playerId -> votedForPlayerId
  finalRoles: Record<string, WerewolfRole>;
  originalRoles: Record<string, WerewolfRole>;
  centerCards: WerewolfCenterCards;
}

/**
 * Players map keyed by playerId
 */
export type WerewolfPlayersMap = Record<string, WerewolfPlayer>;

/**
 * Roles map keyed by playerId
 */
export type WerewolfRolesMap = Record<string, WerewolfRole>;

/**
 * Night actions map keyed by playerId
 */
export type WerewolfNightActionsMap = Record<string, WerewolfNightAction>;

/**
 * Full room structure as stored in Firebase
 */
export interface WerewolfRoomData {
  meta: WerewolfRoomMeta;
  players: WerewolfPlayersMap;
  centerCards?: WerewolfCenterCards;
  roles?: WerewolfRolesMap;           // Original role assignments
  currentRoles?: WerewolfRolesMap;    // Current roles (after night swaps)
  nightActions?: WerewolfNightActionsMap;
  state?: WerewolfGameState;
  result?: WerewolfGameResult;
}

/**
 * Private player data (visible only to the owning player)
 * This is what gets sent to each player about their own role/info
 */
export interface WerewolfPrivatePlayerData {
  originalRole: WerewolfRole;
  currentRole: WerewolfRole;          // May change after robber swap
  nightActionResult?: WerewolfNightActionResult;
}

/**
 * Room state for UI consumption (transformed from raw Firebase data)
 */
export interface WerewolfRoomState {
  roomId: string;
  meta: WerewolfRoomMeta;
  state: WerewolfGameState | null;
  players: Array<WerewolfPlayer & { id: string }>;
  currentPlayer: (WerewolfPlayer & { id: string }) | null;
  currentPlayerData: WerewolfPrivatePlayerData | null;
  isHost: boolean;
  playerCount: number;
  isWaiting: boolean;
  isNight: boolean;
  isDay: boolean;
  isVoting: boolean;
  isEnded: boolean;
  result: WerewolfGameResult | null;
  // Night phase specific
  isMyTurnToAct: boolean;
  myOriginalRole: WerewolfRole | null;
  myCurrentRole: WerewolfRole | null;
  nightActionResult: WerewolfNightActionResult | null;
  activeNightRole: WerewolfRole | null;  // Currently acting role during night
}

/**
 * Action parameters for server actions
 */
export interface CreateWerewolfRoomParams {
  roomId: string;
  playerId: string;
  displayName: string;
}

export interface JoinWerewolfRoomParams {
  roomId: string;
  playerId: string;
  displayName: string;
}

export interface UpdateWerewolfDisplayNameParams {
  roomId: string;
  playerId: string;
  displayName: string;
}

/**
 * Server action result type
 */
export interface WerewolfActionResult {
  success: boolean;
  error?: string;
  data?: unknown;
}

/**
 * Night action request (from client to server)
 */
export interface PerformNightActionRequest {
  roomId: string;
  playerId: string;
  action: NightActionType;
  target?: string | string[];
}

/**
 * Vote request (from client to server)
 */
export interface CastVoteRequest {
  roomId: string;
  playerId: string;
  targetPlayerId: string;
}

/**
 * Min/Max players for valid game
 */
export const WEREWOLF_MIN_PLAYERS = 3;
export const WEREWOLF_MAX_PLAYERS = 10;

/**
 * Number of center cards
 */
export const WEREWOLF_CENTER_CARD_COUNT = 3;

/**
 * Calculate required roles for player count
 * Total roles = players + 3 center cards
 */
export function getRequiredRoleCount(playerCount: number): number {
  return playerCount + WEREWOLF_CENTER_CARD_COUNT;
}

/**
 * Validate role selection for player count
 */
export function validateRoleSelection(
  playerCount: number,
  selectedRoles: WerewolfRole[]
): { valid: boolean; error?: string } {
  const requiredCount = getRequiredRoleCount(playerCount);
  
  if (selectedRoles.length !== requiredCount) {
    return {
      valid: false,
      error: `Need exactly ${requiredCount} roles for ${playerCount} players (${playerCount} + 3 center cards). Currently have ${selectedRoles.length}.`,
    };
  }

  // Ensure at least one werewolf
  const werewolfCount = selectedRoles.filter((r) => r === 'werewolf').length;
  if (werewolfCount === 0) {
    return {
      valid: false,
      error: 'Must have at least one Werewolf in the game.',
    };
  }

  return { valid: true };
}
