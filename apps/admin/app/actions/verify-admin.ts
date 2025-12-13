'use server';

import { verifyAdminUser as verifyAdmin } from '@/lib/firebase-admin';

// Wrapper to expose verifyAdminUser as a server action
export async function verifyAdminUser(idToken: string): Promise<{
  isAdmin: boolean;
  uid: string | null;
  email: string | null;
  error?: string;
}> {
  return verifyAdmin(idToken);
}
