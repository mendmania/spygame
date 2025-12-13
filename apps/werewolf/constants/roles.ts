/**
 * Werewolf Game Roles Configuration
 * 
 * This file contains all role definitions for One Night Ultimate Werewolf.
 * 
 * EXTENDING WITH NEW ROLES:
 * 1. Add the role to WerewolfRole type in @vbz/shared-types/werewolf.ts
 * 2. Add the role config to ROLE_CONFIGS below
 * 3. Add the role to NIGHT_ACTION_ORDER in the correct position
 * 4. Implement the night action logic in game-actions.ts
 */

import type { WerewolfRole, WerewolfRoleConfig } from '@vbz/shared-types';

/**
 * Role configurations with display information and mechanics
 */
export const ROLE_CONFIGS: Record<WerewolfRole, WerewolfRoleConfig> = {
  werewolf: {
    id: 'werewolf',
    name: 'Werewolf',
    team: 'werewolf',
    description: 'You are a Werewolf! Try to avoid detection while the village votes.',
    nightAction: true,
    actionDescription: 'See other Werewolves. If alone, you may look at one center card.',
  },
  minion: {
    id: 'minion',
    name: 'Minion',
    team: 'werewolf',
    description: 'You are the Minion! Help the werewolves win without being one yourself.',
    nightAction: true,
    actionDescription: 'See who the Werewolves are. They do not know you.',
  },
  mason: {
    id: 'mason',
    name: 'Mason',
    team: 'village',
    description: 'You are a Mason! You know the other Mason (if any) is on your side.',
    nightAction: true,
    actionDescription: 'See the other Mason. If alone, you know there is no other Mason.',
  },
  seer: {
    id: 'seer',
    name: 'Seer',
    team: 'village',
    description: 'You are the Seer! Use your vision to help the village.',
    nightAction: true,
    actionDescription: "Look at another player's card OR two center cards.",
  },
  robber: {
    id: 'robber',
    name: 'Robber',
    team: 'village',
    description: "You are the Robber! You may steal another player's role.",
    nightAction: true,
    actionDescription: "Swap your card with another player's and look at your new card.",
  },
  troublemaker: {
    id: 'troublemaker',
    name: 'Troublemaker',
    team: 'village',
    description: 'You are the Troublemaker! Cause chaos among the players.',
    nightAction: true,
    actionDescription: "Swap two other players' cards (you don't get to look).",
  },
  drunk: {
    id: 'drunk',
    name: 'Drunk',
    team: 'village',
    description: 'You are the Drunk! You accidentally swapped your card with the center.',
    nightAction: true,
    actionDescription: 'Swap your card with a center card. You do NOT see your new role.',
  },
  insomniac: {
    id: 'insomniac',
    name: 'Insomniac',
    team: 'village',
    description: 'You are the Insomniac! You get to see your final card before day.',
    nightAction: true,
    actionDescription: 'Look at your own card at the end of night to see if it changed.',
  },
  villager: {
    id: 'villager',
    name: 'Villager',
    team: 'village',
    description: 'You are a Villager! Find and eliminate the Werewolves.',
    nightAction: false,
  },
};

/**
 * Night action order - roles act in this specific order
 * This is CRITICAL for correct game mechanics
 * 
 * Official One Night Ultimate Werewolf order:
 * 1. Doppelganger (future)
 * 2. Werewolves
 * 3. Minion
 * 4. Masons
 * 5. Seer
 * 6. Robber
 * 7. Troublemaker
 * 8. Drunk
 * 9. Insomniac
 */
export const NIGHT_ACTION_ORDER: WerewolfRole[] = [
  'werewolf',
  'minion',
  'mason',
  'seer',
  'robber',
  'troublemaker',
  'drunk',
  'insomniac',
];

/**
 * Default role sets for different player counts
 * Formula: roles = players + 3 (for center cards)
 * 
 * Advanced roles are included for more interesting gameplay:
 * - Minion helps werewolves, creating confusion
 * - Masons provide village trust anchors  
 * - Drunk creates uncertainty
 * - Insomniac gets crucial late info
 */
export const DEFAULT_ROLE_SETS: Record<number, WerewolfRole[]> = {
  // 3 players = 6 roles (basic)
  3: ['werewolf', 'seer', 'robber', 'villager', 'villager', 'villager'],
  // 4 players = 7 roles
  4: ['werewolf', 'seer', 'robber', 'troublemaker', 'drunk', 'villager', 'villager'],
  // 5 players = 8 roles
  5: ['werewolf', 'werewolf', 'seer', 'robber', 'troublemaker', 'insomniac', 'villager', 'villager'],
  // 6 players = 9 roles (add minion for complexity)
  6: ['werewolf', 'werewolf', 'minion', 'seer', 'robber', 'troublemaker', 'drunk', 'insomniac', 'villager'],
  // 7 players = 10 roles (add masons)
  7: ['werewolf', 'werewolf', 'minion', 'mason', 'mason', 'seer', 'robber', 'troublemaker', 'drunk', 'insomniac'],
  // 8 players = 11 roles
  8: ['werewolf', 'werewolf', 'minion', 'mason', 'mason', 'seer', 'robber', 'troublemaker', 'drunk', 'insomniac', 'villager'],
  // 9 players = 12 roles
  9: ['werewolf', 'werewolf', 'minion', 'mason', 'mason', 'seer', 'robber', 'troublemaker', 'drunk', 'insomniac', 'villager', 'villager'],
  // 10 players = 13 roles
  10: ['werewolf', 'werewolf', 'minion', 'mason', 'mason', 'seer', 'robber', 'troublemaker', 'drunk', 'insomniac', 'villager', 'villager', 'villager'],
};

/**
 * Get role emoji for UI
 */
export function getRoleEmoji(role: WerewolfRole): string {
  switch (role) {
    case 'werewolf':
      return '🐺';
    case 'minion':
      return '👹';
    case 'mason':
      return '🔨';
    case 'seer':
      return '🔮';
    case 'robber':
      return '🦹';
    case 'troublemaker':
      return '🃏';
    case 'drunk':
      return '🍺';
    case 'insomniac':
      return '😴';
    case 'villager':
      return '👤';
    default:
      return '❓';
  }
}

/**
 * Get team color class for UI
 */
export function getTeamColorClass(role: WerewolfRole): string {
  const config = ROLE_CONFIGS[role];
  switch (config.team) {
    case 'werewolf':
      return 'text-red-500';
    case 'village':
      return 'text-blue-400';
    case 'neutral':
      return 'text-yellow-400';
    default:
      return 'text-gray-400';
  }
}

/**
 * Get role background color for cards
 */
export function getRoleBackgroundClass(role: WerewolfRole): string {
  const config = ROLE_CONFIGS[role];
  switch (config.team) {
    case 'werewolf':
      return 'bg-red-900/30 border-red-700';
    case 'village':
      return 'bg-blue-900/30 border-blue-700';
    case 'neutral':
      return 'bg-yellow-900/30 border-yellow-700';
    default:
      return 'bg-gray-800/30 border-gray-700';
  }
}
