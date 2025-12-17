'use client';

/**
 * NightActionPanel Component
 * 
 * Shows night action UI based on player's role.
 * Handles different action types for each role.
 * 
 * TURN ENFORCEMENT:
 * - Shows disabled state when it's not your role's turn
 * - Displays which role is currently acting
 * 
 * UI IMPROVEMENTS:
 * - Role image header with name and description
 * - Consistent button styling
 * - Clear call-to-action buttons
 */

import { useState } from 'react';
import Image from 'next/image';
import type {
  WerewolfRole,
  NightActionType,
  WerewolfNightActionResult,
  WerewolfActionResult,
} from '@vbz/shared-types';
import { getRoleEmoji, ROLE_CONFIGS, getRoleImagePath } from '../../constants/roles';
import styles from './NightActionPanel.module.css';

interface NightActionPanelProps {
  role: WerewolfRole;
  hasActed: boolean;
  nightResult: WerewolfNightActionResult | null;
  otherPlayers: Array<{ id: string; displayName: string }>;
  currentPlayerId: string;              // Current player's ID for self-targeting
  isPerforming: boolean;
  isMyTurn: boolean;                    // NEW: Whether it's this player's turn
  activeNightRole: WerewolfRole | null; // NEW: Currently acting role
  onPerformAction: (action: NightActionType, target?: string | string[]) => Promise<WerewolfActionResult>;
  onSkip: () => Promise<WerewolfActionResult>;
}

export function NightActionPanel({
  role,
  hasActed,
  nightResult,
  otherPlayers,
  currentPlayerId,
  isPerforming,
  isMyTurn,
  activeNightRole,
  onPerformAction,
  onSkip,
}: NightActionPanelProps) {
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [selectedCenterCards, setSelectedCenterCards] = useState<number[]>([]);
  const [actionMode, setActionMode] = useState<'player' | 'center' | null>(null);
  
  // Local state to remember that player completed their action this session
  // This survives server-side hasActed resets when advancing to next role
  const [completedActionLocally, setCompletedActionLocally] = useState(false);

  const config = ROLE_CONFIGS[role];
  const emoji = getRoleEmoji(role);
  const imagePath = getRoleImagePath(role);

  // Check if player has a persisted night result (this survives hasActed reset)
  // nightResult is stored in privatePlayerData and persists throughout the night
  const hasPersistedResult = nightResult && Object.keys(nightResult).length > 0 && !nightResult.isDiscoveryOnly;

  // Role header component with image
  const RoleHeader = () => (
    <div className={styles.roleHeader}>
      <div className={styles.roleImageContainer}>
        <Image
          src={imagePath}
          alt={config.name}
          width={56}
          height={56}
          className={styles.roleHeaderImage}
          unoptimized
        />
      </div>
      <div className={styles.roleHeaderInfo}>
        <h3 className={styles.roleHeaderTitle}>
          <span className={styles.roleHeaderEmoji}>{emoji}</span>
          {config.name}
        </h3>
        <p className={styles.roleHeaderAction}>{config.actionDescription || 'No special action'}</p>
      </div>
    </div>
  );

  // If we have a persisted result OR hasActed is true OR completed locally, show the result screen
  // This ensures the result stays visible even when hasActed is reset for the next role
  if (hasActed || hasPersistedResult || completedActionLocally) {
    return (
      <div className={styles.panel}>
        <RoleHeader />
        <div className={styles.completedSection}>
          <p className={styles.actionComplete}>✓ Night Action Complete</p>
          <NightActionResult role={role} result={nightResult} otherPlayers={otherPlayers} />
          <p className={styles.waiting}>Waiting for other players...</p>
        </div>
      </div>
    );
  }

  // If it's not this player's turn, show waiting state with active role info
  if (!isMyTurn) {
    return (
      <div className={styles.panel}>
        <RoleHeader />
        <div className={styles.waitingForTurn}>
          <p className={styles.notYourTurn}>🌙 Not your turn yet</p>
          <p className={styles.waitingMessage}>
            Keep your eyes closed. Your turn will come...
          </p>
        </div>
      </div>
    );
  }

  // Wrap action handlers to track local completion
  const wrappedPerformAction = async (action: NightActionType, target?: string | string[]) => {
    const result = await onPerformAction(action, target);
    // Mark as completed locally if action succeeded and wasn't just discovery
    if (result.success && action !== 'werewolf_discover' && action !== 'witch_peek') {
      setCompletedActionLocally(true);
    }
    return result;
  };

  const wrappedSkip = async () => {
    const result = await onSkip();
    if (result.success) {
      setCompletedActionLocally(true);
    }
    return result;
  };

  // Role-specific action UI
  const renderActionUI = () => {
    switch (role) {
      case 'werewolf':
        return <WerewolfAction
          nightResult={nightResult}
          otherPlayers={otherPlayers}
          selectedCenterCards={selectedCenterCards}
          onSelectCenterCard={(idx) => setSelectedCenterCards([idx])}
          onPerformAction={wrappedPerformAction}
          onSkip={wrappedSkip}
          isPerforming={isPerforming}
        />;

      case 'seer':
        return <SeerAction
          otherPlayers={otherPlayers}
          actionMode={actionMode}
          setActionMode={setActionMode}
          selectedTarget={selectedTarget}
          setSelectedTarget={setSelectedTarget}
          selectedCenterCards={selectedCenterCards}
          setSelectedCenterCards={setSelectedCenterCards}
          onPerformAction={wrappedPerformAction}
          isPerforming={isPerforming}
        />;

      case 'robber':
        return <RobberAction
          otherPlayers={otherPlayers}
          selectedTarget={selectedTarget}
          setSelectedTarget={setSelectedTarget}
          onPerformAction={wrappedPerformAction}
          onSkip={wrappedSkip}
          isPerforming={isPerforming}
        />;

      case 'troublemaker':
        return <TroublemakerAction
          otherPlayers={otherPlayers}
          selectedTargets={selectedTargets}
          setSelectedTargets={setSelectedTargets}
          onPerformAction={wrappedPerformAction}
          onSkip={wrappedSkip}
          isPerforming={isPerforming}
        />;

      // =====================
      // ADVANCED PACK 1 ROLES
      // =====================

      case 'minion':
        return <MinionAction
          otherPlayers={otherPlayers}
          onPerformAction={wrappedPerformAction}
          isPerforming={isPerforming}
        />;

      case 'mason':
        return <MasonAction
          otherPlayers={otherPlayers}
          onPerformAction={wrappedPerformAction}
          isPerforming={isPerforming}
        />;

      case 'drunk':
        return <DrunkAction
          selectedCenterCards={selectedCenterCards}
          onSelectCenterCard={(idx) => setSelectedCenterCards([idx])}
          onPerformAction={wrappedPerformAction}
          isPerforming={isPerforming}
        />;

      case 'insomniac':
        return <InsomniacAction
          onPerformAction={wrappedPerformAction}
          isPerforming={isPerforming}
        />;

      case 'witch':
        return <WitchAction
          otherPlayers={otherPlayers}
          currentPlayerId={currentPlayerId}
          selectedCenterCards={selectedCenterCards}
          setSelectedCenterCards={setSelectedCenterCards}
          selectedTarget={selectedTarget}
          setSelectedTarget={setSelectedTarget}
          onPerformAction={wrappedPerformAction}
          onSkip={wrappedSkip}
          isPerforming={isPerforming}
        />;

      case 'villager':
      default:
        return <VillagerAction onSkip={wrappedSkip} isPerforming={isPerforming} />;
    }
  };

  return (
    <div className={styles.panel}>
      <RoleHeader />
      <div className={styles.actionSection}>
        {renderActionUI()}
      </div>
    </div>
  );
}

// Werewolf action component
function WerewolfAction({
  nightResult,
  otherPlayers,
  selectedCenterCards,
  onSelectCenterCard,
  onPerformAction,
  onSkip,
  isPerforming,
}: {
  nightResult: WerewolfNightActionResult | null;
  otherPlayers: Array<{ id: string; displayName: string }>;
  selectedCenterCards: number[];
  onSelectCenterCard: (idx: number) => void;
  onPerformAction: (action: NightActionType, target?: string | string[]) => Promise<WerewolfActionResult>;
  onSkip: () => Promise<WerewolfActionResult>;
  isPerforming: boolean;
}) {
  // Local UI state: has the player clicked "Open Eyes"?
  const [hasOpenedEyes, setHasOpenedEyes] = useState(false);
  // Local state to store discovery result from server
  const [discoveryResult, setDiscoveryResult] = useState<WerewolfNightActionResult | null>(null);
  // Loading state for discovery
  const [isDiscovering, setIsDiscovering] = useState(false);
  // Local state to prevent double submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Use persisted nightResult if available, otherwise use local discovery result
  const effectiveResult = nightResult || discoveryResult;

  // Handler for "Open Eyes" - triggers local state change AND server call
  const handleOpenEyes = async () => {
    // Immediately update local UI state
    setHasOpenedEyes(true);
    setIsDiscovering(true);
    
    try {
      const result = await onPerformAction('werewolf_discover');
      if (result.success && result.data) {
        setDiscoveryResult(result.data as WerewolfNightActionResult);
      }
    } finally {
      setIsDiscovering(false);
    }
  };

  // Phase 0: Haven't clicked "Open Eyes" yet
  if (!hasOpenedEyes && !effectiveResult) {
    return (
      <div className={styles.actionContent}>
        <p className={styles.info}>
          Wake up and open your eyes. Look for other werewolves.
        </p>
        <button
          className={styles.actionButton}
          onClick={(e) => {
            e.preventDefault();
            handleOpenEyes();
          }}
          disabled={isPerforming}
        >
          👀 Open Eyes
        </button>
      </div>
    );
  }

  // Phase 1: Eyes opened, waiting for server to tell us about other werewolves
  if (hasOpenedEyes && !effectiveResult) {
    return (
      <div className={styles.actionContent}>
        <p className={styles.info}>Looking around the room...</p>
        <div className={styles.loading}>🔍</div>
      </div>
    );
  }

  const otherWerewolves = effectiveResult?.otherWerewolves || [];
  const werewolfNames = otherWerewolves
    .map(id => otherPlayers.find(p => p.id === id)?.displayName || 'Unknown')
    .filter(Boolean);

  // Phase 2a: Multiple werewolves found
  if (effectiveResult && otherWerewolves.length > 0) {
    // If this was discovery, need to confirm; if action complete, show result
    const isDiscovery = effectiveResult.isDiscoveryOnly;
    
    const handleConfirm = async () => {
      if (isSubmitting || isPerforming) return;
      setIsSubmitting(true);
      try {
        await onPerformAction('none');
      } finally {
        setIsSubmitting(false);
      }
    };
    
    return (
      <div className={styles.actionContent}>
        <p className={styles.info}>You see other werewolves in the room:</p>
        <div className={styles.revealedInfo}>
          🐺 {werewolfNames.map((name, i) => (
            <span key={i} className={styles.werewolfName}>
              {name}{i < werewolfNames.length - 1 ? ', ' : ''}
            </span>
          ))}
        </div>
        {isDiscovery ? (
          <button
            className={styles.actionButton}
            onClick={handleConfirm}
            disabled={isPerforming || isSubmitting}
          >
            {isPerforming || isSubmitting ? 'Confirming...' : 'Got it, close eyes'}
          </button>
        ) : (
          <p className={styles.hint}>Your action is complete. Close your eyes.</p>
        )}
      </div>
    );
  }

  // Phase 2b: Lone werewolf - action already complete (peeked or skipped)
  if (effectiveResult && !effectiveResult.isDiscoveryOnly) {
    return (
      <div className={styles.actionContent}>
        <p className={styles.info}>You are the only werewolf.</p>
        {effectiveResult.centerCardSeen ? (
          <div className={styles.revealedInfo}>
            🎴 You peeked at a center card: <strong>{effectiveResult.centerCardSeen}</strong>
          </div>
        ) : (
          <p className={styles.hint}>You chose not to peek at any center card.</p>
        )}
        <p className={styles.hint}>Your action is complete. Close your eyes.</p>
      </div>
    );
  }

  // Handlers for Phase 2c
  const handlePeek = async () => {
    if (isSubmitting || isPerforming || selectedCenterCards.length === 0) return;
    setIsSubmitting(true);
    try {
      await onPerformAction('werewolf_peek', selectedCenterCards[0]?.toString());
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    if (isSubmitting || isPerforming) return;
    setIsSubmitting(true);
    try {
      await onSkip();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Phase 2c: Lone werewolf - discovered they're alone, can now peek or skip
  return (
    <div className={styles.actionContent}>
      <p className={styles.info}>You are the only werewolf! You may look at one center card:</p>
      <div className={styles.centerCards}>
        {[0, 1, 2].map((idx) => (
          <button
            key={idx}
            className={`${styles.centerCard} ${selectedCenterCards.includes(idx) ? styles.selected : ''}`}
            onClick={() => onSelectCenterCard(idx)}
            disabled={isSubmitting || isPerforming}
          >
            Card {idx + 1}
          </button>
        ))}
      </div>
      <div className={styles.buttonGroup}>
        <button
          className={styles.actionButton}
          onClick={handlePeek}
          disabled={isPerforming || isSubmitting || selectedCenterCards.length === 0}
        >
          {isPerforming || isSubmitting ? 'Peeking...' : 'Peek'}
        </button>
        <button
          className={styles.skipButton}
          onClick={handleSkip}
          disabled={isPerforming || isSubmitting}
        >
          Skip (No Peek)
        </button>
      </div>
    </div>
  );
}

// Seer action component
function SeerAction({
  otherPlayers,
  actionMode,
  setActionMode,
  selectedTarget,
  setSelectedTarget,
  selectedCenterCards,
  setSelectedCenterCards,
  onPerformAction,
  isPerforming,
}: {
  otherPlayers: Array<{ id: string; displayName: string }>;
  actionMode: 'player' | 'center' | null;
  setActionMode: (mode: 'player' | 'center' | null) => void;
  selectedTarget: string | null;
  setSelectedTarget: (id: string | null) => void;
  selectedCenterCards: number[];
  setSelectedCenterCards: (cards: number[]) => void;
  onPerformAction: (action: NightActionType, target?: string | string[]) => Promise<WerewolfActionResult>;
  isPerforming: boolean;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleCenterCard = (idx: number) => {
    setSelectedCenterCards(
      selectedCenterCards.includes(idx)
        ? selectedCenterCards.filter((i) => i !== idx)
        : selectedCenterCards.length < 2
          ? [...selectedCenterCards, idx]
          : selectedCenterCards
    );
  };

  const handleViewPlayer = async () => {
    if (isSubmitting || isPerforming || !selectedTarget) return;
    setIsSubmitting(true);
    try {
      await onPerformAction('seer_player', selectedTarget);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewCenter = async () => {
    if (isSubmitting || isPerforming || selectedCenterCards.length !== 2) return;
    setIsSubmitting(true);
    try {
      await onPerformAction('seer_center', selectedCenterCards.map(String));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isBusy = isPerforming || isSubmitting;

  return (
    <div className={styles.actionContent}>
      {!actionMode && (
        <div className={styles.modeSelect}>
          <button
            className={styles.modeButton}
            onClick={() => {
              setActionMode('player');
            }}
            disabled={isBusy}
          >
            👤 Look at a Player's Card
          </button>
          <button
            className={styles.modeButton}
            onClick={() => {
              setActionMode('center');
            }}
            disabled={isBusy}
          >
            🎴 Look at 2 Center Cards
          </button>
        </div>
      )}

      {actionMode === 'player' && (
        <>
          <p className={styles.info}>Select a player to view their card:</p>
          <div className={styles.playerSelect}>
            {otherPlayers.map((p) => (
              <button
                key={p.id}
                className={`${styles.playerButton} ${selectedTarget === p.id ? styles.selected : ''}`}
                onClick={() => setSelectedTarget(p.id)}
                disabled={isBusy}
              >
                {p.displayName}
              </button>
            ))}
          </div>
          <div className={styles.buttonGroup}>
            <button
              className={styles.actionButton}
              onClick={handleViewPlayer}
              disabled={isBusy || !selectedTarget}
            >
              {isBusy ? 'Looking...' : 'View Card'}
            </button>
            <button
              className={styles.backButton}
              onClick={() => { setActionMode(null); setSelectedTarget(null); }}
              disabled={isBusy}
            >
              Back
            </button>
          </div>
        </>
      )}

      {actionMode === 'center' && (
        <>
          <p className={styles.info}>Select 2 center cards to view:</p>
          <div className={styles.centerCards}>
            {[0, 1, 2].map((idx) => (
              <button
                key={idx}
                className={`${styles.centerCard} ${selectedCenterCards.includes(idx) ? styles.selected : ''}`}
                onClick={() => toggleCenterCard(idx)}
                disabled={isBusy}
              >
                Card {idx + 1}
              </button>
            ))}
          </div>
          <div className={styles.buttonGroup}>
            <button
              className={styles.actionButton}
              onClick={handleViewCenter}
              disabled={isBusy || selectedCenterCards.length !== 2}
            >
              {isBusy ? 'Looking...' : 'View Cards'}
            </button>
            <button
              className={styles.backButton}
              onClick={() => { setActionMode(null); setSelectedCenterCards([]); }}
              disabled={isBusy}
            >
              Back
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Robber action component
function RobberAction({
  otherPlayers,
  selectedTarget,
  setSelectedTarget,
  onPerformAction,
  onSkip,
  isPerforming,
}: {
  otherPlayers: Array<{ id: string; displayName: string }>;
  selectedTarget: string | null;
  setSelectedTarget: (id: string | null) => void;
  onPerformAction: (action: NightActionType, target?: string | string[]) => Promise<WerewolfActionResult>;
  onSkip: () => Promise<WerewolfActionResult>;
  isPerforming: boolean;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isBusy = isPerforming || isSubmitting;

  const handleSwap = async () => {
    if (isBusy || !selectedTarget) return;
    setIsSubmitting(true);
    try {
      await onPerformAction('robber_swap', selectedTarget);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    if (isBusy) return;
    setIsSubmitting(true);
    try {
      await onSkip();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.actionContent}>
      <p className={styles.info}>Select a player to swap cards with:</p>
      <div className={styles.playerSelect}>
        {otherPlayers.map((p) => (
          <button
            key={p.id}
            className={`${styles.playerButton} ${selectedTarget === p.id ? styles.selected : ''}`}
            onClick={() => setSelectedTarget(p.id)}
            disabled={isBusy}
          >
            {p.displayName}
          </button>
        ))}
      </div>
      <div className={styles.buttonGroup}>
        <button
          className={styles.actionButton}
          onClick={handleSwap}
          disabled={isBusy || !selectedTarget}
        >
          {isBusy ? 'Swapping...' : 'Swap'}
        </button>
        <button
          className={styles.skipButton}
          onClick={handleSkip}
          disabled={isBusy}
        >
          Skip (Keep Role)
        </button>
      </div>
    </div>
  );
}

// Troublemaker action component
function TroublemakerAction({
  otherPlayers,
  selectedTargets,
  setSelectedTargets,
  onPerformAction,
  onSkip,
  isPerforming,
}: {
  otherPlayers: Array<{ id: string; displayName: string }>;
  selectedTargets: string[];
  setSelectedTargets: (ids: string[]) => void;
  onPerformAction: (action: NightActionType, target?: string | string[]) => Promise<WerewolfActionResult>;
  onSkip: () => Promise<WerewolfActionResult>;
  isPerforming: boolean;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isBusy = isPerforming || isSubmitting;

  const toggleTarget = (id: string) => {
    if (isBusy) return;
    setSelectedTargets(
      selectedTargets.includes(id)
        ? selectedTargets.filter((t) => t !== id)
        : selectedTargets.length < 2
          ? [...selectedTargets, id]
          : selectedTargets
    );
  };

  const handleSwap = async () => {
    if (isBusy || selectedTargets.length !== 2) return;
    setIsSubmitting(true);
    try {
      await onPerformAction('troublemaker_swap', selectedTargets);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    if (isBusy) return;
    setIsSubmitting(true);
    try {
      await onSkip();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.actionContent}>
      <p className={styles.info}>Select 2 players to swap their cards:</p>
      <div className={styles.playerSelect}>
        {otherPlayers.map((p) => (
          <button
            key={p.id}
            className={`${styles.playerButton} ${selectedTargets.includes(p.id) ? styles.selected : ''}`}
            onClick={() => toggleTarget(p.id)}
            disabled={isBusy}
          >
            {p.displayName}
            {selectedTargets.indexOf(p.id) >= 0 && (
              <span className={styles.selectOrder}>
                {selectedTargets.indexOf(p.id) + 1}
              </span>
            )}
          </button>
        ))}
      </div>
      <div className={styles.buttonGroup}>
        <button
          className={styles.actionButton}
          onClick={handleSwap}
          disabled={isBusy || selectedTargets.length !== 2}
        >
          {isBusy ? 'Swapping...' : 'Swap'}
        </button>
        <button
          className={styles.skipButton}
          onClick={handleSkip}
          disabled={isBusy}
        >
          Skip (No Swap)
        </button>
      </div>
    </div>
  );
}

// =====================
// ADVANCED PACK 1 ROLES
// =====================

// Minion action component
function MinionAction({
  otherPlayers,
  onPerformAction,
  isPerforming,
}: {
  otherPlayers: Array<{ id: string; displayName: string }>;
  onPerformAction: (action: NightActionType, target?: string | string[]) => Promise<WerewolfActionResult>;
  isPerforming: boolean;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isBusy = isPerforming || isSubmitting;

  const handleAction = async () => {
    if (isBusy) return;
    setIsSubmitting(true);
    try {
      await onPerformAction('minion_see');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.actionContent}>
      <p className={styles.info}>
        You are on the werewolf team, but you are NOT a werewolf yourself.
        The werewolves do not know who you are.
      </p>
      <p className={styles.hint}>
        If the werewolves are eliminated but you survive, you still lose!
        Help protect them during the day discussion.
      </p>
      <button
        className={styles.actionButton}
        onClick={handleAction}
        disabled={isBusy}
      >
        {isBusy ? 'Looking...' : 'See Werewolves'}
      </button>
    </div>
  );
}

// Mason action component  
function MasonAction({
  otherPlayers,
  onPerformAction,
  isPerforming,
}: {
  otherPlayers: Array<{ id: string; displayName: string }>;
  onPerformAction: (action: NightActionType, target?: string | string[]) => Promise<WerewolfActionResult>;
  isPerforming: boolean;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isBusy = isPerforming || isSubmitting;

  const handleAction = async () => {
    if (isBusy) return;
    setIsSubmitting(true);
    try {
      await onPerformAction('mason_see');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.actionContent}>
      <p className={styles.info}>
        Masons know each other. If there's another Mason, you'll see who they are.
        If you're alone, you'll know there's no other Mason among the players.
      </p>
      <button
        className={styles.actionButton}
        onClick={handleAction}
        disabled={isBusy}
      >
        {isBusy ? 'Looking...' : 'Find Other Mason'}
      </button>
    </div>
  );
}

// Drunk action component
function DrunkAction({
  selectedCenterCards,
  onSelectCenterCard,
  onPerformAction,
  isPerforming,
}: {
  selectedCenterCards: number[];
  onSelectCenterCard: (idx: number) => void;
  onPerformAction: (action: NightActionType, target?: string | string[]) => Promise<WerewolfActionResult>;
  isPerforming: boolean;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isBusy = isPerforming || isSubmitting;

  const handleSwap = async () => {
    if (isBusy || selectedCenterCards.length === 0) return;
    setIsSubmitting(true);
    try {
      await onPerformAction('drunk_swap', selectedCenterCards[0]?.toString());
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.actionContent}>
      <p className={styles.info}>
        You must swap your card with one center card.
        You will NOT see what role you become!
      </p>
      <div className={styles.centerCards}>
        {[0, 1, 2].map((idx) => (
          <button
            key={idx}
            className={`${styles.centerCard} ${selectedCenterCards.includes(idx) ? styles.selected : ''}`}
            onClick={() => onSelectCenterCard(idx)}
            disabled={isBusy}
          >
            Card {idx + 1}
          </button>
        ))}
      </div>
      <button
        className={styles.actionButton}
        onClick={handleSwap}
        disabled={isBusy || selectedCenterCards.length === 0}
      >
        {isBusy ? 'Swapping...' : 'Swap'}
      </button>
    </div>
  );
}

// Insomniac action component
function InsomniacAction({
  onPerformAction,
  isPerforming,
}: {
  onPerformAction: (action: NightActionType, target?: string | string[]) => Promise<WerewolfActionResult>;
  isPerforming: boolean;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isBusy = isPerforming || isSubmitting;

  const handleAction = async () => {
    if (isBusy) return;
    setIsSubmitting(true);
    try {
      await onPerformAction('insomniac_check');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.actionContent}>
      <p className={styles.info}>
        You wake up at the very end of night and look at your own card.
        This tells you if someone swapped your role during the night!
      </p>
      <button
        className={styles.actionButton}
        onClick={handleAction}
        disabled={isBusy}
      >
        {isBusy ? 'Checking...' : 'Check My Card'}
      </button>
    </div>
  );
}

// Witch action component
function WitchAction({
  otherPlayers,
  currentPlayerId,
  selectedCenterCards,
  setSelectedCenterCards,
  selectedTarget,
  setSelectedTarget,
  onPerformAction,
  onSkip,
  isPerforming,
}: {
  otherPlayers: Array<{ id: string; displayName: string }>;
  currentPlayerId: string;
  selectedCenterCards: number[];
  setSelectedCenterCards: (cards: number[]) => void;
  selectedTarget: string | null;
  setSelectedTarget: (id: string | null) => void;
  onPerformAction: (action: NightActionType, target?: string | string[]) => Promise<WerewolfActionResult>;
  onSkip: () => Promise<WerewolfActionResult>;
  isPerforming: boolean;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Phase: 'select' -> 'peeked' -> done
  const [phase, setPhase] = useState<'select' | 'peeked'>('select');
  // Store the peeked card info
  const [peekedCard, setPeekedCard] = useState<{ index: number; role: WerewolfRole } | null>(null);
  
  const isBusy = isPerforming || isSubmitting;

  const handlePeek = async () => {
    if (isBusy || selectedCenterCards.length === 0) return;
    setIsSubmitting(true);
    try {
      const result = await onPerformAction('witch_peek', selectedCenterCards[0]?.toString());
      if (result.success && result.data) {
        const data = result.data as WerewolfNightActionResult;
        if (data.witchPeekedCard) {
          setPeekedCard(data.witchPeekedCard);
          setPhase('peeked');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSwap = async () => {
    if (isBusy || !peekedCard || !selectedTarget) return;
    setIsSubmitting(true);
    try {
      await onPerformAction('witch_swap', [peekedCard.index.toString(), selectedTarget]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipSwap = async () => {
    if (isBusy || !peekedCard) return;
    setIsSubmitting(true);
    try {
      // Send witch_skip with the peeked card index so the result includes what was peeked
      await onPerformAction('witch_skip', peekedCard.index.toString());
    } finally {
      setIsSubmitting(false);
    }
  };

  // Phase 1: Select a center card to peek
  if (phase === 'select') {
    return (
      <div className={styles.actionContent}>
        <p className={styles.info}>
          Select one center card to peek at:
        </p>
        <div className={styles.centerCards}>
          {[0, 1, 2].map((idx) => (
            <button
              key={idx}
              className={`${styles.centerCard} ${selectedCenterCards.includes(idx) ? styles.selected : ''}`}
              onClick={() => setSelectedCenterCards([idx])}
              disabled={isBusy}
            >
              Card {idx + 1}
            </button>
          ))}
        </div>
        <button
          className={styles.actionButton}
          onClick={handlePeek}
          disabled={isBusy || selectedCenterCards.length === 0}
        >
          {isBusy ? 'Peeking...' : 'Peek at Card'}
        </button>
      </div>
    );
  }

  // Phase 2: Show the peeked card, optionally swap with a player
  return (
    <div className={styles.actionContent}>
      <div className={styles.revealedInfo}>
        🧙 Center Card {(peekedCard?.index ?? 0) + 1} is: <strong>{peekedCard?.role}</strong>
      </div>
      <p className={styles.info}>
        You may swap this card with any player (including yourself), or skip:
      </p>
      <div className={styles.playerSelect}>
        {/* Self option */}
        <button
          key="self"
          className={`${styles.playerButton} ${selectedTarget === currentPlayerId ? styles.selected : ''}`}
          onClick={() => setSelectedTarget(currentPlayerId)}
          disabled={isBusy}
        >
          Myself
        </button>
        {/* Other players */}
        {otherPlayers.map((p) => (
          <button
            key={p.id}
            className={`${styles.playerButton} ${selectedTarget === p.id ? styles.selected : ''}`}
            onClick={() => setSelectedTarget(p.id)}
            disabled={isBusy}
          >
            {p.displayName}
          </button>
        ))}
      </div>
      <div className={styles.buttonGroup}>
        <button
          className={styles.actionButton}
          onClick={handleSwap}
          disabled={isBusy || !selectedTarget}
        >
          {isBusy ? 'Swapping...' : 'Swap'}
        </button>
        <button
          className={styles.skipButton}
          onClick={handleSkipSwap}
          disabled={isBusy}
        >
          Skip (No Swap)
        </button>
      </div>
    </div>
  );
}

// Villager action component
function VillagerAction({
  onSkip,
  isPerforming,
}: {
  onSkip: () => Promise<WerewolfActionResult>;
  isPerforming: boolean;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isBusy = isPerforming || isSubmitting;

  const handleAction = async () => {
    if (isBusy) return;
    setIsSubmitting(true);
    try {
      await onSkip();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.actionContent}>
      <p className={styles.info}>You have no special night action. Rest well!</p>
      <button
        className={styles.actionButton}
        onClick={handleAction}
        disabled={isBusy}
      >
        {isBusy ? 'Confirming...' : 'Continue'}
      </button>
    </div>
  );
}

// Night action result display
function NightActionResult({
  role,
  result,
  otherPlayers,
}: {
  role: WerewolfRole;
  result: WerewolfNightActionResult | null;
  otherPlayers: Array<{ id: string; displayName: string }>;
}) {
  // Helper to get player name by ID
  const getPlayerName = (id: string) => 
    otherPlayers.find(p => p.id === id)?.displayName || 'Unknown';

  if (!result) {
    return <p className={styles.info}>No action taken.</p>;
  }

  return (
    <div className={styles.resultContent}>
      {result.otherWerewolves && result.otherWerewolves.length > 0 && (
        <div className={styles.resultItem}>
          <span className={styles.resultIcon}>🐺</span>
          <span>Other werewolf(s): {result.otherWerewolves.map(getPlayerName).join(', ')}</span>
        </div>
      )}
      {/* Check isLoneWolf flag as primary, fallback to checking empty array */}
      {(result.isLoneWolf || (result.otherWerewolves && result.otherWerewolves.length === 0)) && role === 'werewolf' && (
        <div className={styles.resultItem}>
          <span className={styles.resultIcon}>🐺</span>
          <span>You are the only werewolf</span>
        </div>
      )}
      {result.centerCardSeen && (
        <div className={styles.resultItem}>
          <span className={styles.resultIcon}>🎴</span>
          <span>Center card: <strong>{result.centerCardSeen}</strong></span>
        </div>
      )}
      {result.playerRoleSeen && (
        <div className={styles.resultItem}>
          <span className={styles.resultIcon}>👁️</span>
          <span>{getPlayerName(result.playerRoleSeen.playerId)} is the <strong>{result.playerRoleSeen.role}</strong></span>
        </div>
      )}
      {result.centerCardsSeen && (
        <div className={styles.resultItem}>
          <span className={styles.resultIcon}>👁️</span>
          <span>
            Center cards: {result.centerCardsSeen.map((c) => `Card ${c.index + 1}: ${c.role}`).join(', ')}
          </span>
        </div>
      )}
      {result.newRole && (
        <div className={styles.resultItem}>
          <span className={styles.resultIcon}>🦹</span>
          <span>
            {result.robbedPlayerId 
              ? `You robbed ${otherPlayers.find(p => p.id === result.robbedPlayerId)?.displayName || 'Unknown'} and became: `
              : 'Your new role: '}
            <strong>{result.newRole}</strong>
          </span>
        </div>
      )}
      {result.swappedPlayers && (
        <div className={styles.resultItem}>
          <span className={styles.resultIcon}>🃏</span>
          <span>Swapped {getPlayerName(result.swappedPlayers[0])} ↔ {getPlayerName(result.swappedPlayers[1])}</span>
        </div>
      )}
      {/* Advanced Pack 1 results */}
      {result.werewolvesSeen !== undefined && (
        <div className={styles.resultItem}>
          <span className={styles.resultIcon}>👹</span>
          <span>
            {result.werewolvesSeen.length > 0
              ? `Werewolf(s): ${result.werewolvesSeen.map(getPlayerName).join(', ')}`
              : 'There are no werewolves among the players!'}
          </span>
        </div>
      )}
      {result.otherMason !== undefined && (
        <div className={styles.resultItem}>
          <span className={styles.resultIcon}>🔨</span>
          <span>
            {result.otherMason
              ? `Fellow Mason: ${getPlayerName(result.otherMason)}`
              : 'You are the only Mason'}
          </span>
        </div>
      )}
      {result.centerCardSwapped !== undefined && (
        <div className={styles.resultItem}>
          <span className={styles.resultIcon}>🍺</span>
          <span>You drunkenly swapped your card with Center Card {result.centerCardSwapped + 1}</span>
        </div>
      )}
      {result.finalRole && (
        <div className={styles.resultItem}>
          <span className={styles.resultIcon}>😴</span>
          <span>Your final role: <strong>{result.finalRole}</strong></span>
        </div>
      )}
      {result.witchPeekedCard && (
        <div className={styles.resultItem}>
          <span className={styles.resultIcon}>🧙</span>
          <span>
            You peeked at Center Card {result.witchPeekedCard.index + 1}: <strong>{result.witchPeekedCard.role}</strong>
            {result.witchSwappedWith ? ` and swapped it with ${getPlayerName(result.witchSwappedWith)}` : ' (no swap)'}
          </span>
        </div>
      )}
    </div>
  );
}
