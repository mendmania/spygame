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

import type { WerewolfGameResult, WerewolfRole } from '@vbz/shared-types';
import { getRoleEmoji, ROLE_CONFIGS, getRoleBackgroundClass } from '../../constants/roles';
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
        return { emoji: '🏘️', text: 'Village Wins!', color: 'text-blue-400' };
      case 'werewolf':
        return { emoji: '🐺', text: 'Werewolves Win!', color: 'text-red-500' };
      case 'nobody':
        return { emoji: '💀', text: 'Nobody Wins!', color: 'text-gray-400' };
      default:
        return { emoji: '❓', text: 'Game Ended', color: 'text-gray-400' };
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
        <span className={styles.winnerEmoji}>{winnerDisplay.emoji}</span>
        <h2 className={`${styles.winnerText} ${winnerDisplay.color}`}>
          {winnerDisplay.text}
        </h2>
        {playerWon !== null && (
          <p className={styles.playerResult}>
            {playerWon ? '🎉 You won!' : '😢 Better luck next time!'}
          </p>
        )}
      </div>

      {/* Eliminated player */}
      {eliminatedPlayerId && (
        <div className={styles.eliminatedSection}>
          <h3 className={styles.sectionTitle}>Eliminated</h3>
          <div className={styles.eliminatedPlayer}>
            <span className={styles.eliminatedEmoji}>
              {eliminatedPlayerRole ? getRoleEmoji(eliminatedPlayerRole) : '❓'}
            </span>
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
                <span className={styles.roleEmoji}>
                  {finalRole ? getRoleEmoji(finalRole) : '❓'}
                </span>
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
  const emoji = getRoleEmoji(role);

  return (
    <div className={styles.centerCard}>
      <span className={styles.centerCardEmoji}>{emoji}</span>
      <span className={styles.centerCardName}>{config.name}</span>
    </div>
  );
}
