'use client';

/**
 * RoleSelector Component
 * 
 * Allows the host to select which roles will be in the game.
 * Non-host players see a read-only view of selected roles.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import Image from 'next/image';
import type { WerewolfRole, WerewolfActionResult } from '@vbz/shared-types';
import { ROLE_CONFIGS, getRoleEmoji, getRoleImagePath } from '../../constants/roles';
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

export function RoleSelector({
  selectedRoles,
  playerCount,
  isHost,
  onUpdateRoles,
}: RoleSelectorProps) {
  const [localRoles, setLocalRoles] = useState<WerewolfRole[]>(selectedRoles);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredRole, setHoveredRole] = useState<WerewolfRole | null>(null);

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

    if (totalCards < MIN_PLAYERS + CENTER_CARD_COUNT) {
      reasons.push(`Need at least ${MIN_PLAYERS + CENTER_CARD_COUNT} cards`);
    }
    
    if (totalCards > MAX_PLAYERS + CENTER_CARD_COUNT) {
      reasons.push(`Maximum ${MAX_PLAYERS + CENTER_CARD_COUNT} cards`);
    }
    
    if (werewolfCount === 0) {
      reasons.push('At least 1 Werewolf required');
    }
    
    if (masonCount === 1) {
      reasons.push('Masons must be 0 or 2+');
    }
    
    if (playerCount > 0) {
      const expected = playerCount + CENTER_CARD_COUNT;
      if (totalCards !== expected) {
        if (totalCards < expected) {
          reasons.push(`Need ${expected - totalCards} more card(s)`);
        } else {
          reasons.push(`Remove ${totalCards - expected} card(s)`);
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

  // Render role card with counter
  const renderRoleCard = (role: WerewolfRole) => {
    const config = ROLE_CONFIGS[role];
    const count = roleCounts[role] || 0;
    const emoji = getRoleEmoji(role);
    const imagePath = getRoleImagePath(role);
    const isHovered = hoveredRole === role;

    return (
      <div 
        key={role} 
        className={`${styles.roleCard} ${count > 0 ? styles.hasCount : ''} ${!isHost ? styles.disabled : ''}`}
        onMouseEnter={() => setHoveredRole(role)}
        onMouseLeave={() => setHoveredRole(null)}
      >
        <div className={styles.roleImageWrapper}>
          <Image
            src={imagePath}
            alt={config.name}
            width={60}
            height={84}
            className={styles.roleImage}
            unoptimized
          />
          {count > 0 && (
            <div className={styles.countBadge}>{count}</div>
          )}
        </div>
        
        <span className={styles.roleName}>{config.name}</span>
        
        {isHost && (
          <div className={styles.roleControls}>
            <button
              className={`${styles.controlBtn} ${styles.removeBtn}`}
              onClick={() => handleRoleChange(role, -1)}
              disabled={count === 0 || isUpdating}
            >
              −
            </button>
            <button
              className={`${styles.controlBtn} ${styles.addBtn}`}
              onClick={() => handleRoleChange(role, 1)}
              disabled={isUpdating}
            >
              +
            </button>
          </div>
        )}

        {/* Tooltip on hover */}
        {isHovered && (
          <div className={styles.tooltip}>
            <div className={styles.tooltipHeader}>
              <span>{emoji}</span>
              <span>{config.name}</span>
              <span className={`${styles.tooltipTeam} ${styles[config.team]}`}>
                {config.team === 'werewolf' ? '🐺' : '🏘️'}
              </span>
            </div>
            <p className={styles.tooltipDesc}>{config.actionDescription || config.description}</p>
          </div>
        )}
      </div>
    );
  };

  // Get sorted deck for preview
  const sortedDeck = useMemo(() => {
    return [...localRoles].sort((a, b) => {
      const aTeam = ROLE_CONFIGS[a].team === 'werewolf' ? 0 : 1;
      const bTeam = ROLE_CONFIGS[b].team === 'werewolf' ? 0 : 1;
      if (aTeam !== bTeam) return aTeam - bTeam;
      return a.localeCompare(b);
    });
  }, [localRoles]);

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3 className={styles.title}>🎭 Build Your Deck</h3>
        <div className={styles.headerStats}>
          <span className={`${styles.statBadge} ${isMatchingPlayerCount ? styles.ready : ''}`}>
            {playerRolesCount} / {playerCount || '?'} players
          </span>
          <span className={`${styles.statBadge} ${centerCardsCount === 3 ? styles.ready : ''}`}>
            {centerCardsCount} / 3 center
          </span>
        </div>
      </div>
      
      {!isHost && (
        <div className={styles.viewOnly}>
          👁️ View only - Host selects roles
        </div>
      )}

      {/* Deck Preview */}
      {totalCards > 0 && (
        <div className={styles.deckPreview}>
          <div className={styles.deckLabel}>Current Deck ({totalCards} cards)</div>
          <div className={styles.deckCards}>
            {sortedDeck.map((role, idx) => (
              <div 
                key={`${role}-${idx}`} 
                className={`${styles.deckCard} ${styles[ROLE_CONFIGS[role].team]}`}
                title={ROLE_CONFIGS[role].name}
              >
                {getRoleEmoji(role)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Role Categories */}
      <div className={styles.categories}>
        {/* Werewolf Team */}
        <div className={`${styles.category} ${styles.werewolfCategory}`}>
          <div className={styles.categoryHeader}>
            <span className={styles.categoryIcon}>🐺</span>
            <span className={styles.categoryName}>Werewolf Team</span>
            <span className={styles.categoryCount}>
              {roleCounts['werewolf'] + roleCounts['minion']}
            </span>
          </div>
          <div className={styles.roleGrid}>
            {WEREWOLF_TEAM_ROLES.map(renderRoleCard)}
          </div>
        </div>

        {/* Village Team */}
        <div className={`${styles.category} ${styles.villageCategory}`}>
          <div className={styles.categoryHeader}>
            <span className={styles.categoryIcon}>🏘️</span>
            <span className={styles.categoryName}>Village Team</span>
            <span className={styles.categoryCount}>
              {VILLAGE_TEAM_ROLES.reduce((sum, r) => sum + (roleCounts[r] || 0), 0)}
            </span>
          </div>
          <div className={styles.roleGrid}>
            {VILLAGE_TEAM_ROLES.map(renderRoleCard)}
          </div>
        </div>
      </div>

      {/* Validation */}
      <div className={styles.validationSection}>
        {validation.canStart ? (
          <div className={styles.canStart}>
            ✅ Ready to start!
          </div>
        ) : (
          <div className={styles.cannotStart}>
            {validation.reasons.map((reason, idx) => (
              <span key={idx} className={styles.reasonItem}>⚠️ {reason}</span>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className={styles.errorMessage}>❌ {error}</div>
      )}
    </div>
  );
}
