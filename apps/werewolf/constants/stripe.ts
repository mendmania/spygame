/**
 * Stripe Configuration for Premium Roles
 * 
 * Premium roles require a one-time payment per game session.
 * Once purchased, the role is unlocked for the entire room for that game only.
 */

import type { WerewolfRole } from '@vbz/shared-types';

/**
 * List of premium roles that require payment
 */
export const PREMIUM_ROLES: WerewolfRole[] = ['witch'];

/**
 * Stripe product configuration for premium roles
 */
export const STRIPE_PRODUCTS: Record<string, {
  priceId: string;
  name: string;
  description: string;
  price: number; // in cents
}> = {
  witch: {
    priceId: process.env.NEXT_PUBLIC_STRIPE_WITCH_PRICE_ID || '',
    name: 'Witch Role',
    description: 'Unlock the Witch role for this game',
    price: 99, // $0.99
  },
};

/**
 * Check if a role is premium
 */
export function isPremiumRole(role: WerewolfRole): boolean {
  return PREMIUM_ROLES.includes(role);
}

/**
 * Get Stripe product info for a role
 */
export function getStripeProduct(role: WerewolfRole) {
  return STRIPE_PRODUCTS[role] || null;
}
