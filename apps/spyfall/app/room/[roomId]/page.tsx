'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { GameCard, Timer, PlayersList, LocationsGrid, Player, CategorySelector, CustomLocationsEditor } from '../../../components/game';
import { SPY_LOCATIONS } from '../../../constants/locations';
import { getCategoryItems, CATEGORY_PACKS } from '../../../constants/categories';
import { useSpyfallRoom, usePremiumFeatures } from '../../../hooks';
import type { SpyfallCategory, SpyfallLocation, SpyfallGameSettings } from '@vbz/shared-types';
import styles from './page.module.css';

interface RoomPageProps {
  params: { roomId: string };
}

export default function RoomPage({ params }: RoomPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
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
    gameSettings,
    updateGameSettings,
  } = useSpyfallRoom({ roomId, autoJoin: true });

  // Premium features hook
  const {
    isFeatureUnlocked,
    purchaseFeature,
    isPurchasing,
    error: premiumError,
    clearError: clearPremiumError,
  } = usePremiumFeatures({
    roomId,
    playerId: playerId || '',
  });
  
  // Game state
  const isPlaying = roomState?.isPlaying ?? false;
  const isFinished = roomState?.isFinished ?? false;
  const gameData = roomState?.currentPlayerGameData;
  
  // Debug: Log game state changes
  console.log('[GameState]', { 
    isPlaying, 
    isFinished, 
    isHost,
    canStart,
    playerCount: roomState?.playerCount,
    status: roomState?.meta?.status,
    hasGameData: !!gameData,
    state: roomState?.state,
    timeRemaining,
  });
  
  // Local state
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<SpyfallCategory>('locations');
  const [customLocations, setCustomLocations] = useState<SpyfallLocation[]>([]);
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'cancelled' | null>(null);

  // Handle payment redirect status
  useEffect(() => {
    const payment = searchParams.get('payment');
    const sessionId = searchParams.get('session_id');
    
    if (payment === 'success' && sessionId) {
      setPaymentStatus('success');
      
      // Verify payment and unlock the feature
      fetch('/api/stripe/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            console.log('Payment verified and feature unlocked:', data.feature);
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

  // Sync category from room settings when game is active
  // Use specific values as dependencies to properly detect changes
  const settingsCategory = gameSettings?.category;
  const settingsCustomLocations = gameSettings?.customLocations;
  
  // When game settings are cleared (game reset), reset local state to defaults
  useEffect(() => {
    if (settingsCategory) {
      setSelectedCategory(settingsCategory);
    } else if (gameSettings === null) {
      // Game was reset - go back to default category
      setSelectedCategory('locations');
    }
  }, [settingsCategory, gameSettings]);
  
  useEffect(() => {
    if (settingsCustomLocations && settingsCustomLocations.length > 0) {
      setCustomLocations(settingsCustomLocations);
    } else if (gameSettings === null) {
      // Game was reset - clear custom locations
      setCustomLocations([]);
    }
  }, [settingsCustomLocations, gameSettings]);

  // Get the current locations to display based on category
  // Use gameSettings.category when game is active, otherwise use local selectedCategory
  const currentLocations = useMemo(() => {
    const effectiveCategory = settingsCategory ?? selectedCategory;
    if (effectiveCategory === 'custom') {
      // Use custom locations from gameSettings if available, otherwise local state
      return settingsCustomLocations || customLocations;
    }
    return getCategoryItems(effectiveCategory);
  }, [settingsCategory, settingsCustomLocations, selectedCategory, customLocations]);

  // Get category label for the game card
  const categoryLabel = useMemo(() => {
    const labels: Record<SpyfallCategory, string> = {
      locations: 'LOCATION',
      animals: 'ANIMAL',
      foods: 'FOOD',
      custom: 'ITEM',
    };
    const effectiveCategory = settingsCategory ?? selectedCategory;
    return labels[effectiveCategory] || 'LOCATION';
  }, [settingsCategory, selectedCategory]);

  // Get category info for the grid panel
  const categoryGridInfo = useMemo(() => {
    const effectiveCategory = settingsCategory ?? selectedCategory;
    const pack = CATEGORY_PACKS[effectiveCategory];
    return {
      label: pack?.name || 'Locations',
      emoji: pack?.emoji || '📍',
    };
  }, [settingsCategory, selectedCategory]);

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
    const settings: Partial<SpyfallGameSettings> = {
      category: selectedCategory,
      gameDurationSeconds: 480,
    };
    if (selectedCategory === 'custom') {
      settings.customLocations = customLocations;
    }
    console.log('[StartGame] Starting with settings:', settings);
    const result = await startGame(settings);
    console.log('[StartGame] Result:', result);
    if (!result.success) {
      console.error('[StartGame] Failed:', result.error);
    }
    setIsStarting(false);
  };

  // Handle category change (host only) - just update local state
  // Settings are sent to server when starting the game
  const handleCategoryChange = (category: SpyfallCategory) => {
    setSelectedCategory(category);
  };

  // Handle custom locations change (host only) - just update local state
  // Settings are sent to server when starting the game
  const handleCustomLocationsChange = (locations: SpyfallLocation[]) => {
    setCustomLocations(locations);
  };

  // Handle purchase custom category
  const handlePurchaseCustom = async () => {
    await purchaseFeature('custom_category');
  };

  // Check if custom category can be started (just need 5 items with names, no roles required)
  const canStartCustom = selectedCategory !== 'custom' || customLocations.filter(
    loc => loc.name.trim()
  ).length >= 5;

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
                
                {/* GameCard - receives data via props only */}
                <GameCard 
                  location={gameData?.location ?? undefined}
                  role={gameData?.role} // null for categories without roles (animals, custom)
                  isSpy={gameData?.isSpy ?? false}
                  categoryLabel={categoryLabel}
                />
              </div>

              {/* Right Panel - Locations */}
              <aside className={styles.rightPanel}>
                <LocationsGrid 
                  locations={currentLocations.length > 0 ? currentLocations : SPY_LOCATIONS}
                  categoryLabel={categoryGridInfo.label}
                  categoryEmoji={categoryGridInfo.emoji}
                />
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

              {/* Payment Status Toast */}
              {paymentStatus === 'success' && (
                <div className={styles.paymentSuccess}>
                  ✓ Payment successful! Custom mode unlocked.
                </div>
              )}
              {paymentStatus === 'cancelled' && (
                <div className={styles.paymentCancelled}>
                  Payment cancelled. You can try again.
                </div>
              )}

              {/* Category Selector - Only visible to host */}
              {isHost && (
                <CategorySelector
                  selectedCategory={selectedCategory}
                  onSelectCategory={handleCategoryChange}
                  isCustomUnlocked={isFeatureUnlocked('custom_category')}
                  onPurchaseCustom={handlePurchaseCustom}
                  isPurchasing={isPurchasing}
                  disabled={isStarting}
                />
              )}

              {/* Show selected category to non-host players */}
              {!isHost && selectedCategory && (
                <div className={styles.selectedCategoryInfo}>
                  <span className={styles.categoryLabel}>Game Mode:</span>
                  <span className={styles.categoryValue}>
                    {CATEGORY_PACKS[selectedCategory].emoji} {CATEGORY_PACKS[selectedCategory].name}
                  </span>
                </div>
              )}

              {/* Custom Locations Editor - Only when custom is selected */}
              {/* TEMP: Bypassed premium check for testing - was: isFeatureUnlocked('custom_category') */}
              {isHost && selectedCategory === 'custom' && (
                <CustomLocationsEditor
                  locations={customLocations}
                  onLocationsChange={handleCustomLocationsChange}
                  disabled={isStarting}
                  minItems={5}
                />
              )}

              {isHost && (
                <button 
                  className={`${styles.startButton} ${(!canStart || isStarting || !canStartCustom) ? styles.startButtonDisabled : ''}`}
                  disabled={!canStart || isStarting || !canStartCustom}
                  onClick={handleStartGame}
                >
                  {isStarting 
                    ? 'Starting...' 
                    : !canStart 
                      ? `Need ${3 - (roomState?.playerCount ?? 0)} more players`
                      : !canStartCustom
                        ? 'Add more custom items'
                        : 'Start Game'
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
              {premiumError && (
                <p className={styles.errorMessage}>{premiumError}</p>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Mobile Locations - Shown below on small screens */}
      {(isPlaying || isFinished) && (
        <div className={styles.mobileLocations}>
          <LocationsGrid locations={currentLocations.length > 0 ? currentLocations : SPY_LOCATIONS} />
        </div>
      )}
    </div>
  );
}
