/**
 * Firebase Admin SDK Configuration
 * 
 * Used for server-side operations that require elevated permissions.
 * This runs ONLY on the server (API routes, Server Actions).
 */

import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';
import type { Database as AdminDatabase } from 'firebase-admin/database';

// Re-export the Database type with ref method
export type Database = AdminDatabase;

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

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(serviceAccountKey);
  } catch (e) {
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

let _adminApp: App | null = null;
let _adminAuth: Auth | null = null;
let _adminDatabase: Database | null = null;

export function getAdminApp(): App {
  if (!_adminApp) {
    _adminApp = getFirebaseAdminApp();
  }
  return _adminApp;
}

export function getAdminAuth(): Auth {
  if (!_adminAuth) {
    _adminAuth = getAuth(getAdminApp());
  }
  return _adminAuth;
}

export function getAdminDatabase(): Database {
  if (!_adminDatabase) {
    _adminDatabase = getDatabase(getAdminApp());
  }
  return _adminDatabase;
}
