'use client';

/**
 * usePremiumRoles Hook
 * 
 * Manages premium role unlocks for a game room.
 * Unlocks are stored per-room and only valid for one game session.
 */

import { useState, useEffect, useCallback } from 'react';
import { subscribe } from '@vbz/firebase/database';
import type { WerewolfRole } from '@vbz/shared-types';
import { isPremiumRole, getStripeProduct, PREMIUM_ROLES } from '../constants/stripe';

interface UsePremiumRolesOptions {
  roomId: string;
  playerId: string;
}

interface PremiumRoleUnlock {
  unlockedAt: number;
  unlockedBy: string;
  paymentSessionId: string;
  paymentAmount: number;
}

interface UsePremiumRolesResult {
  /** Set of roles that have been unlocked for this room */
  unlockedRoles: Set<WerewolfRole>;
  /** Check if a specific role is a premium role */
  isPremiumRole: (role: WerewolfRole) => boolean;
  /** Check if a premium role has been unlocked for this room */
  isRoleUnlocked: (role: WerewolfRole) => boolean;
  /** Initiate purchase flow for a premium role */
  purchaseRole: (role: WerewolfRole) => Promise<void>;
  /** Whether a purchase is currently in progress */
  isPurchasing: boolean;
  /** Error message if purchase failed */
  error: string | null;
  /** Clear any error message */
  clearError: () => void;
  /** List of all premium roles */
  premiumRoles: WerewolfRole[];
  /** Get unlock info for a role */
  getUnlockInfo: (role: WerewolfRole) => PremiumRoleUnlock | null;
}

export function usePremiumRoles({
  roomId,
  playerId,
}: UsePremiumRolesOptions): UsePremiumRolesResult {
  const [unlockedRoles, setUnlockedRoles] = useState<Set<WerewolfRole>>(new Set());
  const [unlockInfoMap, setUnlockInfoMap] = useState<Map<WerewolfRole, PremiumRoleUnlock>>(new Map());
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Listen to room's unlocked premium roles
  useEffect(() => {
    if (!roomId) return;

    const unsubscribe = subscribe<Record<string, PremiumRoleUnlock>>(
      `games/werewolf/rooms/${roomId}/unlockedPremiumRoles`,
      (unlocks) => {
        if (unlocks) {
          const roles = new Set(Object.keys(unlocks) as WerewolfRole[]);
          setUnlockedRoles(roles);
          
          const infoMap = new Map<WerewolfRole, PremiumRoleUnlock>();
          Object.entries(unlocks).forEach(([role, info]) => {
            infoMap.set(role as WerewolfRole, info);
          });
          setUnlockInfoMap(infoMap);
        } else {
          setUnlockedRoles(new Set());
          setUnlockInfoMap(new Map());
        }
      }
    );

    return () => unsubscribe();
  }, [roomId]);

  // Check if role is unlocked (non-premium roles are always unlocked)
  const isRoleUnlocked = useCallback((role: WerewolfRole): boolean => {
    if (!isPremiumRole(role)) return true;
    return unlockedRoles.has(role);
  }, [unlockedRoles]);

  // Get unlock info for a role
  const getUnlockInfo = useCallback((role: WerewolfRole): PremiumRoleUnlock | null => {
    return unlockInfoMap.get(role) || null;
  }, [unlockInfoMap]);

  // Initiate purchase flow
  const purchaseRole = useCallback(async (role: WerewolfRole) => {
    if (!isPremiumRole(role)) {
      console.warn('Attempted to purchase non-premium role:', role);
      return;
    }

    if (isRoleUnlocked(role)) {
      console.warn('Role already unlocked:', role);
      return;
    }

    const product = getStripeProduct(role);
    if (!product) {
      setError('Product not found for this role');
      return;
    }

    if (!product.priceId) {
      setError('Stripe price not configured for this role');
      return;
    }

    setIsPurchasing(true);
    setError(null);

    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: product.priceId,
          roomId,
          playerId,
          role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      console.error('Purchase error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start checkout');
      setIsPurchasing(false);
    }
  }, [roomId, playerId, isRoleUnlocked]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    unlockedRoles,
    isPremiumRole,
    isRoleUnlocked,
    purchaseRole,
    isPurchasing,
    error,
    clearError,
    premiumRoles: PREMIUM_ROLES,
    getUnlockInfo,
  };
}
