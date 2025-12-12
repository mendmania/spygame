'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GameCard, Timer, PlayersList, LocationsGrid, Player } from '../../../components/game';
import { SPY_LOCATIONS } from '../../../constants/locations';
import { useSpyfallRoom } from '../../../hooks/useSpyfallRoom';
import styles from './page.module.css';

interface RoomPageProps {
  params: { roomId: string };
}

export default function RoomPage({ params }: RoomPageProps) {
  const router = useRouter();
  const roomId = params.roomId.toUpperCase();
  
  // Realtime room subscription with auto-join
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
    startGame,
    endGame,
    resetGame,
    kickPlayer,
    timeRemaining,
  } = useSpyfallRoom({ roomId, autoJoin: true });
  
  // Game state
  const isPlaying = roomState?.isPlaying ?? false;
  const isFinished = roomState?.isFinished ?? false;
  const gameData = roomState?.currentPlayerGameData;
  
  // Debug: Log when isHost changes
  console.log('[GameState]', { isPlaying, isFinished, isHost, hasGameData: !!gameData });
  
  // Editable display name
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [isStarting, setIsStarting] = useState(false);

  // Transform realtime players to PlayersList format
  const players: Player[] = useMemo(() => {
    if (!roomState?.players) {
      console.log('[players] No roomState.players:', { hasRoomState: !!roomState, status: roomState?.meta?.status });
      return [];
    }
    console.log('[players] Got players:', roomState.players.length, 'status:', roomState?.meta?.status);
    return roomState.players.map((p) => ({
      id: p.id,
      username: p.displayName,
      isAdmin: p.isHost,
      // Show spy indicator only when game is finished and this player is the spy
      isSpy: isFinished && roomState.revealedSpyId === p.id,
    }));
  }, [roomState?.players, isFinished, roomState?.revealedSpyId, roomState?.meta?.status, roomState]);

  // Handle leaving room
  const handleLeave = async () => {
    await leave();
    router.push('/');
  };

  // Handle name editing
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

  // Handle start game
  const handleStartGame = async () => {
    setIsStarting(true);
    await startGame();
    setIsStarting(false);
  };

  // Handle end game (host only)
  const handleEndGame = async () => {
    await endGame();
  };

  // Handle reset game (host only, after game ends)
  const handleResetGame = async () => {
    await resetGame();
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

  // Spectator view - someone joined while game is in progress
  if (isSpectator) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <Link href="/" className={styles.backLink}>
            ← Leave Room
          </Link>
          <div className={styles.roomCode}>
            <span className={styles.roomLabel}>Room</span>
            <span className={styles.roomId}>{roomId}</span>
          </div>
          <div className={styles.playerName}>
            <span className={styles.nameDisplay}>{displayName} 👁️</span>
          </div>
        </header>
        
        <main className={styles.main}>
          <div className={styles.lobby}>
            <div className={styles.lobbyCard}>
              <h2 className={styles.lobbyTitle}>👁️ Spectating</h2>
              <p className={styles.lobbySubtitle}>
                A game is currently in progress. You'll be able to play in the next round!
              </p>
              
              <div className={styles.spectatorInfo}>
                <p><strong>{roomState?.playerCount ?? 0}</strong> players in game</p>
                {roomState?.isPlaying && timeRemaining !== null && (
                  <p>Time remaining: <strong>{Math.floor(timeRemaining / 60)}:{String(timeRemaining % 60).padStart(2, '0')}</strong></p>
                )}
                {roomState?.isFinished && (
                  <p className={styles.spectatorStatus}>🎉 Round finished! Waiting for host to start new game...</p>
                )}
              </div>
              
              <p className={styles.minPlayers}>
                Stay on this page - you'll automatically join when the next game starts.
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Error state - distinguish between "blocked from joining" vs "room error"
  if (error && !roomState) {
    // Check if this is a "game in progress" block
    const isGameInProgress = error.includes('in progress') || error.includes('next round');
    
    return (
      <div className={styles.container}>
        <div className={styles.errorState}>
          <h2>{isGameInProgress ? '🎮 Game In Progress' : '⚠️ Error'}</h2>
          <p>{error}</p>
          {isGameInProgress && (
            <p className={styles.errorSubtext}>
              You can join when the current round ends.
            </p>
          )}
          <Link href="/" className={styles.errorLink}>
            Back to Lobby
          </Link>
        </div>
      </div>
    );
  }

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
              <button type="submit" className={styles.nameSaveBtn}>✓</button>
            </form>
          ) : (
            <button onClick={startEditingName} className={styles.nameDisplay}>
              {displayName} ✏️
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className={styles.main}>
        {isPlaying || isFinished ? (
          <>
            {/* Game In Progress or Finished */}
            <div className={styles.gameLayout}>
              {/* Left Panel - Players */}
              <aside className={styles.leftPanel}>
                <PlayersList 
                  players={players} 
                  currentPlayerId={playerId}
                  showSpyIndicator={isFinished} // Show spy indicator when game ends
                />
                
                {/* Host controls */}
                {isHost && isPlaying && (
                  <button 
                    onClick={handleEndGame}
                    className={styles.endGameButton}
                  >
                    End Game Early
                  </button>
                )}
                
                {isHost && isFinished && (
                  <button 
                    onClick={handleResetGame}
                    className={styles.resetButton}
                  >
                    Play Again
                  </button>
                )}
              </aside>

              {/* Center - Game Card */}
              <div className={styles.centerPanel}>
                {/* Timer - only shown during active game, hidden when finished */}
                {isPlaying && (
                  <Timer 
                    initialTime={timeRemaining ?? 0} 
                    isRunning={isPlaying}
                  />
                )}
                
                {/* Game finished banner - only show "Time's Up" if timer actually expired */}
                {isFinished && (
                  <div className={styles.gameEndBanner}>
                    {(timeRemaining === 0 || timeRemaining === null) && <h2>Time's Up!</h2>}
                    <p>The spy was: <strong>
                      {players.find(p => p.id === roomState?.revealedSpyId)?.username ?? 'Unknown'}
                    </strong></p>
                  </div>
                )}
                
                {/* GameCard - receives data via props only (UNCHANGED) */}
                <GameCard 
                  location={gameData?.location ?? undefined}
                  role={gameData?.role ?? undefined}
                  isSpy={gameData?.isSpy ?? false}
                />
              </div>

              {/* Right Panel - Locations */}
              <aside className={styles.rightPanel}>
                <LocationsGrid locations={SPY_LOCATIONS} />
              </aside>
            </div>
          </>
        ) : (
          /* Lobby - Waiting for players */
          <div className={styles.lobby}>
            <div className={styles.lobbyCard}>
              <h2 className={styles.lobbyTitle}>Waiting for Players</h2>
              <p className={styles.lobbySubtitle}>Share the room code to invite friends</p>
              
              <div className={styles.lobbyRoomCode}>
                <span className={styles.codeLabel}>Room Code</span>
                <span className={styles.codeValue}>{roomId}</span>
              </div>

              <PlayersList 
                players={players} 
                currentPlayerId={playerId}
                canKick={isHost}
                onKick={kickPlayer}
              />

              {isHost && (
                <button 
                  className={`${styles.startButton} ${!canStart || isStarting ? styles.startButtonDisabled : ''}`}
                  disabled={!canStart || isStarting}
                  onClick={handleStartGame}
                >
                  {isStarting 
                    ? 'Starting...' 
                    : canStart 
                      ? 'Start Game' 
                      : `Need ${3 - (roomState?.playerCount ?? 0)} more players`
                  }
                </button>
              )}
              
              {!isHost && (
                <p className={styles.waitingForHost}>Waiting for host to start...</p>
              )}
              
              <p className={styles.minPlayers}>
                {roomState?.playerCount ?? 0} player{(roomState?.playerCount ?? 0) !== 1 ? 's' : ''} in room
                {!canStart && ' • Minimum 3 players required'}
              </p>
              
              {error && (
                <p className={styles.errorMessage}>{error}</p>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Mobile Locations - Shown below on small screens */}
      {(isPlaying || isFinished) && (
        <div className={styles.mobileLocations}>
          <LocationsGrid locations={SPY_LOCATIONS} />
        </div>
      )}
    </div>
  );
}
