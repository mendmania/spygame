/**
 * Firebase Admin SDK - Re-export from shared package
 * 
 * This file provides backward compatibility for existing imports.
 * All functionality is now in @vbz/firebase-admin package.
 */

export {
  getAdminApp,
  getAdminAuth,
  getAdminDatabase,
  getAdminDbRef,
  verifyIdToken,
  type App,
  type Auth,
  type Database,
  type Reference,
  type DataSnapshot,
} from '@vbz/firebase-admin';

    _adminDatabase = getDatabase(getAdminApp());
  }
  return _adminDatabase;
}
