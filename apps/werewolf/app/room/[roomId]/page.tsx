'use client';

/**
 * Werewolf Room Page
 * 
 * Main game room page handling all phases:
 * - Waiting: Lobby with player list and start button
 * - Night: Private role actions
 * - Day: Discussion phase with timer
 * - Voting: Vote selection with timer
 * - Ended: Results display
 */

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useWerewolfRoom, useCurrentPlayerRole, useNightPhase } from '../../../hooks';
import {
  RoleCard,
  PlayersList,
  Timer,
  NightActionPanel,
  GameResult,
  RoleSelector,
  type WerewolfPlayerDisplay,
} from '../../../components/game';
import { getRoleEmoji } from '../../../constants/roles';
import styles from './page.module.css';

interface RoomPageProps {
  params: { roomId: string };
}

export default function RoomPage({ params }: RoomPageProps) {
  const router = useRouter();
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
    isWaiting,
    isNight,
    isDay,
    isVoting,
    isEnded,
    nightActedCount,
    nightTotalPlayers,
    isNightComplete,
    timeRemaining,
    selectedRoles,
    updateSelectedRoles,
  } = useWerewolfRoom({ roomId, autoJoin: true });

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

        {/* NIGHT PHASE */}
        {isNight && (
          <div className={styles.gameLayout}>
            <div className={styles.leftPanel}>
              <PlayersList
                players={players}
                currentPlayerId={playerId}
                showActions={true}
              />
              
              {/* Night Progress Indicator */}
              <div className={styles.nightProgress}>
                {/* Currently acting role indicator */}
                {roomState?.activeNightRole && (
                  <div className={styles.activeRoleIndicator}>
                    <span className={styles.activeRoleLabel}>Currently Acting:</span>
                    <span className={styles.activeRoleName}>
                      {getRoleEmoji(roomState.activeNightRole)} {roomState.activeNightRole.charAt(0).toUpperCase() + roomState.activeNightRole.slice(1)}
                    </span>
                  </div>
                )}
                <div className={styles.progressLabel}>
                  Night Actions: {nightActedCount}/{nightTotalPlayers}
                </div>
                <div className={styles.progressBar}>
                  <div 
                    className={styles.progressFill}
                    style={{ width: `${nightTotalPlayers > 0 ? (nightActedCount / nightTotalPlayers) * 100 : 0}%` }}
                  />
                </div>
                {isNightComplete && (
                  <div className={styles.progressComplete}>✓ All players ready</div>
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
                <h2 className={styles.nightTitle}>Close your eyes...</h2>
                <p className={styles.nightSubtitle}>
                  Each role takes their action in secret
                </p>

                {roomState?.myOriginalRole && (
                  <div className={styles.roleReveal}>
                    <span className={styles.roleLabel}>Your Role</span>
                    <RoleCard
                      role={roomState.myOriginalRole}
                      showAction={true}
                      size="medium"
                    />
                  </div>
                )}

                {roomState?.myOriginalRole && (
                  <NightActionPanel
                    role={roomState.myOriginalRole}
                    hasActed={roomState.currentPlayer?.hasActed ?? false}
                    nightResult={roomState.nightActionResult}
                    otherPlayers={otherPlayers}
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
                <p className={styles.daySubtitle}>
                  Talk to each other and figure out who the werewolves are
                </p>

                {roomState?.myCurrentRole && (
                  <div className={styles.roleReveal}>
                    <span className={styles.roleLabel}>
                      Your Current Role {roleInfo.wasSwapped && '(Swapped!)'}
                    </span>
                    <RoleCard
                      role={roomState.myCurrentRole}
                      isOriginal={!roleInfo.wasSwapped}
                      size="medium"
                    />
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

                {(votedFor || roomState?.currentPlayer?.vote) && (
                  <p className={styles.votingSubtitle}>
                    ✓ You voted for {players.find(p => p.id === (votedFor || roomState?.currentPlayer?.vote))?.displayName}
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
    </div>
  );
}
