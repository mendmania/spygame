'use client';

/**
 * RoleCard Component
 * 
 * Displays the player's role with appropriate styling and information.
 * Shows different states based on game phase.
 */

import type { WerewolfRole, WerewolfRoleConfig } from '@vbz/shared-types';
import { getRoleEmoji, ROLE_CONFIGS, getRoleBackgroundClass } from '../../constants/roles';
import styles from './RoleCard.module.css';

interface RoleCardProps {
  role: WerewolfRole;
  isRevealed?: boolean;
  isOriginal?: boolean;
  showAction?: boolean;
  size?: 'small' | 'medium' | 'large';
  onClick?: () => void;
}

export function RoleCard({
  role,
  isRevealed = true,
  isOriginal = true,
  showAction = false,
  size = 'medium',
  onClick,
}: RoleCardProps) {
  const config = ROLE_CONFIGS[role];
  const emoji = getRoleEmoji(role);
  const bgClass = getRoleBackgroundClass(role);

  if (!isRevealed) {
    return (
      <div
        className={`${styles.card} ${styles[size]} ${styles.hidden}`}
        onClick={onClick}
      >
        <div className={styles.hiddenContent}>
          <span className={styles.hiddenIcon}>🎴</span>
          <span className={styles.hiddenText}>Hidden</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${styles.card} ${styles[size]} ${bgClass}`}
      onClick={onClick}
    >
      <div className={styles.emoji}>{emoji}</div>
      <h3 className={styles.roleName}>{config.name}</h3>
      {!isOriginal && (
        <span className={styles.swappedBadge}>Swapped!</span>
      )}
      {showAction && config.actionDescription && (
        <p className={styles.actionDescription}>{config.actionDescription}</p>
      )}
      <p className={styles.description}>{config.description}</p>
      <div className={styles.teamBadge}>
        {config.team === 'werewolf' ? '🐺 Werewolf Team' : '🏘️ Village Team'}
      </div>
    </div>
  );
}
