'use client';

import { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import {
  signInWithEmail,
  signInWithGoogle,
  signOutUser,
  getIdToken,
  subscribeToAuthState,
} from '@/lib/firebase-client';
import { verifyAdminUser } from '@/app/actions/verify-admin';

interface AdminAuthState {
  user: User | null;
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useAdminAuth() {
  const [state, setState] = useState<AdminAuthState>({
    user: null,
    isAdmin: false,
    isLoading: true,
    error: null,
  });

  // Check if authenticated user is admin
  const checkAdminStatus = useCallback(async (user: User) => {
    try {
      const idToken = await user.getIdToken();
      const result = await verifyAdminUser(idToken);
      
      setState({
        user,
        isAdmin: result.isAdmin,
        isLoading: false,
        error: result.isAdmin ? null : 'You are not authorized as an admin',
      });
    } catch (error) {
      setState({
        user,
        isAdmin: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to verify admin status',
      });
    }
  }, []);

  // Subscribe to auth state changes
  useEffect(() => {
    const unsubscribe = subscribeToAuthState(async (user) => {
      if (user) {
        await checkAdminStatus(user);
      } else {
        setState({
          user: null,
          isAdmin: false,
          isLoading: false,
          error: null,
        });
      }
    });

    return () => unsubscribe();
  }, [checkAdminStatus]);

  // Sign in with email/password
  const loginWithEmail = async (email: string, password: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const user = await signInWithEmail(email, password);
      await checkAdminStatus(user);
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Login failed',
      }));
      throw error;
    }
  };

  // Sign in with Google
  const loginWithGoogle = async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const user = await signInWithGoogle();
      await checkAdminStatus(user);
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Google login failed',
      }));
      throw error;
    }
  };

  // Sign out
  const logout = async () => {
    try {
      await signOutUser();
      setState({
        user: null,
        isAdmin: false,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Get current ID token for API calls
  const getToken = async (): Promise<string | null> => {
    return getIdToken();
  };

  return {
    ...state,
    loginWithEmail,
    loginWithGoogle,
    logout,
    getToken,
  };
}
