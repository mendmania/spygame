'use client';

/**
 * PlayersList Component
 * 
 * Displays list of players with their status (host, voted, etc.)
 * Different display modes for different game phases.
 */

import styles from './PlayersList.module.css';

export interface WerewolfPlayerDisplay {
  id: string;
  displayName: string;
  isHost?: boolean;
  hasActed?: boolean;
  vote?: string | null;
  role?: string; // Only shown in end phase
}

interface PlayersListProps {
  players: WerewolfPlayerDisplay[];
  currentPlayerId?: string;
  showVotes?: boolean;
  showRoles?: boolean;
  showActions?: boolean;
  canKick?: boolean;
  canVote?: boolean;
  onKick?: (playerId: string) => void;
  onVote?: (playerId: string) => void;
  votedForId?: string | null;
  highlightedPlayers?: string[]; // For showing werewolves to each other, etc.
}

export function PlayersList({
  players,
  currentPlayerId,
  showVotes = false,
  showRoles = false,
  showActions = false,
  canKick = false,
  canVote = false,
  onKick,
  onVote,
  votedForId,
  highlightedPlayers = [],
}: PlayersListProps) {
  // Count votes for each player
  const voteCounts: Record<string, number> = {};
  if (showVotes) {
    players.forEach((p) => {
      if (p.vote) {
        voteCounts[p.vote] = (voteCounts[p.vote] || 0) + 1;
      }
    });
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>
        <span className={styles.titleIcon}>👥</span>
        Players ({players.length})
      </h3>
      <ul className={styles.list}>
        {players.map((player, index) => {
          const isCurrentPlayer = player.id === currentPlayerId;
          const isHighlighted = highlightedPlayers.includes(player.id);
          const isVotedFor = player.id === votedForId;
          const voteCount = voteCounts[player.id] || 0;

          return (
            <li
              key={player.id}
              className={`
                ${styles.player}
                ${isCurrentPlayer ? styles.currentPlayer : ''}
                ${isHighlighted ? styles.highlighted : ''}
                ${isVotedFor ? styles.votedFor : ''}
              `}
            >
              <span className={styles.index}>{index + 1}</span>
              <span className={styles.username}>
                {player.displayName}
                {isCurrentPlayer && <span className={styles.youBadge}>(You)</span>}
                {player.isHost && <span className={styles.adminBadge}>👑</span>}
              </span>
              
              {/* Show action status during night */}
              {showActions && (
                <span className={styles.actionStatus}>
                  {player.hasActed ? '✓' : '⏳'}
                </span>
              )}

              {/* Show role in end phase */}
              {showRoles && player.role && (
                <span className={styles.roleBadge}>{player.role}</span>
              )}

              {/* Show vote count */}
              {showVotes && voteCount > 0 && (
                <span className={styles.voteCount}>🗳️ {voteCount}</span>
              )}

              {/* Kick button */}
              {canKick && !player.isHost && !isCurrentPlayer && onKick && (
                <button
                  className={styles.kickButton}
                  onClick={() => onKick(player.id)}
                  title={`Remove ${player.displayName}`}
                >
                  ✕
                </button>
              )}

              {/* Vote button */}
              {canVote && !isCurrentPlayer && onVote && (
                <button
                  className={`${styles.voteButton} ${isVotedFor ? styles.voted : ''}`}
                  onClick={() => onVote(player.id)}
                  disabled={isVotedFor}
                >
                  {isVotedFor ? '✓ Voted' : 'Vote'}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
