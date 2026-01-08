'use client';

import { useState } from 'react';
import styles from './LocationsGrid.module.css';

export interface Location {
  name: string;
  roles: string[];
}

interface LocationsGridProps {
  locations: Location[];
  categoryLabel?: string; // e.g., "Animals", "Foods", "Sports"
  categoryEmoji?: string; // e.g., "🐾", "🍕", "⚽"
}

export function LocationsGrid({ 
  locations, 
  categoryLabel = 'Locations',
  categoryEmoji = '📍'
}: LocationsGridProps) {
  const [expandedLocation, setExpandedLocation] = useState<string | null>(null);

  const toggleLocation = (locationName: string, hasRoles: boolean) => {
    if (!hasRoles) return; // Don't expand if no roles
    setExpandedLocation(expandedLocation === locationName ? null : locationName);
  };

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>
        <span className={styles.titleIcon}>{categoryEmoji}</span>
        {categoryLabel} ({locations.length})
      </h3>
      <div className={styles.grid}>
        {locations.map((location) => {
          const hasRoles = location.roles && location.roles.length > 0;
          return (
            <button
              key={location.name}
              className={`${styles.locationCard} ${expandedLocation === location.name ? styles.expanded : ''} ${!hasRoles ? styles.noRoles : ''}`}
              onClick={() => toggleLocation(location.name, hasRoles)}
              style={{ cursor: hasRoles ? 'pointer' : 'default' }}
            >
              <span className={styles.locationName}>{location.name}</span>
              {hasRoles && expandedLocation === location.name && (
                <div className={styles.roles}>
                  {location.roles.map((role, index) => (
                    <span key={index} className={styles.role}>
                      {role}
                    </span>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
