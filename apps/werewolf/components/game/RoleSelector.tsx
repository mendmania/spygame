'use client';

/**
 * RoleSelector Component
 * 
 * Allows the host to select which roles will be in the game.
 * Non-host players see a read-only view of selected roles.
 * 
 * Features:
 * - Add/remove role cards
 * - Shows total cards and required player count
 * - Validates role selection
 * - Saves to Firebase on change
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import type { WerewolfRole, WerewolfActionResult } from '@vbz/shared-types';
import { ROLE_CONFIGS, getRoleEmoji } from '../../constants/roles';
import { CENTER_CARD_COUNT, MIN_PLAYERS, MAX_PLAYERS } from '../../constants/game';
import styles from './RoleSelector.module.css';

interface RoleSelectorProps {
  selectedRoles: WerewolfRole[];
  playerCount: number;
  isHost: boolean;
  onUpdateRoles: (roles: WerewolfRole[]) => Promise<WerewolfActionResult>;
}

// All available roles
const ALL_ROLES: WerewolfRole[] = [
  'werewolf',
  'minion',
  'seer',
  'robber',
  'troublemaker',
  'mason',
  'drunk',
  'insomniac',
  'villager',
];

// Roles grouped by team
const WEREWOLF_TEAM_ROLES: WerewolfRole[] = ['werewolf', 'minion'];
const VILLAGE_TEAM_ROLES: WerewolfRole[] = ['seer', 'robber', 'troublemaker', 'mason', 'drunk', 'insomniac', 'villager'];

// Default role sets for quick selection
const ROLE_PRESETS: Record<string, { name: string; roles: WerewolfRole[] }> = {
  basic: {
    name: 'Basic (3-4 players)',
    roles: ['werewolf', 'seer', 'robber', 'troublemaker', 'villager', 'villager'],
  },
  standard: {
    name: 'Standard (5-6 players)',
    roles: ['werewolf', 'werewolf', 'seer', 'robber', 'troublemaker', 'drunk', 'insomniac', 'villager', 'villager'],
  },
  advanced: {
    name: 'Advanced (6-7 players)',
    roles: ['werewolf', 'werewolf', 'minion', 'seer', 'robber', 'troublemaker', 'mason', 'mason', 'drunk', 'insomniac'],
  },
};

export function RoleSelector({
  selectedRoles,
  playerCount,
  isHost,
  onUpdateRoles,
}: RoleSelectorProps) {
  const [localRoles, setLocalRoles] = useState<WerewolfRole[]>(selectedRoles);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync with prop changes
  useEffect(() => {
    setLocalRoles(selectedRoles);
  }, [selectedRoles]);

  // Calculate role counts
  const roleCounts = useMemo(() => {
    const counts: Record<WerewolfRole, number> = {} as Record<WerewolfRole, number>;
    for (const role of ALL_ROLES) {
      counts[role] = 0;
    }
    for (const role of localRoles) {
      counts[role] = (counts[role] || 0) + 1;
    }
    return counts;
  }, [localRoles]);

  // Validation
  const totalCards = localRoles.length;
  const requiredPlayers = totalCards - CENTER_CARD_COUNT;
  const werewolfCount = roleCounts['werewolf'] || 0;
  const masonCount = roleCounts['mason'] || 0;

  const validation = useMemo(() => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (totalCards < MIN_PLAYERS + CENTER_CARD_COUNT) {
      errors.push(`Need at least ${MIN_PLAYERS + CENTER_CARD_COUNT} cards (${MIN_PLAYERS} players + 3 center)`);
    }
    if (totalCards > MAX_PLAYERS + CENTER_CARD_COUNT) {
      errors.push(`Maximum ${MAX_PLAYERS + CENTER_CARD_COUNT} cards (${MAX_PLAYERS} players + 3 center)`);
    }
    if (werewolfCount === 0) {
      errors.push('Must have at least 1 Werewolf');
    }
    if (masonCount === 1) {
      warnings.push('Only 1 Mason selected - Masons work best in pairs');
    }
    if (playerCount > 0 && totalCards !== playerCount + CENTER_CARD_COUNT) {
      const needed = playerCount + CENTER_CARD_COUNT;
      if (totalCards < needed) {
        warnings.push(`Need ${needed - totalCards} more card(s) for ${playerCount} players`);
      } else {
        warnings.push(`${totalCards - needed} extra card(s) for ${playerCount} players`);
      }
    }

    return {
      isValid: errors.length === 0 && (playerCount === 0 || totalCards === playerCount + CENTER_CARD_COUNT),
      errors,
      warnings,
    };
  }, [totalCards, werewolfCount, masonCount, playerCount]);

  // Update roles
  const handleRoleChange = useCallback(async (role: WerewolfRole, delta: number) => {
    if (!isHost) return;

    const newRoles = [...localRoles];
    
    if (delta > 0) {
      // Add role
      newRoles.push(role);
    } else if (delta < 0) {
      // Remove role
      const index = newRoles.lastIndexOf(role);
      if (index !== -1) {
        newRoles.splice(index, 1);
      }
    }

    setLocalRoles(newRoles);
    setError(null);
    setIsUpdating(true);

    try {
      const result = await onUpdateRoles(newRoles);
      if (!result.success) {
        setError(result.error || 'Failed to update roles');
        setLocalRoles(selectedRoles); // Revert on error
      }
    } catch (err) {
      setError('Failed to update roles');
      setLocalRoles(selectedRoles);
    } finally {
      setIsUpdating(false);
    }
  }, [isHost, localRoles, onUpdateRoles, selectedRoles]);

  // Apply preset
  const handleApplyPreset = useCallback(async (preset: WerewolfRole[]) => {
    if (!isHost) return;

    setLocalRoles(preset);
    setError(null);
    setIsUpdating(true);

    try {
      const result = await onUpdateRoles(preset);
      if (!result.success) {
        setError(result.error || 'Failed to apply preset');
        setLocalRoles(selectedRoles);
      }
    } catch (err) {
      setError('Failed to apply preset');
      setLocalRoles(selectedRoles);
    } finally {
      setIsUpdating(false);
    }
  }, [isHost, onUpdateRoles, selectedRoles]);

  // Render role card with counter
  const renderRoleCard = (role: WerewolfRole) => {
    const config = ROLE_CONFIGS[role];
    const count = roleCounts[role] || 0;
    const emoji = getRoleEmoji(role);

    return (
      <div key={role} className={`${styles.roleCard} ${!isHost ? styles.disabled : ''}`}>
        <span className={styles.roleEmoji}>{emoji}</span>
        <span className={styles.roleName}>{config.name}</span>
        <div className={styles.roleCount}>
          <button
            className={styles.countButton}
            onClick={() => handleRoleChange(role, -1)}
            disabled={!isHost || count === 0 || isUpdating}
            title="Remove one"
          >
            −
          </button>
          <span className={`${styles.countValue} ${count > 0 ? styles.active : ''}`}>
            {count}
          </span>
          <button
            className={styles.countButton}
            onClick={() => handleRoleChange(role, 1)}
            disabled={!isHost || isUpdating}
            title="Add one"
          >
            +
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3 className={styles.title}>🎭 Role Selection</h3>
      </div>
      
      {!isHost && (
        <div className={styles.viewOnly}>
          👁️ View only - Only the host can change roles
        </div>
      )}

      <p className={styles.subtitle}>
        Select roles for the game. Total cards = players + 3 center cards.
      </p>

      {/* Stats */}
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Total Cards</span>
          <span className={`${styles.statValue} ${validation.isValid ? styles.valid : styles.invalid}`}>
            {totalCards}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Players Needed</span>
          <span className={`${styles.statValue} ${playerCount === requiredPlayers ? styles.valid : ''}`}>
            {requiredPlayers}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Current Players</span>
          <span className={styles.statValue}>{playerCount}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Werewolves</span>
          <span className={`${styles.statValue} ${werewolfCount > 0 ? styles.valid : styles.invalid}`}>
            {werewolfCount}
          </span>
        </div>
      </div>

      {/* Role Categories */}
      <div className={styles.categories}>
        {/* Werewolf Team */}
        <div className={styles.category}>
          <div className={styles.categoryHeader}>
            <span className={`${styles.categoryName} ${styles.werewolf}`}>🐺 Werewolf Team</span>
          </div>
          <div className={styles.roleGrid}>
            {WEREWOLF_TEAM_ROLES.map(renderRoleCard)}
          </div>
        </div>

        {/* Village Team */}
        <div className={styles.category}>
          <div className={styles.categoryHeader}>
            <span className={`${styles.categoryName} ${styles.village}`}>🏘️ Village Team</span>
          </div>
          <div className={styles.roleGrid}>
            {VILLAGE_TEAM_ROLES.map(renderRoleCard)}
          </div>
        </div>
      </div>

      {/* Quick Presets */}
      {isHost && (
        <div className={styles.quickActions}>
          {Object.entries(ROLE_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              className={styles.quickButton}
              onClick={() => handleApplyPreset(preset.roles)}
              disabled={isUpdating}
            >
              {preset.name}
            </button>
          ))}
        </div>
      )}

      {/* Selected Roles Display */}
      <div className={styles.selectedRoles}>
        <div className={styles.selectedTitle}>Selected Roles ({totalCards})</div>
        <div className={styles.selectedList}>
          {localRoles.map((role, idx) => {
            const config = ROLE_CONFIGS[role];
            const isWerewolfTeam = config.team === 'werewolf';
            return (
              <span
                key={`${role}-${idx}`}
                className={`${styles.selectedRole} ${isWerewolfTeam ? styles.werewolf : styles.village}`}
              >
                {getRoleEmoji(role)} {config.name}
              </span>
            );
          })}
        </div>
      </div>

      {/* Validation Messages */}
      {validation.errors.length > 0 && (
        <div className={styles.error}>
          ⚠️ {validation.errors.join(' • ')}
        </div>
      )}
      {validation.warnings.length > 0 && validation.errors.length === 0 && (
        <div className={styles.warning}>
          💡 {validation.warnings.join(' • ')}
        </div>
      )}
      {validation.isValid && validation.warnings.length === 0 && totalCards > 0 && (
        <div className={styles.valid}>
          ✓ Ready for {requiredPlayers} players
        </div>
      )}

      {error && (
        <div className={styles.error}>
          ❌ {error}
        </div>
      )}
    </div>
  );
}
