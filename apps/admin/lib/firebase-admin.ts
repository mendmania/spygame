/**
 * Firebase Admin SDK initialization and utilities
 * 
 * This module is server-only and provides utilities for Firebase Admin SDK.
 * It does NOT use 'use server' directive - it's imported by server action files.
 * 
 * Core functionality is imported from @vbz/firebase-admin package.
 * Admin-specific utilities (verifyAdminUser) are defined here.
 */

import {
  getAdminAuth,
  getAdminDatabase,
  getAdminDbRef as getDbRef,
  type Database,
} from '@vbz/firebase-admin';

// Re-export core functions for backward compatibility
export { getAdminApp, getAdminAuth, getAdminDatabase } from '@vbz/firebase-admin';

/**
 * Get a database reference for admin operations
 * Async wrapper for backward compatibility with existing code
 */
export async function getAdminDbRef(path: string) {
  return getDbRef(path);
}

/**
 * Verify if a user is an admin by checking the allowlist in RTDB
 */
export async function verifyAdminUser(idToken: string): Promise<{
  isAdmin: boolean;
  uid: string | null;
  email: string | null;
  error?: string;
}> {
  try {
    const auth = getAdminAuth();
    const decodedToken = await auth.verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const email = decodedToken.email || null;

    // Check if user is in adminUsers allowlist
    const db = getAdminDatabase();
    const adminRef = db.ref(`adminUsers/${uid}`);
    const snapshot = await adminRef.once('value');

    if (snapshot.exists() && snapshot.val() === true) {
      return { isAdmin: true, uid, email };
    }

    // Also check custom claims as fallback
    if (decodedToken.admin === true) {
      return { isAdmin: true, uid, email };
    }

    return { isAdmin: false, uid, email, error: 'User is not an admin' };
  } catch (error) {
    console.error('Error verifying admin user:', error);
    return {
      isAdmin: false,
      uid: null,
      email: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
