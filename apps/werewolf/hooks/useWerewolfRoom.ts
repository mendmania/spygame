'use client';

/**
 * useWerewolfRoom Hook
 * 
 * Provides realtime room state subscription and room actions.
 * Handles all phases: waiting, night, day, voting, ended.
 * 
 * This is the main hook for interacting with a Werewolf game room.
 */

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { subscribe } from '@vbz/firebase/database';
import { usePlayerIdentity } from '@vbz/game-core/hooks';
import type {
  WerewolfRoomData,
  WerewolfRoomState,
  WerewolfPrivatePlayerData,
  WerewolfActionResult,
  NightActionType,
  WerewolfRole,
} from '@vbz/shared-types';
import {
  getRoomPath,
  getPrivatePlayerDataPath,
  createRoom,
  joinRoom,
  leaveRoom,
  updatePlayerDisplayName,
  roomExists,
  type JoinRoomResult,
} from '../lib/room-operations';
import {
  startGame as startGameAction,
  endGame as endGameAction,
  resetGame as resetGameAction,
  kickPlayer as kickPlayerAction,
  performNightAction as performNightActionAction,
  skipNightAction as skipNightActionAction,
  forceAdvanceToDay as forceAdvanceToDayAction,
  advanceToVoting as advanceToVotingAction,
  castVote as castVoteAction,
  handlePlayerLeave,
  updateSelectedRoles as updateSelectedRolesAction,
} from '../app/actions/game-actions';
import { NIGHT_ACTION_ORDER, ROLE_CONFIGS } from '../constants/roles';

interface UseWerewolfRoomOptions {
  roomId: string;
  autoJoin?: boolean;
}

interface UseWerewolfRoomResult {
  // State
  roomState: WerewolfRoomState | null;
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
  startGame: () => Promise<WerewolfActionResult>;
  endGame: () => Promise<WerewolfActionResult>;
  resetGame: () => Promise<WerewolfActionResult>;
  kickPlayer: (targetPlayerId: string) => Promise<WerewolfActionResult>;
  
  // Night phase actions
  performNightAction: (action: NightActionType, target?: string | string[]) => Promise<WerewolfActionResult>;
  skipNightAction: () => Promise<WerewolfActionResult>;
  forceAdvanceToDay: () => Promise<WerewolfActionResult>;
  
  // Day/Voting phase actions
  advanceToVoting: () => Promise<WerewolfActionResult>;
  castVote: (targetPlayerId: string) => Promise<WerewolfActionResult>;
  
  // Computed
  isInRoom: boolean;
  wasKicked: boolean;
  isHost: boolean;
  isSpectator: boolean;
  canStart: boolean;
  joinBlockedReason: 'in_progress' | 'room_not_found' | 'full' | null;
  
  // Role selection
  selectedRoles: WerewolfRole[];
  updateSelectedRoles: (roles: WerewolfRole[]) => Promise<WerewolfActionResult>;
  
  // Phase-specific computed
  isWaiting: boolean;
  isNight: boolean;
  isDay: boolean;
  isVoting: boolean;
  isEnded: boolean;
  
  // Night phase progress
  nightActedCount: number;
  nightTotalPlayers: number;
  isNightComplete: boolean;
  
  // Voting phase progress
  votedCount: number;
  voteTotalPlayers: number;
  isVotingComplete: boolean;
  
  // Timer
  timeRemaining: number | null;
}

function transformRoomData(
  roomId: string,
  data: WerewolfRoomData | null,
  playerId: string,
  privateData: WerewolfPrivatePlayerData | null
): WerewolfRoomState | null {
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
  const status = data.meta.status;

  // Determine if it's this player's turn to act during night
  // STRICT TURN ENFORCEMENT: Player can only act if:
  // 1. It's night phase
  // 2. Their role matches meta.activeNightRole
  // 3. They haven't acted yet
  let isMyTurnToAct = false;
  if (status === 'night' && privateData?.originalRole) {
    const myRole = privateData.originalRole;
    const activeNightRole = data.meta.activeNightRole;
    const roleConfig = ROLE_CONFIGS[myRole];
    
    // Only allow action if it's this role's turn AND player hasn't acted
    isMyTurnToAct = (
      roleConfig.nightAction && 
      myRole === activeNightRole && 
      !currentPlayer?.hasActed
    );
  }

  return {
    roomId,
    meta: data.meta,
    state: data.state || null,
    players: playersArray,
    currentPlayer,
    currentPlayerData: privateData,
    isHost: currentPlayer?.isHost ?? false,
    playerCount: playersArray.length,
    isWaiting: status === 'waiting',
    isNight: status === 'night',
    isDay: status === 'day',
    isVoting: status === 'voting',
    isEnded: status === 'ended',
    result: data.result || null,
    isMyTurnToAct,
    myOriginalRole: privateData?.originalRole || null,
    myCurrentRole: privateData?.currentRole || null,
    nightActionResult: privateData?.nightActionResult || null,
    activeNightRole: data.meta.activeNightRole || null,
  };
}

export function useWerewolfRoom({
  roomId,
  autoJoin = false,
}: UseWerewolfRoomOptions): UseWerewolfRoomResult {
  const { playerId, displayName, setDisplayName, loading: identityLoading } = usePlayerIdentity();
  
  const [roomData, setRoomData] = useState<WerewolfRoomData | null>(null);
  const [privatePlayerData, setPrivatePlayerData] = useState<WerewolfPrivatePlayerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [joinBlockedReason, setJoinBlockedReason] = useState<'in_progress' | 'room_not_found' | 'full' | null>(null);
  const [wasKicked, setWasKicked] = useState(false);
  
  const autoJoinAttempted = useRef(false);
  const wasInRoomRef = useRef(false);
  const gameStatusRef = useRef<string | undefined>(undefined);
  const isHostRef = useRef(false);

  // Keep refs in sync with current state
  useEffect(() => {
    gameStatusRef.current = roomData?.meta?.status;
  }, [roomData?.meta?.status]);

  useEffect(() => {
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

    const unsubscribe = subscribe<WerewolfRoomData>(
      getRoomPath(roomId),
      (data) => {
        setRoomData(data);
        setLoading(false);
        
        if (!data) {
          setError('Room not found');
        }
      }
    );

    return unsubscribe;
  }, [roomId]);

  // Subscribe to private player data
  useEffect(() => {
    if (!roomId || !playerId || !roomData?.meta) return;

    // Only subscribe if game is in progress
    const status = roomData.meta.status;
    if (status === 'waiting') {
      setPrivatePlayerData(null);
      return;
    }

    const unsubscribe = subscribe<WerewolfPrivatePlayerData>(
      getPrivatePlayerDataPath(roomId, playerId),
      (data) => {
        setPrivatePlayerData(data);
      }
    );

    return unsubscribe;
  }, [roomId, playerId, roomData?.meta?.status]);

  // Auto-join room when ready
  useEffect(() => {
    if (!autoJoin || !roomId || !playerId || identityLoading || autoJoinAttempted.current) {
      return;
    }

    autoJoinAttempted.current = true;

    (async () => {
      try {
        const exists = await roomExists(roomId);
        
        if (exists) {
          const result = await joinRoom({ roomId, playerId, displayName });
          setHasJoined(result.joined);
          if (!result.joined) {
            setJoinBlockedReason(result.reason || null);
            if (result.reason === 'in_progress') {
              setError('Game in progress. You can spectate or wait for the next round.');
            } else if (result.reason === 'room_not_found') {
              setError('Room not found.');
            }
          } else {
            setJoinBlockedReason(null);
          }
        } else {
          // Create room if it doesn't exist
          await createRoom({ roomId, playerId, displayName });
          setHasJoined(true);
          setJoinBlockedReason(null);
        }
      } catch (err) {
        console.error('[useWerewolfRoom] Auto-join error:', err);
        setError(err instanceof Error ? err.message : 'Failed to join room');
      }
    })();
  }, [autoJoin, roomId, playerId, displayName, identityLoading]);

  // Timer countdown
  useEffect(() => {
    if (!roomData?.state) {
      setTimeRemaining(null);
      return;
    }

    const { dayEndsAt, votingEndsAt, currentPhase } = roomData.state;
    
    let targetTime: number | null = null;
    if (currentPhase === 'day' && dayEndsAt) {
      targetTime = dayEndsAt;
    } else if (currentPhase === 'voting' && votingEndsAt) {
      targetTime = votingEndsAt;
    }

    if (!targetTime) {
      setTimeRemaining(null);
      return;
    }

    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((targetTime! - Date.now()) / 1000));
      setTimeRemaining(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [roomData?.state?.dayEndsAt, roomData?.state?.votingEndsAt, roomData?.state?.currentPhase]);

  // Room actions
  const createAndJoin = useCallback(async (): Promise<boolean> => {
    if (!playerId) return false;
    try {
      await createRoom({ roomId, playerId, displayName });
      setHasJoined(true);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room');
      return false;
    }
  }, [roomId, playerId, displayName]);

  const join = useCallback(async (): Promise<boolean> => {
    if (!playerId) return false;
    try {
      const result = await joinRoom({ roomId, playerId, displayName });
      setHasJoined(result.joined);
      if (!result.joined) {
        setJoinBlockedReason(result.reason || null);
        if (result.reason === 'in_progress') {
          setError('Game in progress. You can spectate or wait for the next round.');
        }
      } else {
        setJoinBlockedReason(null);
      }
      return result.joined;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join room');
      return false;
    }
  }, [roomId, playerId, displayName]);

  const leave = useCallback(async (): Promise<void> => {
    if (!playerId) return;
    try {
      await handlePlayerLeave(roomId, playerId);
      setHasJoined(false);
    } catch (err) {
      console.error('[useWerewolfRoom] Leave error:', err);
    }
  }, [roomId, playerId]);

  const updateName = useCallback(async (name: string): Promise<void> => {
    if (!playerId) return;
    await updatePlayerDisplayName({ roomId, playerId, displayName: name });
    setDisplayName(name);
  }, [roomId, playerId, setDisplayName]);

  // Game actions
  const startGame = useCallback(async (): Promise<WerewolfActionResult> => {
    if (!playerId) return { success: false, error: 'Not authenticated' };
    return startGameAction(roomId, playerId);
  }, [roomId, playerId]);

  const endGame = useCallback(async (): Promise<WerewolfActionResult> => {
    if (!playerId) return { success: false, error: 'Not authenticated' };
    return endGameAction(roomId, playerId);
  }, [roomId, playerId]);

  const resetGame = useCallback(async (): Promise<WerewolfActionResult> => {
    if (!playerId) return { success: false, error: 'Not authenticated' };
    return resetGameAction(roomId, playerId);
  }, [roomId, playerId]);

  const kickPlayer = useCallback(async (targetPlayerId: string): Promise<WerewolfActionResult> => {
    if (!playerId) return { success: false, error: 'Not authenticated' };
    return kickPlayerAction(roomId, playerId, targetPlayerId);
  }, [roomId, playerId]);

  // Night phase actions
  const performNightAction = useCallback(async (
    action: NightActionType,
    target?: string | string[]
  ): Promise<WerewolfActionResult> => {
    if (!playerId) {
      return { success: false, error: 'Not authenticated' };
    }
    const result = await performNightActionAction({ roomId, playerId, action, target });
    return result;
  }, [roomId, playerId]);

  const skipNightAction = useCallback(async (): Promise<WerewolfActionResult> => {
    if (!playerId) return { success: false, error: 'Not authenticated' };
    return skipNightActionAction(roomId, playerId);
  }, [roomId, playerId]);

  const forceAdvanceToDay = useCallback(async (): Promise<WerewolfActionResult> => {
    if (!playerId) return { success: false, error: 'Not authenticated' };
    return forceAdvanceToDayAction(roomId, playerId);
  }, [roomId, playerId]);

  // Day/Voting actions
  const advanceToVoting = useCallback(async (): Promise<WerewolfActionResult> => {
    if (!playerId) return { success: false, error: 'Not authenticated' };
    return advanceToVotingAction(roomId, playerId);
  }, [roomId, playerId]);

  const castVote = useCallback(async (targetPlayerId: string): Promise<WerewolfActionResult> => {
    if (!playerId) return { success: false, error: 'Not authenticated' };
    return castVoteAction({ roomId, playerId, targetPlayerId });
  }, [roomId, playerId]);

  // Role selection
  const updateSelectedRoles = useCallback(async (roles: WerewolfRole[]): Promise<WerewolfActionResult> => {
    if (!playerId) return { success: false, error: 'Not authenticated' };
    return updateSelectedRolesAction(roomId, playerId, roles);
  }, [roomId, playerId]);

  // Computed values
  const roomState = useMemo(
    () => transformRoomData(roomId, roomData, playerId, privatePlayerData),
    [roomId, roomData, playerId, privatePlayerData]
  );

  const isInRoom = !!roomState?.currentPlayer;
  
  // Detect when player is kicked: was in room, room still exists, but no longer in room
  useEffect(() => {
    if (isInRoom) {
      wasInRoomRef.current = true;
      setWasKicked(false);
    } else if (wasInRoomRef.current && roomData && !loading) {
      // Player was in room, room exists, but player is no longer in it -> kicked
      setWasKicked(true);
      wasInRoomRef.current = false;
    }
  }, [isInRoom, roomData, loading]);

  const isHost = roomState?.isHost ?? false;
  // Spectator: tried to join but blocked, and game is in progress
  const isSpectator = !isInRoom && joinBlockedReason === 'in_progress' && roomData?.meta?.status !== 'waiting';
  
  // canStart: host, enough players, and either has valid selected roles OR no roles selected (will use default)
  const selectedRolesArray = roomData?.meta?.selectedRoles || [];
  const playerCountForStart = roomState?.playerCount ?? 0;
  const requiredRoleCount = playerCountForStart + 3; // players + 3 center cards
  const hasValidRoleSelection = selectedRolesArray.length === 0 || selectedRolesArray.length === requiredRoleCount;
  const hasWerewolf = selectedRolesArray.length === 0 || selectedRolesArray.filter(r => r === 'werewolf').length > 0;
  const canStart = isHost && playerCountForStart >= 3 && hasValidRoleSelection && hasWerewolf;

  // Night phase progress calculation
  const nightProgress = useMemo(() => {
    if (!roomState?.players || roomData?.meta?.status !== 'night') {
      return { actedCount: 0, totalPlayers: 0, isComplete: false };
    }
    const players = roomState.players;
    const totalPlayers = players.length;
    const actedCount = players.filter((p) => p.hasActed).length;
    return {
      actedCount,
      totalPlayers,
      isComplete: actedCount === totalPlayers,
    };
  }, [roomState?.players, roomData?.meta?.status]);

  // Voting phase progress calculation
  const voteProgress = useMemo(() => {
    if (!roomState?.players || roomData?.meta?.status !== 'voting') {
      return { votedCount: 0, totalPlayers: 0, isComplete: false };
    }
    const players = roomState.players;
    const totalPlayers = players.length;
    // Use typeof check because Firebase RTDB deletes null values, making them undefined
    const votedCount = players.filter((p) => typeof p.vote === 'string').length;
    return {
      votedCount,
      totalPlayers,
      isComplete: votedCount === totalPlayers,
    };
  }, [roomState?.players, roomData?.meta?.status]);

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
    performNightAction,
    skipNightAction,
    forceAdvanceToDay,
    advanceToVoting,
    castVote,
    isInRoom,
    wasKicked,
    isHost,
    isSpectator,
    canStart,
    joinBlockedReason,
    selectedRoles: roomData?.meta?.selectedRoles || [],
    updateSelectedRoles,
    isWaiting: roomState?.isWaiting ?? false,
    isNight: roomState?.isNight ?? false,
    isDay: roomState?.isDay ?? false,
    isVoting: roomState?.isVoting ?? false,
    isEnded: roomState?.isEnded ?? false,
    nightActedCount: nightProgress.actedCount,
    nightTotalPlayers: nightProgress.totalPlayers,
    isNightComplete: nightProgress.isComplete,
    votedCount: voteProgress.votedCount,
    voteTotalPlayers: voteProgress.totalPlayers,
    isVotingComplete: voteProgress.isComplete,
    timeRemaining,
  };
}
