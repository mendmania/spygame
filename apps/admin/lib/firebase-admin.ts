'use server';

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';

let adminApp: App | null = null;

function getAdminApp(): App {
  if (adminApp) {
    return adminApp;
  }

  const existingApps = getApps();
  if (existingApps.length > 0) {
    adminApp = existingApps[0];
    return adminApp;
  }

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is not set');
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(serviceAccountKey);
  } catch {
    throw new Error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY as JSON');
  }

  adminApp = initializeApp({
    credential: cert(serviceAccount),
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  });

  return adminApp;
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}

export function getAdminDatabase() {
  return getDatabase(getAdminApp());
}

// Verify if a user is an admin by checking the allowlist in RTDB
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

// Get admin database reference helper
export function getAdminDbRef(path: string) {
  return getAdminDatabase().ref(path);
}
