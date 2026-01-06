'use client';

/**
 * Werewolf Room Page
 * 
 * Main game room page handling all phases:
 * - Waiting: Lobby with player list and start button
 * - Reveal: Players see their role and confirm ready for night
 * - Night: Private role actions
 * - Day: Discussion phase with timer
 * - Voting: Vote selection with timer
 * - Ended: Results display
 */

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useWerewolfRoom, useCurrentPlayerRole, useNightPhase, usePremiumRoles } from '../../../hooks';
import {
  RoleCard,
  PlayersList,
  Timer,
  NightActionPanel,
  GameResult,
  RoleSelector,
  GameRolesFooter,
  type WerewolfPlayerDisplay,
} from '../../../components/game';
import { getRoleEmoji, ROLE_CONFIGS, getRoleImagePath } from '../../../constants/roles';
import type { WerewolfNightActionResult, WerewolfRole } from '@vbz/shared-types';
import styles from './page.module.css';

interface RoomPageProps {
  params: { roomId: string };
}

// Helper component to render a role with image
function RoleWithImage({ role, size = 20 }: { role: WerewolfRole; size?: number }) {
  return (
    <span className={styles.roleWithImage}>
      <Image
        src={getRoleImagePath(role)}
        alt={ROLE_CONFIGS[role].name}
        width={size}
        height={size}
        className={styles.inlineRoleImage}
        unoptimized
      />
      <span>{ROLE_CONFIGS[role].name}</span>
    </span>
  );
}

// Helper component to show night action result summary during day phase
function NightActionResultSummary({ 
  result, 
  players 
}: { 
  result: WerewolfNightActionResult; 
  players: WerewolfPlayerDisplay[];
}) {
  const getPlayerName = (id: string) => 
    players.find(p => p.id === id)?.displayName || 'Unknown';

  const items: React.ReactNode[] = [];

  if (result.skipped) {
    items.push(<span key="skipped">You chose to skip your action</span>);
  }
  if (result.otherWerewolves && result.otherWerewolves.length > 0) {
    items.push(
      <span key="otherWerewolves" className={styles.discoveryItem}>
        <RoleWithImage role="werewolf" /> Other werewolf(s): {result.otherWerewolves.map(getPlayerName).join(', ')}
      </span>
    );
  }
  if (result.isLoneWolf || (result.otherWerewolves && result.otherWerewolves.length === 0)) {
    items.push(
      <span key="loneWolf" className={styles.discoveryItem}>
        <RoleWithImage role="werewolf" /> You are the only werewolf
      </span>
    );
  }
  if (result.centerCardSeen) {
    items.push(
      <span key="centerCard" className={styles.discoveryItem}>
        Center card: <RoleWithImage role={result.centerCardSeen} />
      </span>
    );
  }
  if (result.playerRoleSeen) {
    items.push(
      <span key="playerRole" className={styles.discoveryItem}>
        {getPlayerName(result.playerRoleSeen.playerId)} is <RoleWithImage role={result.playerRoleSeen.role} />
      </span>
    );
  }
  if (result.centerCardsSeen) {
    items.push(
      <span key="centerCards" className={styles.discoveryItem}>
        Center cards: {result.centerCardsSeen.map((c, i) => (
          <span key={c.index}>
            {i > 0 && ', '}Card {c.index + 1}: <RoleWithImage role={c.role} />
          </span>
        ))}
      </span>
    );
  }
  if (result.newRole) {
    const robbedName = result.robbedPlayerId ? getPlayerName(result.robbedPlayerId) : null;
    items.push(
      <span key="newRole" className={styles.discoveryItem}>
        {robbedName 
          ? <>You robbed {robbedName} and became <RoleWithImage role={result.newRole} /></>
          : <>Your new role: <RoleWithImage role={result.newRole} /></>}
      </span>
    );
  }
  if (result.swappedPlayers) {
    items.push(
      <span key="swapped" className={styles.discoveryItem}>
        Swapped {getPlayerName(result.swappedPlayers[0])} ↔ {getPlayerName(result.swappedPlayers[1])}
      </span>
    );
  }
  if (result.werewolvesSeen !== undefined) {
    items.push(
      <span key="werewolvesSeen" className={styles.discoveryItem}>
        <RoleWithImage role="werewolf" /> {result.werewolvesSeen.length > 0 
          ? `Werewolf(s): ${result.werewolvesSeen.map(getPlayerName).join(', ')}`
          : 'There are no werewolves among the players!'}
      </span>
    );
  }
  if (result.otherMason !== undefined) {
    items.push(
      <span key="mason" className={styles.discoveryItem}>
        <RoleWithImage role="mason" /> {result.otherMason 
          ? `Fellow Mason: ${getPlayerName(result.otherMason)}`
          : 'You are the only Mason'}
      </span>
    );
  }
  if (result.centerCardSwapped !== undefined) {
    items.push(
      <span key="drunk" className={styles.discoveryItem}>
        <RoleWithImage role="drunk" /> Swapped with Center Card {result.centerCardSwapped + 1}
      </span>
    );
  }
  if (result.finalRole) {
    items.push(
      <span key="finalRole" className={styles.discoveryItem}>
        Your final role: <RoleWithImage role={result.finalRole} />
      </span>
    );
  }
  if (result.witchPeekedCard) {
    items.push(
      <span key="witch" className={styles.discoveryItem}>
        Peeked at Center Card {result.witchPeekedCard.index + 1}: <RoleWithImage role={result.witchPeekedCard.role} />
        {result.witchSwappedWith && ` → swapped with ${getPlayerName(result.witchSwappedWith)}`}
      </span>
    );
  }

  if (items.length === 0) {
    return <p className={styles.reminderText}>No special information discovered.</p>;
  }

  return (
    <ul className={styles.reminderList}>
      {items.map((item, i) => (
        <li key={i} className={styles.reminderItem}>{item}</li>
      ))}
    </ul>
  );
}

export default function RoomPage({ params }: RoomPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomId = params.roomId.toUpperCase();
  
  // Main room hook
  const {
    roomState,
    loading,
    error,
    playerId,
    displayName,
    leave,
    updateDisplayName,
    isHost,
    isSpectator,
    wasKicked,
    canStart,
    joinBlockedReason,
    startGame,
    endGame,
    resetGame,
    kickPlayer,
    performNightAction,
    skipNightAction,
    forceAdvanceToDay,
    advanceToVoting,
    castVote,
    setPlayerReadyForNight,
    isWaiting,
    isReveal,
    isNight,
    isDay,
    isVoting,
    isEnded,
    nightActedCount,
    nightTotalPlayers,
    isNightComplete,
    votedCount,
    voteTotalPlayers,
    isVotingComplete,
    timeRemaining,
    selectedRoles,
    updateSelectedRoles,
  } = useWerewolfRoom({ roomId, autoJoin: true });

  // Premium roles hook
  const {
    isRoleUnlocked,
    purchaseRole,
    isPurchasing,
    error: premiumError,
    clearError: clearPremiumError,
  } = usePremiumRoles({
    roomId,
    playerId: playerId || '',
  });

  // Handle payment redirect status
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'cancelled' | null>(null);
  
  useEffect(() => {
    const payment = searchParams.get('payment');
    const sessionId = searchParams.get('session_id');
    
    if (payment === 'success' && sessionId) {
      setPaymentStatus('success');
      
      // Verify payment and unlock the role (fallback for when webhooks don't work)
      fetch('/api/stripe/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            console.log('Payment verified and role unlocked:', data.role);
          } else {
            console.error('Payment verification failed:', data.error);
          }
        })
        .catch(err => console.error('Payment verification error:', err))
        .finally(() => {
          // Clear the URL params after verification
          setTimeout(() => {
            router.replace(`/room/${roomId}`);
            setPaymentStatus(null);
          }, 2000);
        });
    } else if (payment === 'cancelled') {
      setPaymentStatus('cancelled');
      setTimeout(() => {
        router.replace(`/room/${roomId}`);
        setPaymentStatus(null);
      }, 3000);
    }
  }, [searchParams, roomId, router]);

  // Redirect to home if kicked
  useEffect(() => {
    if (wasKicked) {
      router.replace('/');
    }
  }, [wasKicked, router]);

  // Role hook
  const roleInfo = useCurrentPlayerRole({
    originalRole: roomState?.myOriginalRole || null,
    currentRole: roomState?.myCurrentRole || null,
  });

  // Night phase hook
  const nightPhase = useNightPhase({
    roomState,
    performNightAction,
    skipNightAction,
  });

  // Local state
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [votedFor, setVotedFor] = useState<string | null>(null);
  const [hasSeenRole, setHasSeenRole] = useState(false);
  const [isSettingReady, setIsSettingReady] = useState(false);

  // Reset local state when game resets to waiting phase
  useEffect(() => {
    if (isWaiting) {
      setVotedFor(null);
      setIsStarting(false);
      setIsAdvancing(false);
      setHasSeenRole(false);
      setIsSettingReady(false);
    }
  }, [isWaiting]);

  // Transform players for display
  const players: WerewolfPlayerDisplay[] = useMemo(() => {
    if (!roomState?.players) return [];
    return roomState.players.map((p) => ({
      id: p.id,
      displayName: p.displayName,
      isHost: p.isHost,
      hasActed: p.hasActed,
      vote: p.vote,
      role: isEnded ? roomState.result?.finalRoles[p.id] : undefined,
      isReady: p.isReady,
    }));
  }, [roomState?.players, isEnded, roomState?.result]);

  // Other players for night actions
  const otherPlayers = useMemo(() => {
    if (!roomState?.players || !playerId) return [];
    return roomState.players
      .filter((p) => p.id !== playerId)
      .map((p) => ({ id: p.id, displayName: p.displayName }));
  }, [roomState?.players, playerId]);

  // Handlers
  const handleLeave = async () => {
    await leave();
    router.push('/');
  };

  const handleNameSubmit = async () => {
    if (nameInput.trim() && nameInput !== displayName) {
      await updateDisplayName(nameInput.trim());
    }
    setIsEditingName(false);
  };

  const startEditingName = () => {
    setNameInput(displayName);
    setIsEditingName(true);
  };

  const handleStartGame = async () => {
    if (isStarting) return; // Prevent double-click
    setIsStarting(true);
    const result = await startGame();
    if (!result.success) {
      // Reset on error so user can retry
      setIsStarting(false);
    }
    // Don't reset on success - phase will change
  };

  const handleForceAdvanceToDay = async () => {
    if (isAdvancing) return; // Prevent double-click
    setIsAdvancing(true);
    const result = await forceAdvanceToDay();
    if (!result.success) {
      setIsAdvancing(false);
    }
  };

  const handleAdvanceToVoting = async () => {
    console.log('[DEBUG] handleAdvanceToVoting called, isAdvancing:', isAdvancing);
    if (isAdvancing) return; // Prevent double-click
    setIsAdvancing(true);
    console.log('[DEBUG] Calling advanceToVoting server action...');
    const result = await advanceToVoting();
    console.log('[DEBUG] advanceToVoting result:', result);
    if (!result.success) {
      console.log('[DEBUG] advanceToVoting failed, resetting isAdvancing');
      setIsAdvancing(false);
    }
  };

  const handleEndGame = async () => {
    await endGame();
  };

  const handleResetGame = async () => {
    setVotedFor(null);
    setIsStarting(false);
    setIsAdvancing(false);
    await resetGame();
  };

  const handleVote = async (targetId: string) => {
    setVotedFor(targetId);
    await castVote(targetId);
  };

  const handleKickPlayer = async (targetId: string) => {
    await kickPlayer(targetId);
  };

  const handleReadyForNight = async () => {
    if (isSettingReady) return;
    setIsSettingReady(true);
    const result = await setPlayerReadyForNight();
    if (!result.success) {
      setIsSettingReady(false);
    }
    // Don't reset on success - player stays ready
  };

  const handleRoleFlipped = (isFlipped: boolean) => {
    if (isFlipped) {
      setHasSeenRole(true);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Joining room...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !roomState) {
    return (
      <div className={styles.container}>
        <div className={styles.errorState}>
          <h2>⚠️ Error</h2>
          <p>{error}</p>
          <Link href="/" className={styles.errorLink}>
            Back to Lobby
          </Link>
        </div>
      </div>
    );
  }

  // Spectator state - blocked from joining mid-game
  if (isSpectator && joinBlockedReason === 'in_progress') {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <Link href="/" className={styles.backLink}>
            ← Back to Lobby
          </Link>
          <div className={styles.roomCode}>
            <span className={styles.roomLabel}>Room</span>
            <span className={styles.roomId}>{roomId}</span>
          </div>
          <div className={styles.playerName}>
            <span className={styles.spectatorBadge}>👁️ Spectator</span>
          </div>
        </header>
        <main className={styles.main}>
          <div className={styles.spectatorPanel}>
            <h2 className={styles.spectatorTitle}>🎭 Game in Progress</h2>
            <p className={styles.spectatorText}>
              This game has already started. You can watch as a spectator or wait for the next round.
            </p>
            <div className={styles.spectatorInfo}>
              <p><strong>Current Phase:</strong> {roomState?.meta?.status || 'Unknown'}</p>
              <p><strong>Players:</strong> {roomState?.playerCount || 0}</p>
            </div>
            {roomState?.isEnded && (
              <p className={styles.spectatorHint}>
                ✨ The game has ended! You can join when the host starts a new round.
              </p>
            )}
          </div>
        </main>
      </div>
    );
  }

  // Get phase display info
  const getPhaseInfo = () => {
    if (isReveal) return { emoji: '🎭', name: 'Role Reveal' };
    if (isNight) return { emoji: '🌙', name: 'Night Phase' };
    if (isDay) return { emoji: '☀️', name: 'Day Phase - Discussion' };
    if (isVoting) return { emoji: '🗳️', name: 'Voting Phase' };
    if (isEnded) return { emoji: '🏁', name: 'Game Over' };
    return { emoji: '⏳', name: 'Waiting' };
  };

  const phaseInfo = getPhaseInfo();

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <button onClick={handleLeave} className={styles.backLink}>
          ← Leave Room
        </button>
        <div className={styles.roomCode}>
          <span className={styles.roomLabel}>Room</span>
          <span className={styles.roomId}>{roomId}</span>
        </div>
        <div className={styles.playerName}>
          {isEditingName ? (
            <form onSubmit={(e) => { e.preventDefault(); handleNameSubmit(); }} className={styles.nameForm}>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className={styles.nameInput}
                autoFocus
                maxLength={20}
              />
              <button type="submit" className={styles.nameSubmit}>✓</button>
              <button type="button" onClick={() => setIsEditingName(false)} className={styles.nameCancel}>✕</button>
            </form>
          ) : (
            <>
              <span className={styles.nameDisplay}>{displayName}</span>
              {isWaiting && (
                <button onClick={startEditingName} className={styles.editButton}>Edit</button>
              )}
            </>
          )}
        </div>
      </header>

      <main className={styles.main}>
        {/* WAITING PHASE */}
        {isWaiting && (
          <div className={styles.lobby}>
            <div className={styles.lobbyCard}>
              <h2 className={styles.lobbyTitle}>🐺 Werewolf</h2>
              <p className={styles.lobbySubtitle}>
                Waiting for players to join...
              </p>
              
              <div className={styles.lobbyRoomCode}>
                <span className={styles.codeLabel}>Room Code</span>
                <span className={styles.codeValue}>{roomId}</span>
              </div>

              {/* Payment status notification */}
              {paymentStatus === 'success' && (
                <div className={styles.paymentSuccess}>
                  ✅ Payment successful! Premium role unlocked for this game.
                </div>
              )}
              {paymentStatus === 'cancelled' && (
                <div className={styles.paymentCancelled}>
                  ❌ Payment cancelled. You can try again anytime.
                </div>
              )}
              {premiumError && (
                <div className={styles.paymentError}>
                  ❌ {premiumError}
                  <button onClick={clearPremiumError} className={styles.dismissBtn}>Dismiss</button>
                </div>
              )}

              <PlayersList
                players={players}
                currentPlayerId={playerId}
                canKick={isHost}
                onKick={handleKickPlayer}
              />

              {/* Role Selection Panel */}
              <RoleSelector
                selectedRoles={selectedRoles}
                playerCount={players.length}
                isHost={isHost}
                onUpdateRoles={updateSelectedRoles}
                roomId={roomId}
                playerId={playerId || ''}
                isRoleUnlocked={isRoleUnlocked}
                onPurchaseRole={purchaseRole}
                isPurchasing={isPurchasing}
              />

              {isHost && (
                <button
                  className={styles.startButton}
                  onClick={handleStartGame}
                  disabled={!canStart || isStarting}
                >
                  {isStarting ? 'Starting...' : canStart ? 'Start Game' : 
                    players.length < 3 ? `Need ${3 - players.length} more player(s)` :
                    selectedRoles.length > 0 && selectedRoles.length !== players.length + 3 ? 
                      `Roles mismatch (have ${selectedRoles.length}, need ${players.length + 3})` :
                    'Invalid role selection'}
                </button>
              )}

              {!isHost && (
                <p className={styles.minPlayers}>
                  Waiting for host to start the game...
                </p>
              )}
            </div>
          </div>
        )}

        {/* REVEAL PHASE - Players see their roles before night */}
        {isReveal && (
          <div className={styles.gameLayout}>
            <div className={styles.leftPanel}>
              <PlayersList
                players={players}
                currentPlayerId={playerId}
                showReady={true}
              />
            </div>

            <div className={styles.centerPanel}>
              <div className={styles.phaseIndicator}>
                <span className={styles.phaseEmoji}>🎭</span>
                <span className={styles.phaseName}>Role Reveal</span>
              </div>

              <div className={styles.revealContainer}>
                {roomState?.myOriginalRole && (
                  <div className={styles.revealCardWrapper}>
                    <RoleCard
                      role={roomState.myOriginalRole}
                      showAction={true}
                      size="large"
                      initiallyFaceDown={true}
                      onFlip={handleRoleFlipped}
                    />
                  </div>
                )}

                {/* Ready for Night button */}
                <div className={styles.readySection}>
                  {roomState?.currentPlayer?.isReady ? (
                    <div className={styles.readyConfirmed}>
                      <span className={styles.readyCheck}>✓</span>
                      <span>Ready for Night</span>
                      <p className={styles.readyWaiting}>Waiting for other players...</p>
                    </div>
                  ) : (
                    <button
                      className={styles.readyButton}
                      onClick={handleReadyForNight}
                      disabled={isSettingReady || !hasSeenRole}
                    >
                      {isSettingReady ? 'Setting ready...' : 
                       !hasSeenRole ? 'Flip your card first' :
                       "I've Seen My Role - Ready for Night"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* NIGHT PHASE */}
        {isNight && (
          <div className={styles.gameLayout}>
            <div className={styles.leftPanel}>
              <PlayersList
                players={players}
                currentPlayerId={playerId}
                showActions={true}
              />
              
              {/* Night Progress Indicator - Don't show count to avoid revealing roles */}
              <div className={styles.nightProgress}>
                {isNightComplete ? (
                  <div className={styles.progressComplete}>✓ All players ready</div>
                ) : (
                  <div className={styles.progressLabel}>
                    🌙 Night in progress...
                  </div>
                )}
              </div>
              
              {isHost && (
                <div className={styles.hostControls}>
                  <button
                    className={`${styles.hostButton} ${styles.primary}`}
                    onClick={handleForceAdvanceToDay}
                    disabled={isAdvancing}
                    title={isNightComplete ? 'All players have acted' : 'Force advance (some players may not have acted)'}
                  >
                    {isAdvancing ? '...' : isNightComplete ? '☀️ Start Day' : '⏩ Force Day'}
                  </button>
                  <button
                    className={`${styles.hostButton} ${styles.danger}`}
                    onClick={handleEndGame}
                  >
                    End Game
                  </button>
                </div>
              )}
            </div>

            <div className={styles.centerPanel}>
              <div className={styles.phaseIndicator}>
                <span className={styles.phaseEmoji}>🌙</span>
                <span className={styles.phaseName}>Night Phase</span>
              </div>

              <div className={styles.nightContainer}>
                {roomState?.myOriginalRole && (
                  <NightActionPanel
                    role={roomState.myOriginalRole}
                    hasActed={roomState.currentPlayer?.hasActed ?? false}
                    nightResult={roomState.nightActionResult}
                    otherPlayers={otherPlayers}
                    currentPlayerId={playerId}
                    isPerforming={nightPhase.isPerforming}
                    isMyTurn={roomState.isMyTurnToAct}
                    activeNightRole={roomState.activeNightRole}
                    onPerformAction={nightPhase.performAction}
                    onSkip={nightPhase.skip}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* DAY PHASE */}
        {isDay && (
          <div className={styles.gameLayout}>
            <div className={styles.leftPanel}>
              <PlayersList
                players={players}
                currentPlayerId={playerId}
              />

              {timeRemaining !== null && (
                <Timer
                  initialTime={timeRemaining}
                  isRunning={true}
                  label="Discussion Time"
                />
              )}
              
              {isHost && (
                <div className={styles.hostControls}>
                  <button
                    className={`${styles.hostButton} ${styles.primary}`}
                    onClick={handleAdvanceToVoting}
                    disabled={isAdvancing}
                    title={`Current status: ${roomState?.meta?.status || 'unknown'}`}
                  >
                    {isAdvancing ? '...' : 'Start Voting'}
                  </button>
                  <button
                    className={`${styles.hostButton} ${styles.danger}`}
                    onClick={handleEndGame}
                  >
                    End Game
                  </button>
                </div>
              )}
            </div>

            <div className={styles.centerPanel}>
              <div className={styles.phaseIndicator}>
                <span className={styles.phaseEmoji}>☀️</span>
                <span className={styles.phaseName}>Day Phase</span>
              </div>

              <div className={styles.dayContainer}>
                <h2 className={styles.dayTitle}>Discussion Time!</h2>

                {/* Show night action result so player remembers what they learned */}
                {roomState?.nightActionResult && Object.keys(roomState.nightActionResult).length > 0 && (
                  <div className={styles.nightResultReminder}>
                    <h4 className={styles.reminderTitle}>🌙 Your Night Discovery</h4>
                    <NightActionResultSummary result={roomState.nightActionResult} players={players} />
                  </div>
                )}

                <div className={styles.discussionBox}>
                  <h3 className={styles.discussionTitle}>💬 Discussion Tips</h3>
                  <p className={styles.discussionText}>
                    • Ask what roles people claim to be<br />
                    • The Seer and Robber have information<br />
                    • Werewolves will try to blend in<br />
                    • Watch for inconsistencies in stories<br />
                    • Remember: your role may have been swapped!
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VOTING PHASE */}
        {isVoting && (
          <div className={styles.gameLayout}>
            <div className={styles.leftPanel}>
              {timeRemaining !== null && (
                <Timer
                  initialTime={timeRemaining}
                  isRunning={true}
                  label="Voting Time"
                />
              )}
              
              {/* Vote Progress Indicator */}
              <div className={styles.nightProgress}>
                <div className={styles.progressLabel}>
                  Votes: {votedCount}/{voteTotalPlayers}
                </div>
                <div className={styles.progressBar}>
                  <div 
                    className={styles.progressFill}
                    style={{ width: `${voteTotalPlayers > 0 ? (votedCount / voteTotalPlayers) * 100 : 0}%` }}
                  />
                </div>
                {isVotingComplete && (
                  <div className={styles.progressComplete}>✓ All players have voted</div>
                )}
                {!isVotingComplete && votedCount > 0 && (
                  <div className={styles.progressWaiting}>Waiting for {voteTotalPlayers - votedCount} more vote(s)...</div>
                )}
              </div>
              
              {isHost && (
                <div className={styles.hostControls}>
                  <button
                    className={`${styles.hostButton} ${styles.danger}`}
                    onClick={handleEndGame}
                  >
                    End Game
                  </button>
                </div>
              )}
            </div>

            <div className={styles.centerPanel}>
              <div className={styles.phaseIndicator}>
                <span className={styles.phaseEmoji}>🗳️</span>
                <span className={styles.phaseName}>Voting Phase</span>
              </div>

              <div className={styles.votingContainer}>
                <h2 className={styles.votingTitle}>Time to Vote!</h2>
                <p className={styles.votingSubtitle}>
                  Point at who you think is a werewolf. The player with the most votes will be eliminated.
                </p>

                <PlayersList
                  players={players}
                  currentPlayerId={playerId}
                  showVotes={true}
                  canVote={!votedFor && !roomState?.currentPlayer?.vote}
                  onVote={handleVote}
                  votedForId={votedFor || roomState?.currentPlayer?.vote}
                />

                {(votedFor || roomState?.currentPlayer?.vote) ? (
                  <p className={styles.votingConfirmed}>
                    ✓ You voted for {players.find(p => p.id === (votedFor || roomState?.currentPlayer?.vote))?.displayName}
                    {!isVotingComplete && <span className={styles.waitingText}> — Waiting for other players...</span>}
                  </p>
                ) : (
                  <p className={styles.votingHint}>
                    👆 Click on a player above to cast your vote
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ENDED PHASE */}
        {isEnded && roomState?.result && (
          <div className={styles.centerPanel}>
            <GameResult
              result={roomState.result}
              players={players.map(p => ({ id: p.id, displayName: p.displayName }))}
              currentPlayerId={playerId}
              onPlayAgain={handleResetGame}
              isHost={isHost}
            />
          </div>
        )}
      </main>

      {/* Game Roles Footer - Show during reveal, night, day, voting phases */}
      {(isReveal || isNight || isDay || isVoting) && roomState?.gameRoles && roomState.gameRoles.length > 0 && (
        <GameRolesFooter gameRoles={roomState.gameRoles} />
      )}
    </div>
  );
}
