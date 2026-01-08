'use client';

/**
 * usePremiumFeatures Hook
 * 
 * Manages premium feature unlocks for a Spyfall game room.
 * Unlocks are stored per-room and only valid for one game session.
 */

import { useState, useEffect, useCallback } from 'react';
import { subscribe } from '@vbz/firebase/database';
import type { SpyfallPremiumFeature } from '@vbz/shared-types';
import { isPremiumFeature, getStripeProduct, PREMIUM_FEATURES } from '../constants/stripe';

interface UsePremiumFeaturesOptions {
  roomId: string;
  playerId: string;
}

interface PremiumFeatureUnlock {
  unlockedAt: number;
  unlockedBy: string;
  paymentSessionId: string;
  paymentAmount: number;
}

interface UsePremiumFeaturesResult {
  /** Set of features that have been unlocked for this room */
  unlockedFeatures: Set<SpyfallPremiumFeature>;
  /** Check if a specific feature is premium */
  isPremiumFeature: (feature: SpyfallPremiumFeature) => boolean;
  /** Check if a premium feature has been unlocked for this room */
  isFeatureUnlocked: (feature: SpyfallPremiumFeature) => boolean;
  /** Initiate purchase flow for a premium feature */
  purchaseFeature: (feature: SpyfallPremiumFeature) => Promise<void>;
  /** Whether a purchase is currently in progress */
  isPurchasing: boolean;
  /** Error message if purchase failed */
  error: string | null;
  /** Clear any error message */
  clearError: () => void;
  /** List of all premium features */
  premiumFeatures: SpyfallPremiumFeature[];
  /** Get unlock info for a feature */
  getUnlockInfo: (feature: SpyfallPremiumFeature) => PremiumFeatureUnlock | null;
}

export function usePremiumFeatures({
  roomId,
  playerId,
}: UsePremiumFeaturesOptions): UsePremiumFeaturesResult {
  const [unlockedFeatures, setUnlockedFeatures] = useState<Set<SpyfallPremiumFeature>>(new Set());
  const [unlockInfoMap, setUnlockInfoMap] = useState<Map<SpyfallPremiumFeature, PremiumFeatureUnlock>>(new Map());
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track if we've attempted restore for this room
  const [hasAttemptedRestore, setHasAttemptedRestore] = useState(false);

  // Reset purchasing state when component mounts (user returned from Stripe)
  useEffect(() => {
    setIsPurchasing(false);
  }, []);

  // Reset restore attempt when room changes
  useEffect(() => {
    setHasAttemptedRestore(false);
  }, [roomId]);

  // Try to restore any previous unlocks when joining the room
  // Only if the room doesn't already have unlocks loaded
  useEffect(() => {
    if (!roomId || hasAttemptedRestore) return;
    
    // Wait a short time for Firebase subscription to initialize
    // If no unlocks are found, try to restore from payment records
    const timeout = setTimeout(() => {
      if (unlockedFeatures.size === 0) {
        fetch('/api/stripe/restore-unlocks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId }),
        })
          .then(res => res.json())
          .then(data => {
            if (data.restored && data.restoredFeatures?.length > 0) {
              console.log('Restored premium unlocks:', data.restoredFeatures);
            }
          })
          .catch(err => console.error('Failed to restore unlocks:', err));
      }
      setHasAttemptedRestore(true);
    }, 1000); // Wait 1 second for Firebase to load

    return () => clearTimeout(timeout);
  }, [roomId, hasAttemptedRestore, unlockedFeatures.size]);

  // Listen to room's unlocked premium features
  useEffect(() => {
    if (!roomId) return;

    const path = `games/spyfall/rooms/${roomId}/unlockedPremiumFeatures`;
    
    const unsubscribe = subscribe<Record<SpyfallPremiumFeature, PremiumFeatureUnlock> | null>(
      path,
      (data) => {
        if (data) {
          const features = new Set<SpyfallPremiumFeature>(Object.keys(data) as SpyfallPremiumFeature[]);
          const infoMap = new Map<SpyfallPremiumFeature, PremiumFeatureUnlock>();
          
          for (const [feature, info] of Object.entries(data)) {
            infoMap.set(feature as SpyfallPremiumFeature, info);
          }
          
          setUnlockedFeatures(features);
          setUnlockInfoMap(infoMap);
        } else {
          setUnlockedFeatures(new Set());
          setUnlockInfoMap(new Map());
        }
      }
    );

    return () => unsubscribe();
  }, [roomId]);

  const isFeatureUnlocked = useCallback(
    (feature: SpyfallPremiumFeature) => {
      // Non-premium features are always "unlocked"
      if (!isPremiumFeature(feature)) return true;
      return unlockedFeatures.has(feature);
    },
    [unlockedFeatures]
  );

  const getUnlockInfo = useCallback(
    (feature: SpyfallPremiumFeature): PremiumFeatureUnlock | null => {
      return unlockInfoMap.get(feature) || null;
    },
    [unlockInfoMap]
  );

  const purchaseFeature = useCallback(
    async (feature: SpyfallPremiumFeature) => {
      if (!roomId || !playerId) {
        setError('Room or player not found');
        return;
      }

      const product = getStripeProduct(feature);
      if (!product) {
        setError(`Unknown feature: ${feature}`);
        return;
      }

      if (!product.priceId) {
        setError('Stripe price ID not configured');
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
            feature,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to create checkout session');
        }

        // Redirect to Stripe Checkout
        if (data.url) {
          window.location.href = data.url;
        } else {
          throw new Error('No checkout URL returned');
        }
      } catch (err) {
        console.error('Purchase error:', err);
        setError(err instanceof Error ? err.message : 'Failed to start purchase');
        setIsPurchasing(false);
      }
    },
    [roomId, playerId]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    unlockedFeatures,
    isPremiumFeature,
    isFeatureUnlocked,
    purchaseFeature,
    isPurchasing,
    error,
    clearError,
    premiumFeatures: PREMIUM_FEATURES,
    getUnlockInfo,
  };
}
