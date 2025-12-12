'use client';

import { useState, useEffect } from 'react';
import styles from './Timer.module.css';

interface TimerProps {
  /** Time remaining in seconds (server-driven) */
  initialTime?: number;
  /** Whether the timer is running */
  isRunning?: boolean;
}

export function Timer({ initialTime = 480, isRunning = true }: TimerProps) {
  // Use the provided time directly (server-driven)
  // The hook updates this value every second
  const [displayTime, setDisplayTime] = useState(initialTime);

  // Sync with prop changes (server updates)
  useEffect(() => {
    setDisplayTime(initialTime);
  }, [initialTime]);

  // Local countdown for smooth UI (syncs every second from server)
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
      <div className={styles.timerIcon}>⏱️</div>
      <div className={styles.timerValue}>{formatTime(displayTime)}</div>
      {isExpired && <div className={styles.expiredText}>Time's up!</div>}
    </div>
  );
}
