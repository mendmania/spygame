'use client';

/**
 * NightActionHistory Component
 * 
 * Displays the night action history in a timeline format
 * showing what each player did during their night turn.
 */

import Image from 'next/image';
import type { WerewolfNightActionsMap, WerewolfRole, WerewolfNightAction } from '@vbz/shared-types';
import { ROLE_CONFIGS, getRoleImagePath } from '../../constants/roles';
import styles from './NightActionHistory.module.css';

interface NightActionHistoryProps {
  nightActions: WerewolfNightActionsMap;
  players: Array<{ id: string; displayName: string }>;
  originalRoles: Record<string, WerewolfRole>;
}

export function NightActionHistory({
  nightActions,
  players,
  originalRoles,
}: NightActionHistoryProps) {
  const getPlayerName = (id: string) => 
    players.find(p => p.id === id)?.displayName || 'Unknown';

  // Sort actions by night order (role order)
  const sortedActions = Object.entries(nightActions)
    .map(([id, action]) => {
      // Use the key as playerId, but action may also have playerId - prefer the key
      return { ...action, playerId: id };
    })
    .sort((a, b) => {
      const orderA = ROLE_CONFIGS[a.role]?.nightOrderIndex ?? 999;
      const orderB = ROLE_CONFIGS[b.role]?.nightOrderIndex ?? 999;
      return orderA - orderB;
    });

  // Group actions by role (for roles like werewolf/mason that act together)
  const groupedByRole: Record<string, Array<typeof sortedActions[0]>> = {};
  sortedActions.forEach(action => {
    if (!groupedByRole[action.role]) {
      groupedByRole[action.role] = [];
    }
    groupedByRole[action.role].push(action);
  });

  // Get unique roles in order
  const rolesInOrder = [...new Set(sortedActions.map(a => a.role))].sort((a, b) => {
    const orderA = ROLE_CONFIGS[a]?.nightOrderIndex ?? 999;
    const orderB = ROLE_CONFIGS[b]?.nightOrderIndex ?? 999;
    return orderA - orderB;
  });

  const getActionDescription = (action: typeof sortedActions[0]): string => {
    const result = action.result;
    if (!result) return 'No action taken';
    if (result.skipped) return 'Skipped their action';

    switch (action.role) {
      case 'werewolf':
        if (result.otherWerewolves && result.otherWerewolves.length > 0) {
          return `Saw fellow werewolf(s): ${result.otherWerewolves.map(getPlayerName).join(', ')}`;
        }
        if (result.isLoneWolf && result.centerCardSeen) {
          return `Lone wolf - peeked at center card: ${ROLE_CONFIGS[result.centerCardSeen]?.name || result.centerCardSeen}`;
        }
        if (result.isLoneWolf) {
          return 'Lone wolf - no other werewolves';
        }
        return 'Saw fellow werewolves';

      case 'minion':
        if (result.werewolvesSeen && result.werewolvesSeen.length > 0) {
          return `Saw werewolf(s): ${result.werewolvesSeen.map(getPlayerName).join(', ')}`;
        }
        return 'No werewolves in the game';

      case 'mason':
        if (result.otherMason) {
          return `Saw fellow Mason: ${getPlayerName(result.otherMason)}`;
        }
        return 'No other Mason';

      case 'seer':
        if (result.playerRoleSeen) {
          return `Looked at ${getPlayerName(result.playerRoleSeen.playerId)}'s card: ${ROLE_CONFIGS[result.playerRoleSeen.role]?.name}`;
        }
        if (result.centerCardsSeen && result.centerCardsSeen.length > 0) {
          return `Looked at center cards: ${result.centerCardsSeen.map(c => `Card ${c.index + 1}: ${ROLE_CONFIGS[c.role]?.name}`).join(', ')}`;
        }
        return 'Used their vision';

      case 'robber':
        if (result.newRole && result.robbedPlayerId) {
          return `Robbed ${getPlayerName(result.robbedPlayerId)} and became ${ROLE_CONFIGS[result.newRole]?.name}`;
        }
        return 'Did not rob anyone';

      case 'troublemaker':
        if (result.swappedPlayers) {
          return `Swapped ${getPlayerName(result.swappedPlayers[0])} ↔ ${getPlayerName(result.swappedPlayers[1])}`;
        }
        return 'Did not swap anyone';

      case 'witch':
        if (result.witchPeekedCard) {
          const peekInfo = `Peeked at center card ${result.witchPeekedCard.index + 1}: ${ROLE_CONFIGS[result.witchPeekedCard.role]?.name}`;
          if (result.witchSwappedWith) {
            return `${peekInfo}, swapped it with ${getPlayerName(result.witchSwappedWith)}`;
          }
          return peekInfo;
        }
        return 'Used their magic';

      case 'drunk':
        if (result.centerCardSwapped !== undefined) {
          return `Swapped with center card ${result.centerCardSwapped + 1} (unknown role)`;
        }
        return 'Swapped with a center card';

      case 'insomniac':
        if (result.finalRole) {
          return `Woke up and saw their card is now: ${ROLE_CONFIGS[result.finalRole]?.name}`;
        }
        return 'Checked their final role';

      default:
        return 'Completed night action';
    }
  };

  if (sortedActions.length === 0) {
    return null;
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>🌙 Night Action History</h3>
      <div className={styles.timeline}>
        {rolesInOrder.map((role, roleIndex) => {
          const roleActions = groupedByRole[role] || [];
          const config = ROLE_CONFIGS[role];
          const imagePath = getRoleImagePath(role);

          return (
            <div key={role} className={styles.roleGroup}>
              {/* Role header */}
              <div className={styles.roleHeader}>
                <div className={styles.stepNumber}>{roleIndex + 1}</div>
                <div className={styles.roleImageWrapper}>
                  <Image
                    src={imagePath}
                    alt={config.name}
                    width={40}
                    height={40}
                    className={styles.roleImage}
                    unoptimized
                  />
                </div>
                <div className={styles.roleInfo}>
                  <span className={styles.roleName}>{config.name}</span>
                </div>
              </div>

              {/* Player actions for this role */}
              <div className={styles.playerActions}>
                {roleActions.map((action) => (
                  <div key={action.playerId} className={styles.playerAction}>
                    <div className={styles.playerName}>
                      {getPlayerName(action.playerId)}
                    </div>
                    <div className={styles.actionDescription}>
                      {getActionDescription(action)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Timeline connector */}
              {roleIndex < rolesInOrder.length - 1 && (
                <div className={styles.connector} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
