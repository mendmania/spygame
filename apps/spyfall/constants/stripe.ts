/**
 * Stripe Configuration for Spyfall Premium Features
 * 
 * Premium features require a one-time payment per game session.
 * Once purchased, the feature is unlocked for the entire room for that game only.
 */

import type { SpyfallPremiumFeature } from '@vbz/shared-types';

/**
 * List of premium features that require payment
 */
export const PREMIUM_FEATURES: SpyfallPremiumFeature[] = ['custom_category'];

/**
 * Stripe product configuration for premium features
 */
export const STRIPE_PRODUCTS: Record<SpyfallPremiumFeature, {
  priceId: string;
  name: string;
  description: string;
  price: number; // in cents
}> = {
  custom_category: {
    priceId: process.env.NEXT_PUBLIC_STRIPE_SPYFALL_CUSTOM_PRICE_ID || '',
    name: 'Custom Game Mode',
    description: 'Create your own category with custom items and roles for this game',
    price: 99, // $0.99
  },
};

/**
 * Check if a feature is premium
 */
export function isPremiumFeature(feature: SpyfallPremiumFeature): boolean {
  return PREMIUM_FEATURES.includes(feature);
}

/**
 * Get Stripe product info for a feature
 */
export function getStripeProduct(feature: SpyfallPremiumFeature) {
  return STRIPE_PRODUCTS[feature] || null;
}
