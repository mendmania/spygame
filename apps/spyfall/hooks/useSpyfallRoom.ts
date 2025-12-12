'use client';

/**
 * useSpyfallRoom Hook
 * 
 * Provides realtime room state subscription and room actions.
 * Phase 3: Full game mechanics with secure server actions.
 * Phase 4: Reconnect handling, race condition protection.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { subscribe } from '@vbz/firebase/database';
import { usePlayerIdentity } from '@vbz/game-core/hooks';
import type {
  SpyfallRoomData,
  SpyfallRoomState,
  SpyfallPrivatePlayerData,
  GameActionResult,
} from '@vbz/shared-types';
import {
  getRoomPath,
  getPrivatePlayerDataPath,
  createRoom,
  joinRoom,
  leaveRoom,
  updatePlayerDisplayName,
  roomExists,
} from '../lib/room-operations';
import {
  startGame as startGameAction,
  endGame as endGameAction,
  resetGame as resetGameAction,
  checkAndEndExpiredGame,
  handlePlayerLeave,
  kickPlayer as kickPlayerAction,
} from '../app/actions/game-actions';

interface UseSpyfallRoomOptions {
  roomId: string;
  autoJoin?: boolean;
}

interface UseSpyfallRoomResult {
  // State
  roomState: SpyfallRoomState | null;
  loading: boolean;
  error: string | null;
  
  // Player identity
  playerId: string;
  displayName: string;
  
  // Room actions
  createAndJoin: () => Promise<boolean>;
  join: () => Promise<boolean>;
  leave: () => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
  
  // Game actions
  startGame: (durationSeconds?: number) => Promise<GameActionResult>;
  endGame: () => Promise<GameActionResult>;
  resetGame: () => Promise<GameActionResult>;
  kickPlayer: (targetPlayerId: string) => Promise<GameActionResult>;
  
  // Computed
  isInRoom: boolean;
  isHost: boolean;
  isSpectator: boolean;
  canStart: boolean;
  timeRemaining: number | null;
}

function transformRoomData(
  roomId: string,
  data: SpyfallRoomData | null,
  playerId: string,
  privateData: SpyfallPrivatePlayerData | null
): SpyfallRoomState | null {
  if (!data) return null;

  const playersArray = Object.entries(data.players || {}).map(
    ([id, player]) => ({
      id,
      ...player,
    })
  );

  // Sort by joinedAt to maintain consistent order
  playersArray.sort((a, b) => a.joinedAt - b.joinedAt);

  const currentPlayer = playersArray.find((p) => p.id === playerId) || null;
  const isPlaying = data.meta.status === 'playing';
  const isFinished = data.meta.status === 'finished';

  return {
    roomId,
    meta: data.meta,
    state: data.state || null,
    players: playersArray,
    currentPlayer,
    currentPlayerGameData: privateData,
    isHost: currentPlayer?.isHost ?? false,
    playerCount: playersArray.length,
    isPlaying,
    isFinished,
    // Spy is revealed to all players when game is finished
    revealedSpyId: isFinished ? (data.state?.spyPlayerId || null) : null,
  };
}

export function useSpyfallRoom({
  roomId,
  autoJoin = false,
}: UseSpyfallRoomOptions): UseSpyfallRoomResult {
  const { playerId, displayName, setDisplayName, loading: identityLoading } = usePlayerIdentity();
  
  const [roomData, setRoomData] = useState<SpyfallRoomData | null>(null);
  const [privatePlayerData, setPrivatePlayerData] = useState<SpyfallPrivatePlayerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  
  const autoJoinAttempted = useRef(false);
  const timerEndHandled = useRef(false);
  const gameStatusRef = useRef<string | undefined>(undefined);
  const isHostRef = useRef(false);

  // Keep refs in sync with current state
  useEffect(() => {
    gameStatusRef.current = roomData?.meta?.status;
  }, [roomData?.meta?.status]);

  useEffect(() => {
    // Check if current player is host
    if (roomData?.players && playerId) {
      isHostRef.current = roomData.players[playerId]?.isHost ?? false;
    } else {
      isHostRef.current = false;
    }
  }, [roomData?.players, playerId]);

  // Subscribe to room updates
  useEffect(() => {
    if (!roomId) return;

    setLoading(true);
    setError(null);

    const unsubscribe = subscribe<SpyfallRoomData>(
      getRoomPath(roomId),
      (data) => {
        setRoomData(data);
        setLoading(false);
        
        // Check if we're still in the room
        if (data && playerId && data.players) {
          setHasJoined(playerId in data.players);
        } else {
          setHasJoined(false);
        }

        // Reset timer end handler when game status changes
        if (data?.meta.status !== 'playing') {
          timerEndHandled.current = false;
        }
      }
    );

    return () => unsubscribe();
  }, [roomId, playerId]);

  // Subscribe to private player data (role, location, isSpy)
  useEffect(() => {
    if (!roomId || !playerId) return;

    const unsubscribe = subscribe<SpyfallPrivatePlayerData>(
      getPrivatePlayerDataPath(roomId, playerId),
      (data) => {
        setPrivatePlayerData(data);
      }
    );

    return () => unsubscribe();
  }, [roomId, playerId]);

  // Timer countdown effect
  // Timer stops at 00:00 and waits for host to end game manually
  useEffect(() => {
    if (!roomData?.state || roomData.meta.status !== 'playing') {
      setTimeRemaining(null);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((roomData.state!.endsAt - now) / 1000));
      setTimeRemaining(remaining);
      // Timer stays at 00:00 - host must click "End Game" to finish
    };

    // Update immediately
    updateTimer();

    // Update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [roomData?.state, roomData?.meta.status, roomId]);

  // Auto-join logic with mid-game reconnect handling
  useEffect(() => {
    if (
      autoJoin &&
      !autoJoinAttempted.current &&
      !identityLoading &&
      playerId &&
      displayName &&
      roomId &&
      !loading
    ) {
      autoJoinAttempted.current = true;
      
      (async () => {
        try {
          const exists = await roomExists(roomId);
          if (exists) {
            // Try to join - joinRoom handles reconnects for existing players
            // and blocks new players during active games
            const success = await joinRoom({ roomId, playerId, displayName });
            // If join failed, user becomes a spectator (no error shown)
            // They can still see room data via subscription
            if (!success) {
              // Don't set error - let them spectate
              console.log('[Spectator] Join blocked - watching as spectator');
            }
          } else {
            // Room doesn't exist - create it
            await createRoom({ roomId, playerId, displayName });
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to join room');
        }
      })();
    }
  }, [autoJoin, identityLoading, playerId, displayName, roomId, loading]);

  // Spectator auto-join when game resets to waiting
  // When host clicks "Play Again", spectators automatically join
  useEffect(() => {
    const isSpectator = !!roomData && !hasJoined && roomData.meta?.status === 'waiting';
    
    if (isSpectator && playerId && displayName && roomId) {
      console.log('[Spectator] Game reset to waiting - attempting to join');
      
      (async () => {
        try {
          const success = await joinRoom({ roomId, playerId, displayName });
          if (success) {
            console.log('[Spectator] Successfully joined after game reset');
          }
        } catch (err) {
          console.error('[Spectator] Failed to join:', err);
        }
      })();
    }
  }, [roomData?.meta?.status, hasJoined, playerId, displayName, roomId, roomData]);

  // Leave room on unmount (only if in waiting state and NOT host)
  // Note: Using client leaveRoom for cleanup since server actions can't reliably
  // be awaited in useEffect cleanup. The atomic host promotion in leaveRoom
  // handles this case.
  // IMPORTANT: Use refs to check CURRENT status, not stale closure values!
  // Otherwise cleanup runs with old values when state just changed.
  // Also: Don't leave if player is host - they manage the room
  useEffect(() => {
    return () => {
      // Don't leave during active game - preserve game state
      // Don't leave if player is host - they manage the room
      // Check refs for LIVE values (not stale closures)
      if (hasJoined && playerId && roomId && gameStatusRef.current === 'waiting' && !isHostRef.current) {
        // Fire and forget - cleanup shouldn't block unmount
        leaveRoom(roomId, playerId).catch(console.error);
      }
    };
  }, [hasJoined, playerId, roomId]);

  // Room actions
  const createAndJoin = useCallback(async (): Promise<boolean> => {
    if (!playerId || !displayName) return false;
    
    try {
      setError(null);
      await createRoom({ roomId, playerId, displayName });
      setHasJoined(true);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room');
      return false;
    }
  }, [roomId, playerId, displayName]);

  const join = useCallback(async (): Promise<boolean> => {
    if (!playerId || !displayName) return false;
    
    try {
      setError(null);
      const success = await joinRoom({ roomId, playerId, displayName });
      if (success) {
        setHasJoined(true);
      } else {
        setError('Room not found or game already started');
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join room');
      return false;
    }
  }, [roomId, playerId, displayName]);

  const leave = useCallback(async (): Promise<void> => {
    if (!playerId) return;
    
    try {
      // Use server action for atomic host promotion handling
      await handlePlayerLeave(roomId, playerId);
      setHasJoined(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to leave room');
    }
  }, [roomId, playerId]);

  const updateName = useCallback(async (name: string): Promise<void> => {
    if (!playerId) return;
    
    try {
      await updatePlayerDisplayName({ roomId, playerId, displayName: name });
      await setDisplayName(name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update name');
    }
  }, [roomId, playerId, setDisplayName]);

  // Game actions (call server actions)
  const startGame = useCallback(async (durationSeconds?: number): Promise<GameActionResult> => {
    if (!playerId) return { success: false, error: 'Not authenticated' };
    
    try {
      setError(null);
      const result = await startGameAction(roomId, playerId, durationSeconds);
      if (!result.success && result.error) {
        setError(result.error);
      }
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to start game';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  }, [roomId, playerId]);

  const endGame = useCallback(async (): Promise<GameActionResult> => {
    if (!playerId) return { success: false, error: 'Not authenticated' };
    
    try {
      setError(null);
      const result = await endGameAction(roomId, playerId);
      if (!result.success && result.error) {
        setError(result.error);
      }
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to end game';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  }, [roomId, playerId]);

  const resetGame = useCallback(async (): Promise<GameActionResult> => {
    if (!playerId) return { success: false, error: 'Not authenticated' };
    
    try {
      setError(null);
      const result = await resetGameAction(roomId, playerId);
      if (!result.success && result.error) {
        setError(result.error);
      }
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to reset game';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  }, [roomId, playerId]);

  const kickPlayer = useCallback(async (targetPlayerId: string): Promise<GameActionResult> => {
    if (!playerId) return { success: false, error: 'Not authenticated' };
    
    try {
      setError(null);
      const result = await kickPlayerAction(roomId, playerId, targetPlayerId);
      if (!result.success && result.error) {
        setError(result.error);
      }
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to kick player';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  }, [roomId, playerId]);

  // Transform data for UI consumption
  const roomState = transformRoomData(roomId, roomData, playerId, privatePlayerData);

  // Debug: Log room data transformation
  console.log('[useSpyfallRoom]', {
    hasRoomData: !!roomData,
    status: roomData?.meta?.status,
    playersInData: roomData?.players ? Object.keys(roomData.players).length : 0,
    playerId,
    transformedPlayers: roomState?.players?.length ?? 0,
    isHost: roomState?.isHost,
  });

  return {
    roomState,
    loading: loading || identityLoading,
    error,
    playerId,
    displayName,
    createAndJoin,
    join,
    leave,
    updateDisplayName: updateName,
    startGame,
    endGame,
    resetGame,
    kickPlayer,
    isInRoom: hasJoined,
    isHost: roomState?.isHost ?? false,
    // Spectator: room exists, game is active, but player is not in the game
    isSpectator: !!roomState && !hasJoined && (roomState.isPlaying || roomState.isFinished),
    canStart: (roomState?.playerCount ?? 0) >= 3 && roomState?.meta.status === 'waiting',
    timeRemaining,
  };
}
