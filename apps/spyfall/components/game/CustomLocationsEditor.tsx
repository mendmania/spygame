'use client';

/**
 * CustomLocationsEditor Component
 * 
 * Allows the host to create custom items when
 * the custom category is selected.
 * Simple version: just item names, no roles.
 */

import { useState, useCallback } from 'react';
import type { SpyfallLocation } from '@vbz/shared-types';
import styles from './CustomLocationsEditor.module.css';

interface CustomLocationsEditorProps {
  locations: SpyfallLocation[];
  onLocationsChange: (locations: SpyfallLocation[]) => void;
  disabled?: boolean;
  minItems?: number;
}

export function CustomLocationsEditor({
  locations,
  onLocationsChange,
  disabled = false,
  minItems = 5,
}: CustomLocationsEditorProps) {
  const [newItem, setNewItem] = useState('');

  const handleAddItem = useCallback(() => {
    if (!newItem.trim()) return;
    onLocationsChange([...locations, { name: newItem.trim(), roles: [] }]);
    setNewItem('');
  }, [newItem, locations, onLocationsChange]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddItem();
    }
  }, [handleAddItem]);

  const handleRemoveItem = useCallback((index: number) => {
    onLocationsChange(locations.filter((_, i) => i !== index));
  }, [locations, onLocationsChange]);

  const validCount = locations.filter(loc => loc.name.trim()).length;
  const isValid = validCount >= minItems;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>✨ Custom Items</h3>
        <span className={`${styles.counter} ${isValid ? styles.valid : ''}`}>
          {validCount}/{minItems} minimum
        </span>
      </div>
      <p className={styles.subtitle}>
        Add your own items. Players will try to figure out which item the spy doesn't know.
      </p>

      {/* Add new item input */}
      <div className={styles.addSection}>
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type an item and press Enter..."
          className={styles.addInput}
          disabled={disabled}
          maxLength={50}
        />
        <button
          type="button"
          onClick={handleAddItem}
          className={styles.addButton}
          disabled={disabled || !newItem.trim()}
        >
          Add
        </button>
      </div>

      {/* Items list */}
      {locations.length > 0 && (
        <div className={styles.itemList}>
          {locations.map((location, index) => (
            <div key={index} className={styles.itemTag}>
              <span className={styles.itemName}>{location.name}</span>
              <button
                type="button"
                onClick={() => handleRemoveItem(index)}
                className={styles.removeButton}
                disabled={disabled}
                title="Remove item"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {!isValid && locations.length > 0 && (
        <p className={styles.hint}>
          Add {minItems - validCount} more item{minItems - validCount !== 1 ? 's' : ''} to start the game
        </p>
      )}

      {locations.length === 0 && (
        <p className={styles.hint}>
          Add at least {minItems} items to play with this category
        </p>
      )}
    </div>
  );
}
