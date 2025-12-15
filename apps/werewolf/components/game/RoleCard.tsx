'use client';

/**
 * RoleCard Component - One Night Werewolf
 * 
 * VISUAL RULES:
 * - FRONT (default): Generic card back - SAME for all cards
 * - BACK (after tap): Shows role image
 * - Details button: Shows role name, description, team
 */

import { useState } from 'react';
import Image from 'next/image';
import type { WerewolfRole } from '@vbz/shared-types';
import { getRoleEmoji, ROLE_CONFIGS, getRoleImagePath } from '../../constants/roles';
import styles from './RoleCard.module.css';

interface RoleCardProps {
  role: WerewolfRole;
  /** If false, shows generic hidden card (not flippable) */
  isRevealed?: boolean;
  /** Shows "(Swapped!)" badge if false */
  isOriginal?: boolean;
  /** Shows the night action description when revealed */
  showAction?: boolean;
  /** Card size variant */
  size?: 'small' | 'medium' | 'large';
  /** Optional click handler for additional interactions */
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
  const [isFlipped, setIsFlipped] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const config = ROLE_CONFIGS[role];
  const emoji = getRoleEmoji(role);
  const imagePath = getRoleImagePath(role);

  const handleCardClick = () => {
    if (isRevealed && !showDetails) {
      setIsFlipped(!isFlipped);
    }
    onClick?.();
  };

  const handleDetailsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDetails(!showDetails);
  };

  // Non-revealed cards: completely hidden (e.g., center cards before game reveal)
  if (!isRevealed) {
    return (
      <div className={`${styles.gameCard} ${styles[size]}`}>
        <div className={styles.card}>
          <div className={styles.cardFront}>
            <div className={styles.hiddenContent}>
              <span className={styles.hiddenIcon}>🎴</span>
              <span className={styles.hiddenText}>Hidden</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`${styles.gameCard} ${styles[size]}`}
      onClick={handleCardClick}
    >
      <div className={`${styles.card} ${isFlipped ? styles.showCardData : ''}`}>
        {/* FRONT FACE - Generic card back (same for all roles) */}
        <div className={styles.cardFront}>
          <div className={styles.cardBackDesign}>
            <Image
              src="/roles/back-card.png"
              alt="Card Back"
              fill
              className={styles.cardBackImage}
              sizes="(max-width: 640px) 260px, 300px"
              priority
            />
            <p className={styles.tapHint}>Tap to reveal</p>
          </div>
        </div>

        {/* BACK FACE - Role Image */}
        <div className={styles.cardBack}>
          <div className={styles.roleImageWrapper}>
            <Image
              key={role}
              src={imagePath}
              alt={`${config.name} Role Card`}
              fill
              className={styles.roleImage}
              sizes="(max-width: 640px) 260px, 300px"
              priority
              unoptimized
            />
          </div>
          
          {/* Details button */}
          <button 
            className={styles.detailsButton}
            onClick={handleDetailsClick}
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>

          {/* Details overlay */}
          {showDetails && (
            <div 
              className={styles.detailsOverlay}
              onClick={(e) => {
                e.stopPropagation();
                setShowDetails(false);
              }}
            >
              <h2 className={styles.roleName}>{config.name}</h2>
              
              {!isOriginal && (
                <span className={styles.swappedBadge}>Swapped!</span>
              )}
              
              {showAction && config.actionDescription && (
                <p className={styles.actionDescription}>{config.actionDescription}</p>
              )}
              
              <p className={styles.description}>{config.description}</p>
              
              <div className={styles.teamBadge} data-team={config.team}>
                {config.team === 'werewolf' && '🐺 Werewolf Team'}
                {config.team === 'village' && '🏘️ Village Team'}
                {config.team === 'neutral' && '⚖️ Neutral'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
