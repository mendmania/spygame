'use client';

/**
 * GameRolesFooter Component
 * 
 * Shows at the bottom of the screen during reveal/night/day/voting phases:
 * - Roles included in the current game with counts
 * - Night action order with highlight for currently active role
 */

import Image from 'next/image';
import type { WerewolfRole } from '@vbz/shared-types';
import { ROLE_CONFIGS, getRoleImagePath } from '../../constants/roles';
import styles from './GameRolesFooter.module.css';

interface GameRolesFooterProps {
  /** All roles used in the game (players + center cards) */
  gameRoles: WerewolfRole[];
}

export function GameRolesFooter({
  gameRoles,
}: GameRolesFooterProps) {
  // Count roles in the game
  const roleCounts: Record<WerewolfRole, number> = {} as Record<WerewolfRole, number>;
  gameRoles.forEach((role) => {
    roleCounts[role] = (roleCounts[role] || 0) + 1;
  });

  // Get unique roles sorted by night order index (playing time)
  const uniqueRoles = [...new Set(gameRoles)].sort((a, b) => {
    const orderA = ROLE_CONFIGS[a].nightOrderIndex ?? 999;
    const orderB = ROLE_CONFIGS[b].nightOrderIndex ?? 999;
    return orderA - orderB;
  });

  return (
    <footer className={styles.footer}>
      {/* Roles in Game - ordered by night action order */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>🎭 Roles in Game</h4>
        <div className={styles.roleChips}>
          {uniqueRoles.map((role) => {
            const config = ROLE_CONFIGS[role];
            const count = roleCounts[role];
            return (
              <div 
                key={role} 
                className={styles.roleChip}
                data-team={config.team}
              >
                <Image
                  src={getRoleImagePath(role)}
                  alt={config.name}
                  width={24}
                  height={24}
                  className={styles.roleImage}
                  unoptimized
                />
                <span className={styles.roleName}>{config.name}</span>
                {count > 1 && <span className={styles.roleCount}>×{count}</span>}
              </div>
            );
          })}
        </div>
      </div>
    </footer>
  );
}
