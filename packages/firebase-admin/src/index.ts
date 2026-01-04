/**
 * Firebase Admin SDK Configuration
 * 
 * Centralized Admin SDK initialization for server-side operations.
 * Used by Server Actions and API routes that require elevated permissions.
 * 
 * IMPORTANT: This module is SERVER-ONLY. Never import on the client.
 * 
 * Environment Variables Required:
 * - FIREBASE_SERVICE_ACCOUNT_KEY: JSON string of service account credentials
 * - NEXT_PUBLIC_FIREBASE_DATABASE_URL: Firebase Realtime Database URL
 * - NEXT_PUBLIC_FIREBASE_PROJECT_ID: Firebase project ID
 */

import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getDatabase, type Database } from 'firebase-admin/database';

// Re-export types for convenience
export type { App } from 'firebase-admin/app';
export type { Auth } from 'firebase-admin/auth';
export type { Database, Reference, DataSnapshot } from 'firebase-admin/database';

// Singleton instances
let _adminApp: App | null = null;
let _adminAuth: Auth | null = null;
let _adminDatabase: Database | null = null;

/**
 * Initialize and return the Firebase Admin App instance.
 * Uses singleton pattern to avoid multiple initializations.
 * 
 * @throws Error if required environment variables are missing
 */
function getFirebaseAdminApp(): App {
  const apps = getApps();
  if (apps.length > 0) {
    return apps[0];
  }

  // Service account is required for Admin SDK
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  
  if (!serviceAccountKey) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set. ' +
      'Download your service account JSON from Firebase Console → Project Settings → Service Accounts'
    );
  }

  let serviceAccount: object;
  try {
    serviceAccount = JSON.parse(serviceAccountKey);
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON');
  }

  const databaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
  if (!databaseURL) {
    throw new Error('NEXT_PUBLIC_FIREBASE_DATABASE_URL environment variable is not set');
  }

  return initializeApp({
    credential: cert(serviceAccount),
    databaseURL,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}

/**
 * Get the Firebase Admin App instance (singleton).
 */
export function getAdminApp(): App {
  if (!_adminApp) {
    _adminApp = getFirebaseAdminApp();
  }
  return _adminApp;
}

/**
 * Get the Firebase Admin Auth instance (singleton).
 */
export function getAdminAuth(): Auth {
  if (!_adminAuth) {
    _adminAuth = getAuth(getAdminApp());
  }
  return _adminAuth;
}

/**
 * Get the Firebase Admin Database instance (singleton).
 */
export function getAdminDatabase(): Database {
  if (!_adminDatabase) {
    _adminDatabase = getDatabase(getAdminApp());
  }
  return _adminDatabase;
}

/**
 * Get a database reference for a specific path.
 * Convenience wrapper that handles the common pattern.
 * 
 * @param path - The database path (e.g., 'games/spyfall/rooms/ABC123')
 * @returns Database Reference
 */
export function getAdminDbRef(path: string) {
  return getAdminDatabase().ref(path);
}

/**
 * Verify a Firebase ID token and return the decoded token.
 * Useful for validating user authentication in server actions.
 * 
 * @param idToken - The Firebase ID token to verify
 * @returns The decoded token with user information
 * @throws Error if token is invalid
 */
export async function verifyIdToken(idToken: string) {
  const auth = getAdminAuth();
  return auth.verifyIdToken(idToken);
}
