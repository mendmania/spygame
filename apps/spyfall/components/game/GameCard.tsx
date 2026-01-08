'use client';

import { useState } from 'react';
import styles from './GameCard.module.css';

interface GameCardProps {
  location?: string;
  role?: string | null; // null for categories without roles (e.g., animals, custom)
  isSpy?: boolean;
  categoryLabel?: string; // e.g., "ANIMAL", "FOOD", "SPORT"
}

export function GameCard({ 
  location = 'Beach', 
  role, // No default - null/undefined means no role
  isSpy = false,
  categoryLabel = 'LOCATION'
}: GameCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleClick = () => {
    setIsFlipped(!isFlipped);
  };

  return (
    <div className={styles.gameCard} onClick={handleClick}>
      <div className={`${styles.card} ${isFlipped ? styles.showCardData : ''}`}>
        {/* Front face - Hidden content */}
        <div className={styles.cardFront}>
          <div className={styles.hiddenContent}>
            <h1 className={styles.title}>SPYFALL</h1>
            <p className={styles.tapHint}>Tap to reveal</p>
          </div>
        </div>
        
        {/* Back face - Revealed content */}
        <div className={styles.cardBack}>
          {isSpy ? (
            <div className={styles.spyContent}>
              <span className={styles.spyIcon}>🕵️</span>
              <h2 className={styles.spyTitle}>You are the SPY</h2>
              <p className={styles.spyHint}>Figure out the {categoryLabel.toLowerCase()}!</p>
            </div>
          ) : (
            <>
              <div className={styles.locationSection}>
                <span className={styles.label}>{categoryLabel}</span>
                <h2 className={styles.location}>{location}</h2>
              </div>
              {role && (
                <div className={styles.roleSection}>
                  <span className={styles.label}>YOUR ROLE</span>
                  <h3 className={styles.role}>{role}</h3>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
