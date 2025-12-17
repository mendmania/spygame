'use client';

/**
 * GameResult Component
 * 
 * Displays the game result after voting, including:
 * - Winning team
 * - Eliminated player and their role
 * - All players' final roles
 * - Center cards
 */

import Image from 'next/image';
import type { WerewolfGameResult, WerewolfRole } from '@vbz/shared-types';
import { getRoleEmoji, ROLE_CONFIGS, getRoleBackgroundClass, getRoleImagePath } from '../../constants/roles';
import { NightActionHistory } from './NightActionHistory';
import styles from './GameResult.module.css';

interface GameResultProps {
  result: WerewolfGameResult;
  players: Array<{ id: string; displayName: string }>;
  currentPlayerId: string;
  onPlayAgain?: () => void;
  isHost: boolean;
}

export function GameResult({
  result,
  players,
  currentPlayerId,
  onPlayAgain,
  isHost,
}: GameResultProps) {
  const {
    winners,
    eliminatedPlayerId,
    eliminatedPlayerRole,
    finalRoles,
    originalRoles,
    centerCards,
  } = result;

  const getWinnerDisplay = () => {
    switch (winners) {
      case 'village':
        return { text: 'Village Wins!', colorClass: styles.villageWin };
      case 'werewolf':
        return { text: 'Werewolves Win!', colorClass: styles.werewolfWin };
      case 'nobody':
        return { text: 'Nobody Wins!', colorClass: styles.nobodyWin };
      default:
        return { text: 'Game Ended', colorClass: styles.nobodyWin };
    }
  };

  const winnerDisplay = getWinnerDisplay();

  // Determine if current player won
  const currentPlayerFinalRole = finalRoles[currentPlayerId];
  const currentPlayerConfig = currentPlayerFinalRole ? ROLE_CONFIGS[currentPlayerFinalRole] : null;
  const playerWon = currentPlayerConfig && (
    (winners === 'village' && currentPlayerConfig.team === 'village') ||
    (winners === 'werewolf' && currentPlayerConfig.team === 'werewolf')
  );

  return (
    <div className={styles.container}>
      {/* Winner announcement */}
      <div className={styles.winnerSection}>
        {/* Player result first - big and prominent */}
        <h1 className={`${styles.playerResultBig} ${playerWon ? styles.wonText : styles.lostText}`}>
          {playerWon ? 'You Won!' : 'You Lost!'}
        </h1>
        {/* Team that won - secondary */}
        <p className={`${styles.teamResult} ${winnerDisplay.colorClass}`}>
          {winnerDisplay.text}
        </p>
      </div>

      {/* Eliminated player */}
      {eliminatedPlayerId && (
        <div className={styles.eliminatedSection}>
          <h3 className={styles.sectionTitle}>Eliminated</h3>
          <div className={styles.eliminatedPlayer}>
            <div className={styles.eliminatedImage}>
              {eliminatedPlayerRole ? (
                <Image
                  src={getRoleImagePath(eliminatedPlayerRole)}
                  alt={ROLE_CONFIGS[eliminatedPlayerRole].name}
                  width={48}
                  height={48}
                  className={styles.roleImage}
                  unoptimized
                />
              ) : (
                <span className={styles.unknownRole}>?</span>
              )}
            </div>
            <div className={styles.eliminatedInfo}>
              <span className={styles.eliminatedName}>
                {players.find((p) => p.id === eliminatedPlayerId)?.displayName || 'Unknown'}
              </span>
              <span className={styles.eliminatedRole}>
                {eliminatedPlayerRole ? ROLE_CONFIGS[eliminatedPlayerRole].name : 'Unknown'}
              </span>
            </div>
          </div>
        </div>
      )}

      {!eliminatedPlayerId && (
        <div className={styles.noEliminationSection}>
          <p>No one was eliminated (tie vote)</p>
        </div>
      )}

      {/* All players' roles */}
      <div className={styles.rolesSection}>
        <h3 className={styles.sectionTitle}>Final Roles</h3>
        <div className={styles.rolesList}>
          {players.map((player) => {
            const finalRole = finalRoles[player.id];
            const originalRole = originalRoles[player.id];
            const wasSwapped = finalRole !== originalRole;
            const config = finalRole ? ROLE_CONFIGS[finalRole] : null;
            const isCurrentPlayer = player.id === currentPlayerId;

            return (
              <div
                key={player.id}
                className={`${styles.playerRole} ${isCurrentPlayer ? styles.currentPlayer : ''}`}
              >
                <div className={styles.roleImageWrapper}>
                  {finalRole ? (
                    <Image
                      src={getRoleImagePath(finalRole)}
                      alt={config?.name || 'Unknown'}
                      width={36}
                      height={36}
                      className={styles.roleImage}
                      unoptimized
                    />
                  ) : (
                    <span className={styles.unknownRole}>?</span>
                  )}
                </div>
                <div className={styles.roleInfo}>
                  <span className={styles.playerName}>
                    {player.displayName}
                    {isCurrentPlayer && ' (You)'}
                  </span>
                  <span className={styles.roleName}>
                    {config?.name || 'Unknown'}
                    {wasSwapped && (
                      <span className={styles.swapped}>
                        {' '}← was {originalRole ? ROLE_CONFIGS[originalRole].name : 'Unknown'}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Center cards */}
      <div className={styles.centerSection}>
        <h3 className={styles.sectionTitle}>Center Cards</h3>
        <div className={styles.centerCards}>
          {centerCards && (
            <>
              <CenterCard role={centerCards.card1} index={1} />
              <CenterCard role={centerCards.card2} index={2} />
              <CenterCard role={centerCards.card3} index={3} />
            </>
          )}
        </div>
      </div>

      {/* Night Action History */}
      {result.nightActions && Object.keys(result.nightActions).length > 0 && (
        <NightActionHistory
          nightActions={result.nightActions}
          players={players}
          originalRoles={originalRoles}
        />
      )}

      {/* Play again button */}
      {isHost && onPlayAgain && (
        <button className={styles.playAgainButton} onClick={onPlayAgain}>
          Play Again
        </button>
      )}
      {!isHost && (
        <p className={styles.waitingText}>Waiting for host to start new game...</p>
      )}
    </div>
  );
}

function CenterCard({ role, index }: { role: WerewolfRole; index: number }) {
  const config = ROLE_CONFIGS[role];
  const imagePath = getRoleImagePath(role);

  return (
    <div className={styles.centerCard}>
      <div className={styles.centerCardImage}>
        <Image
          src={imagePath}
          alt={config.name}
          width={40}
          height={40}
          className={styles.roleImage}
          unoptimized
        />
      </div>
      <span className={styles.centerCardName}>{config.name}</span>
    </div>
  );
}
