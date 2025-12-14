'use client';

/**
 * useCurrentPlayerRole Hook
 * 
 * Provides the current player's role information with convenient helpers.
 * Used for displaying role-specific UI during night and end phases.
 */

import { useMemo } from 'react';
import type { WerewolfRole, WerewolfRoleConfig } from '@vbz/shared-types';
import { ROLE_CONFIGS, getRoleEmoji, getTeamColorClass, getRoleBackgroundClass } from '../constants/roles';

interface UseCurrentPlayerRoleOptions {
  originalRole: WerewolfRole | null;
  currentRole: WerewolfRole | null;
}

interface UseCurrentPlayerRoleResult {
  // Role info
  originalRole: WerewolfRole | null;
  currentRole: WerewolfRole | null;
  originalRoleConfig: WerewolfRoleConfig | null;
  currentRoleConfig: WerewolfRoleConfig | null;
  
  // Helpers
  roleEmoji: string;
  roleName: string;
  roleDescription: string;
  teamColorClass: string;
  roleBackgroundClass: string;
  hasNightAction: boolean;
  actionDescription: string | null;
  
  // Computed
  wasSwapped: boolean;
  isWerewolf: boolean;
  isVillageTeam: boolean;
}

export function useCurrentPlayerRole({
  originalRole,
  currentRole,
}: UseCurrentPlayerRoleOptions): UseCurrentPlayerRoleResult {
  return useMemo(() => {
    const originalConfig = originalRole ? ROLE_CONFIGS[originalRole] : null;
    const currentConfig = currentRole ? ROLE_CONFIGS[currentRole] : null;
    
    // Use current role for display (after swaps)
    const displayRole = currentRole || originalRole;
    const displayConfig = currentConfig || originalConfig;

    return {
      originalRole,
      currentRole,
      originalRoleConfig: originalConfig,
      currentRoleConfig: currentConfig,
      roleEmoji: displayRole ? getRoleEmoji(displayRole) : '❓',
      roleName: displayConfig?.name || 'Unknown',
      roleDescription: displayConfig?.description || '',
      teamColorClass: displayRole ? getTeamColorClass(displayRole) : 'text-gray-400',
      roleBackgroundClass: displayRole ? getRoleBackgroundClass(displayRole) : 'bg-gray-800/30 border-gray-700',
      hasNightAction: originalConfig?.nightAction ?? false,
      actionDescription: originalConfig?.actionDescription || null,
      wasSwapped: originalRole !== currentRole && currentRole !== null,
      isWerewolf: currentRole === 'werewolf',
      isVillageTeam: currentConfig?.team === 'village',
    };
  }, [originalRole, currentRole]);
}
