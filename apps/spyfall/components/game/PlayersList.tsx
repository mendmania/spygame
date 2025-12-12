'use client';

import styles from './PlayersList.module.css';

export interface Player {
  id: string;
  username: string;
  isAdmin?: boolean;
  isSpy?: boolean;
}

interface PlayersListProps {
  players: Player[];
  currentPlayerId?: string;
  showSpyIndicator?: boolean;
  canKick?: boolean;
  onKick?: (playerId: string) => void;
}

export function PlayersList({ 
  players, 
  currentPlayerId, 
  showSpyIndicator = false,
  canKick = false,
  onKick,
}: PlayersListProps) {
  return (
    <div className={styles.container}>
      <h3 className={styles.title}>
        <span className={styles.titleIcon}>👥</span>
        Players ({players.length})
      </h3>
      <ul className={styles.list}>
        {players.map((player, index) => (
          <li 
            key={player.id} 
            className={`${styles.player} ${player.id === currentPlayerId ? styles.currentPlayer : ''}`}
          >
            <span className={styles.index}>{index + 1}</span>
            <span className={styles.username}>
              {player.username}
              {player.isAdmin && <span className={styles.adminBadge}>👑</span>}
            </span>
            {showSpyIndicator && player.isSpy && (
              <span className={styles.spyBadge}>🕵️</span>
            )}
            {canKick && !player.isAdmin && player.id !== currentPlayerId && onKick && (
              <button 
                className={styles.kickButton}
                onClick={() => onKick(player.id)}
                title={`Remove ${player.username}`}
              >
                ✕
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
