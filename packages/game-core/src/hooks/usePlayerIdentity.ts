'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@vbz/firebase/auth';

const ADJECTIVES = ['Happy', 'Clever', 'Brave', 'Swift', 'Wise', 'Calm', 'Eager', 'Gentle', 'Kind', 'Proud'];
const NOUNS = ['Fox', 'Owl', 'Bear', 'Wolf', 'Eagle', 'Tiger', 'Lion', 'Hawk', 'Deer', 'Raven'];

function generateUsername(): string {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const number = Math.floor(Math.random() * 100);
  return `${adjective}${noun}${number}`;
}

const STORAGE_KEY = 'vbz-player-identity';

interface StoredIdentity {
  odurplayerId: string;
  displayName: string;
}

export function usePlayerIdentity() {
  const { user, loading: authLoading, updateDisplayName } = useAuth();
  const [displayName, setDisplayNameState] = useState<string>('');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;

    // Try to get stored display name
    const stored = localStorage.getItem(STORAGE_KEY);
    let storedIdentity: StoredIdentity | null = null;

    if (stored) {
      try {
        storedIdentity = JSON.parse(stored);
      } catch {
        // Invalid JSON, ignore
      }
    }

    // Determine display name
    const name = user.displayName || storedIdentity?.displayName || generateUsername();
    setDisplayNameState(name);

    // Save to localStorage
    const identity: StoredIdentity = {
      odurplayerId: user.uid,
      displayName: name,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));

    // Update Firebase profile if needed
    if (!user.displayName && name) {
      updateDisplayName(name);
    }

    setIsReady(true);
  }, [user, authLoading, updateDisplayName]);

  const setDisplayName = useCallback(async (name: string) => {
    if (!user) return;

    await updateDisplayName(name);
    setDisplayNameState(name);

    const identity: StoredIdentity = {
      odurplayerId: user.uid,
      displayName: name,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
  }, [user, updateDisplayName]);

  return {
    playerId: user?.uid || '',
    displayName,
    setDisplayName,
    isReady,
    loading: authLoading || !isReady,
  };
}
