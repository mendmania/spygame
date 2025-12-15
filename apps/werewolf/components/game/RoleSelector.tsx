'use client';

/**
 * RoleSelector Component
 * 
 * Allows the host to select which roles will be in the game.
 * Non-host players see a read-only view of selected roles.
 * 
 * Features:
 * - Clear separation: Player Roles vs Center Cards (3)
 * - Add/remove role cards with counts
 * - Shows validation reasons for Start Game
 * - Saves to Firebase on change
 * 
 * KEY CONCEPT:
 * In One Night Werewolf, you select N + 3 cards total.
 * N cards go to players, 3 go to the center (middle).
 * The center cards are NOT chosen separately - the game
 * shuffles all cards and deals them out.
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
  'witch',
  'drunk',
  'insomniac',
  'villager',
];

// Roles grouped by team
const WEREWOLF_TEAM_ROLES: WerewolfRole[] = ['werewolf', 'minion'];
const VILLAGE_TEAM_ROLES: WerewolfRole[] = ['seer', 'robber', 'troublemaker', 'mason', 'witch', 'drunk', 'insomniac', 'villager'];

// Default role sets for quick selection
const ROLE_PRESETS: Record<string, { name: string; description: string; roles: WerewolfRole[] }> = {
  basic: {
    name: 'Basic',
    description: '3-4 players',
    roles: ['werewolf', 'seer', 'robber', 'troublemaker', 'villager', 'villager'],
  },
  standard: {
    name: 'Standard',
    description: '5-6 players',
    roles: ['werewolf', 'werewolf', 'seer', 'robber', 'troublemaker', 'drunk', 'insomniac', 'villager', 'villager'],
  },
  advanced: {
    name: 'Advanced',
    description: '6-7 players',
    roles: ['werewolf', 'werewolf', 'minion', 'seer', 'robber', 'troublemaker', 'witch', 'mason', 'mason', 'insomniac'],
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

  // Calculate key metrics
  const totalCards = localRoles.length;
  const playerRolesCount = Math.max(0, totalCards - CENTER_CARD_COUNT);
  const centerCardsCount = Math.min(totalCards, CENTER_CARD_COUNT);
  const werewolfCount = roleCounts['werewolf'] || 0;
  const masonCount = roleCounts['mason'] || 0;

  // Determine if setup matches current player count
  const isMatchingPlayerCount = playerCount > 0 && playerRolesCount === playerCount;

  // Validation - returns reasons why Start Game would fail
  const validation = useMemo(() => {
    const reasons: string[] = [];

    // Check minimum cards
    if (totalCards < MIN_PLAYERS + CENTER_CARD_COUNT) {
      reasons.push(`Need at least ${MIN_PLAYERS + CENTER_CARD_COUNT} cards (${MIN_PLAYERS} players + 3 center)`);
    }
    
    // Check maximum cards  
    if (totalCards > MAX_PLAYERS + CENTER_CARD_COUNT) {
      reasons.push(`Maximum ${MAX_PLAYERS + CENTER_CARD_COUNT} cards (${MAX_PLAYERS} players + 3 center)`);
    }
    
    // Must have werewolves
    if (werewolfCount === 0) {
      reasons.push('At least 1 Werewolf required');
    }
    
    // Mason pairs
    if (masonCount === 1) {
      reasons.push('Masons must be 0 or 2+ (they work in pairs)');
    }
    
    // Card count vs player count
    if (playerCount > 0) {
      const expected = playerCount + CENTER_CARD_COUNT;
      if (totalCards !== expected) {
        if (totalCards < expected) {
          reasons.push(`Need ${expected - totalCards} more card(s) for ${playerCount} players`);
        } else {
          reasons.push(`Remove ${totalCards - expected} card(s) for ${playerCount} players`);
        }
      }
    }

    return {
      canStart: reasons.length === 0,
      reasons,
    };
  }, [totalCards, werewolfCount, masonCount, playerCount]);

  // Update roles
  const handleRoleChange = useCallback(async (role: WerewolfRole, delta: number) => {
    if (!isHost) return;

    const newRoles = [...localRoles];
    
    if (delta > 0) {
      newRoles.push(role);
    } else if (delta < 0) {
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
        setLocalRoles(selectedRoles);
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

      {/* Card Distribution Summary */}
      <div className={styles.distribution}>
        <div className={styles.distributionRow}>
          <div className={`${styles.distributionBox} ${styles.playerBox}`}>
            <span className={styles.distributionLabel}>👥 Player Roles</span>
            <span className={`${styles.distributionValue} ${isMatchingPlayerCount ? styles.match : ''}`}>
              {playerRolesCount}
            </span>
            {playerCount > 0 && (
              <span className={styles.distributionNote}>
                {isMatchingPlayerCount ? '✓ matches' : `need ${playerCount}`}
              </span>
            )}
          </div>
          <div className={styles.distributionPlus}>+</div>
          <div className={`${styles.distributionBox} ${styles.centerBox}`}>
            <span className={styles.distributionLabel}>🎴 Center Cards</span>
            <span className={`${styles.distributionValue} ${centerCardsCount === 3 ? styles.match : ''}`}>
              {centerCardsCount} / 3
            </span>
            <span className={styles.distributionNote}>
              {centerCardsCount === 3 ? '✓ ready' : 'need 3'}
            </span>
          </div>
          <div className={styles.distributionEquals}>=</div>
          <div className={`${styles.distributionBox} ${styles.totalBox}`}>
            <span className={styles.distributionLabel}>Total Cards</span>
            <span className={styles.distributionValue}>{totalCards}</span>
          </div>
        </div>
      </div>

      {/* Quick Presets */}
      {isHost && (
        <div className={styles.presets}>
          <span className={styles.presetsLabel}>Quick Setup:</span>
          <div className={styles.presetButtons}>
            {Object.entries(ROLE_PRESETS).map(([key, preset]) => (
              <button
                key={key}
                className={styles.presetButton}
                onClick={() => handleApplyPreset(preset.roles)}
                disabled={isUpdating}
                title={`${preset.roles.length} cards for ${preset.description}`}
              >
                {preset.name}
                <span className={styles.presetDetail}>{preset.description}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Role Categories */}
      <div className={styles.categories}>
        {/* Werewolf Team */}
        <div className={styles.category}>
          <div className={styles.categoryHeader}>
            <span className={`${styles.categoryName} ${styles.werewolf}`}>🐺 Werewolf Team</span>
            <span className={styles.categoryCount}>
              {roleCounts['werewolf'] + roleCounts['minion']} selected
            </span>
          </div>
          <div className={styles.roleGrid}>
            {WEREWOLF_TEAM_ROLES.map(renderRoleCard)}
          </div>
        </div>

        {/* Village Team */}
        <div className={styles.category}>
          <div className={styles.categoryHeader}>
            <span className={`${styles.categoryName} ${styles.village}`}>🏘️ Village Team</span>
            <span className={styles.categoryCount}>
              {VILLAGE_TEAM_ROLES.reduce((sum, r) => sum + (roleCounts[r] || 0), 0)} selected
            </span>
          </div>
          <div className={styles.roleGrid}>
            {VILLAGE_TEAM_ROLES.map(renderRoleCard)}
          </div>
        </div>
      </div>

      {/* Validation / Start Game Blockers */}
      <div className={styles.validationSection}>
        {validation.canStart ? (
          <div className={styles.canStart}>
            ✅ Ready to start with {playerRolesCount} players
          </div>
        ) : (
          <div className={styles.cannotStart}>
            <div className={styles.cannotStartHeader}>
              ⚠️ Cannot start game:
            </div>
            <ul className={styles.reasonsList}>
              {validation.reasons.map((reason, idx) => (
                <li key={idx}>{reason}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {error && (
        <div className={styles.errorMessage}>
          ❌ {error}
        </div>
      )}
    </div>
  );
}
