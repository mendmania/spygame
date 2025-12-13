'use client';

/**
 * Timer Component
 * 
 * Countdown timer for day discussion and voting phases.
 */

import { useState, useEffect } from 'react';
import styles from './Timer.module.css';

interface TimerProps {
  /** Time remaining in seconds */
  initialTime?: number;
  /** Whether the timer is running */
  isRunning?: boolean;
  /** Label to show above timer */
  label?: string;
}

export function Timer({
  initialTime = 300,
  isRunning = true,
  label = 'Time Remaining',
}: TimerProps) {
  const [displayTime, setDisplayTime] = useState(initialTime);

  // Sync with prop changes
  useEffect(() => {
    setDisplayTime(initialTime);
  }, [initialTime]);

  // Local countdown
  useEffect(() => {
    if (!isRunning || displayTime <= 0) return;

    const interval = setInterval(() => {
      setDisplayTime((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, displayTime > 0]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isLowTime = displayTime < 60 && displayTime > 0;
  const isExpired = displayTime === 0;

  return (
    <div className={`${styles.timer} ${isLowTime ? styles.lowTime : ''} ${isExpired ? styles.expired : ''}`}>
      {label && <div className={styles.label}>{label}</div>}
      <div className={styles.timerValue}>{formatTime(displayTime)}</div>
      {isExpired && <div className={styles.expiredText}>Time's up!</div>}
    </div>
  );
}
