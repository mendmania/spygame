'use client';

import { useState } from 'react';
import styles from './LocationsGrid.module.css';

export interface Location {
  name: string;
  roles: string[];
}

interface LocationsGridProps {
  locations: Location[];
}

export function LocationsGrid({ locations }: LocationsGridProps) {
  const [expandedLocation, setExpandedLocation] = useState<string | null>(null);

  const toggleLocation = (locationName: string) => {
    setExpandedLocation(expandedLocation === locationName ? null : locationName);
  };

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>
        <span className={styles.titleIcon}>📍</span>
        Locations ({locations.length})
      </h3>
      <div className={styles.grid}>
        {locations.map((location) => (
          <button
            key={location.name}
            className={`${styles.locationCard} ${expandedLocation === location.name ? styles.expanded : ''}`}
            onClick={() => toggleLocation(location.name)}
          >
            <span className={styles.locationName}>{location.name}</span>
            {expandedLocation === location.name && (
              <div className={styles.roles}>
                {location.roles.map((role, index) => (
                  <span key={index} className={styles.role}>
                    {role}
                  </span>
                ))}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
