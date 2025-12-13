'use client';

/**
 * useNightPhase Hook
 * 
 * Provides night phase specific state and actions.
 * Handles the night action UI logic for each role.
 */

import { useMemo, useCallback, useState } from 'react';
import type {
  WerewolfRole,
  WerewolfRoomState,
  WerewolfNightActionResult,
  NightActionType,
  WerewolfActionResult,
} from '@vbz/shared-types';
import { ROLE_CONFIGS, NIGHT_ACTION_ORDER } from '../constants/roles';

interface UseNightPhaseOptions {
  roomState: WerewolfRoomState | null;
  performNightAction: (action: NightActionType, target?: string | string[]) => Promise<WerewolfActionResult>;
  skipNightAction: () => Promise<WerewolfActionResult>;
}

interface UseNightPhaseResult {
  // State
  isNightPhase: boolean;
  isMyTurn: boolean;
  hasActed: boolean;
  myRole: WerewolfRole | null;
  
  // Action info
  actionDescription: string | null;
  availableActions: NightActionType[];
  
  // Result of night action (what player learned)
  nightResult: WerewolfNightActionResult | null;
  
  // Other players (for targeting)
  otherPlayers: Array<{ id: string; displayName: string }>;
  
  // Actions
  performAction: (action: NightActionType, target?: string | string[]) => Promise<WerewolfActionResult>;
  skip: () => Promise<WerewolfActionResult>;
  
  // Action state
  isPerforming: boolean;
  actionError: string | null;
}

export function useNightPhase({
  roomState,
  performNightAction,
  skipNightAction,
}: UseNightPhaseOptions): UseNightPhaseResult {
  const [isPerforming, setIsPerforming] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const isNightPhase = roomState?.isNight ?? false;
  const myRole = roomState?.myOriginalRole ?? null;
  const hasActed = roomState?.currentPlayer?.hasActed ?? false;
  const isMyTurn = roomState?.isMyTurnToAct ?? false;

  const roleConfig = myRole ? ROLE_CONFIGS[myRole] : null;
  
  // Determine available actions based on role
  const availableActions = useMemo((): NightActionType[] => {
    if (!myRole || !roleConfig?.nightAction) {
      return ['none'];
    }

    switch (myRole) {
      case 'werewolf':
        return ['werewolf_discover', 'werewolf_peek', 'none'];
      case 'seer':
        return ['seer_player', 'seer_center'];
      case 'robber':
        return ['robber_swap', 'none'];
      case 'troublemaker':
        return ['troublemaker_swap', 'none'];
      // Advanced Pack 1 roles
      case 'minion':
        return ['minion_see'];
      case 'mason':
        return ['mason_see'];
      case 'drunk':
        return ['drunk_swap'];
      case 'insomniac':
        return ['insomniac_check'];
      case 'villager':
      default:
        return ['none'];
    }
  }, [myRole, roleConfig]);

  // Other players for targeting
  const otherPlayers = useMemo(() => {
    if (!roomState?.players || !roomState.currentPlayer) {
      return [];
    }
    return roomState.players
      .filter((p) => p.id !== roomState.currentPlayer?.id)
      .map((p) => ({ id: p.id, displayName: p.displayName }));
  }, [roomState?.players, roomState?.currentPlayer]);

  // Perform action with loading state
  const performAction = useCallback(async (
    action: NightActionType,
    target?: string | string[]
  ): Promise<WerewolfActionResult> => {
    setIsPerforming(true);
    setActionError(null);
    
    try {
      const result = await performNightAction(action, target);
      if (!result.success && result.error) {
        setActionError(result.error);
      }
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Action failed';
      setActionError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsPerforming(false);
    }
  }, [performNightAction]);

  // Skip action
  const skip = useCallback(async (): Promise<WerewolfActionResult> => {
    setIsPerforming(true);
    setActionError(null);
    
    try {
      const result = await skipNightAction();
      if (!result.success && result.error) {
        setActionError(result.error);
      }
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Skip failed';
      setActionError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsPerforming(false);
    }
  }, [skipNightAction]);

  return {
    isNightPhase,
    isMyTurn,
    hasActed,
    myRole,
    actionDescription: roleConfig?.actionDescription || null,
    availableActions,
    nightResult: roomState?.nightActionResult ?? null,
    otherPlayers,
    performAction,
    skip,
    isPerforming,
    actionError,
  };
}
