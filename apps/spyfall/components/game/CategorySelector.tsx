'use client';

/**
 * CategorySelector Component
 * 
 * Allows the host to select a game category before starting.
 * Shows all available categories (free and premium).
 */

import { useMemo } from 'react';
import type { SpyfallCategory, SpyfallPremiumFeature } from '@vbz/shared-types';
import { CATEGORY_PACKS, getAllCategories } from '../../constants/categories';
import styles from './CategorySelector.module.css';

interface CategorySelectorProps {
  selectedCategory: SpyfallCategory;
  onSelectCategory: (category: SpyfallCategory) => void;
  isCustomUnlocked: boolean;
  onPurchaseCustom: () => void;
  isPurchasing: boolean;
  disabled?: boolean;
}

export function CategorySelector({
  selectedCategory,
  onSelectCategory,
  isCustomUnlocked,
  onPurchaseCustom,
  isPurchasing,
  disabled = false,
}: CategorySelectorProps) {
  const categories = useMemo(() => getAllCategories(), []);

  const handleCategoryClick = (category: SpyfallCategory) => {
    if (disabled) return;
    
    // If selecting custom and not unlocked, trigger purchase
    if (category === 'custom' && !isCustomUnlocked) {
      onPurchaseCustom();
      return;
    }
    
    onSelectCategory(category);
  };

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>🎮 Game Category</h3>
      <p className={styles.subtitle}>Choose what players will be guessing</p>
      
      <div className={styles.categoryGrid}>
        {categories.map((category) => {
          const isSelected = selectedCategory === category.id;
          // Only custom category is locked until purchased
          const isLocked = category.id === 'custom' && !isCustomUnlocked;
          
          return (
            <button
              key={category.id}
              className={`${styles.categoryCard} ${isSelected ? styles.selected : ''} ${isLocked ? styles.locked : ''}`}
              onClick={() => handleCategoryClick(category.id)}
              disabled={disabled || isPurchasing}
            >
              <span className={styles.emoji}>{category.emoji}</span>
              <span className={styles.name}>{category.name}</span>
              <span className={styles.count}>
                {category.isPremium ? (
                  isLocked ? (
                    <span className={styles.price}>$0.99</span>
                  ) : (
                    <span className={styles.unlocked}>✓ Unlocked</span>
                  )
                ) : (
                  <span className={styles.freeTag}>FREE</span>
                )}
              </span>
              {isLocked && (
                <span className={styles.lockIcon}>🔒</span>
              )}
              {isSelected && !isLocked && (
                <span className={styles.checkmark}>✓</span>
              )}
            </button>
          );
        })}
      </div>
      
      {isPurchasing && (
        <p className={styles.purchasingText}>Redirecting to payment...</p>
      )}
    </div>
  );
}
