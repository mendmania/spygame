/**
 * Werewolf Game Roles Configuration
 * 
 * This file contains all role definitions for One Night Ultimate Werewolf.
 * 
 * EXTENDING WITH NEW ROLES:
 * 1. Add the role to WerewolfRole type in @vbz/shared-types/werewolf.ts
 * 2. Add the role config to WEREWOLF_ROLES in @vbz/shared-types/werewolf.ts
 *    (include nightOrderIndex, discoveryOnly, affectsFinalRoles, etc)
 * 3. Add role handler in executeNightAction() in game-actions.ts
 * 4. Add UI component in NightActionPanel.tsx
 * 
 * The night order is DERIVED from nightOrderIndex - no need to maintain
 * a separate NIGHT_ACTION_ORDER array.
 */

import type { WerewolfRole, WerewolfRoleConfig } from '@vbz/shared-types';
import { WEREWOLF_ROLES } from '@vbz/shared-types';

// Re-export from shared-types for convenience
export const ROLE_CONFIGS: Record<WerewolfRole, WerewolfRoleConfig> = WEREWOLF_ROLES;

/**
 * Night action order - DERIVED from nightOrderIndex in role configs
 * Roles with nightAction: true are sorted by nightOrderIndex
 * 
 * This replaces the manual NIGHT_ACTION_ORDER array.
 */
export const NIGHT_ACTION_ORDER: WerewolfRole[] = (Object.values(WEREWOLF_ROLES) as WerewolfRoleConfig[])
  .filter(config => config.nightAction)
  .sort((a, b) => (a.nightOrderIndex ?? 999) - (b.nightOrderIndex ?? 999))
  .map(config => config.id);

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
      return '��';
    case 'robber':
      return '🦹';
    case 'troublemaker':
      return '🃏';
    case 'witch':
      return '🧙';
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
      return 'bg-gray-900/30 border-gray-700';
  }
}

/**
 * Get role image path
 * 
 * Images should be placed in /public/roles/{roleName}.png
 * The function automatically maps role IDs to image paths.
 * 
 * To add a new role image:
 * 1. Add the image file to /public/roles/{role}.png
 *    (e.g., werewolf.png, seer.png, villager.png)
 * 2. That's it! No code changes needed.
 * 
 * Fallback behavior:
 * - If image doesn't exist, Next.js will show broken image
 * - Consider adding a default placeholder image at /public/roles/default.png
 */
export function getRoleImagePath(role: WerewolfRole): string {
  return `/roles/${role}.png`;
}
