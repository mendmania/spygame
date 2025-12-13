'use client';

/**
 * NightActionPanel Component
 * 
 * Shows night action UI based on player's role.
 * Handles different action types for each role.
 */

import { useState } from 'react';
import type {
  WerewolfRole,
  NightActionType,
  WerewolfNightActionResult,
  WerewolfActionResult,
} from '@vbz/shared-types';
import { getRoleEmoji, ROLE_CONFIGS } from '../../constants/roles';
import styles from './NightActionPanel.module.css';

interface NightActionPanelProps {
  role: WerewolfRole;
  hasActed: boolean;
  nightResult: WerewolfNightActionResult | null;
  otherPlayers: Array<{ id: string; displayName: string }>;
  isPerforming: boolean;
  onPerformAction: (action: NightActionType, target?: string | string[]) => Promise<WerewolfActionResult>;
  onSkip: () => Promise<WerewolfActionResult>;
}

export function NightActionPanel({
  role,
  hasActed,
  nightResult,
  otherPlayers,
  isPerforming,
  onPerformAction,
  onSkip,
}: NightActionPanelProps) {
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [selectedCenterCards, setSelectedCenterCards] = useState<number[]>([]);
  const [actionMode, setActionMode] = useState<'player' | 'center' | null>(null);

  const config = ROLE_CONFIGS[role];
  const emoji = getRoleEmoji(role);

  // If already acted, show result
  if (hasActed) {
    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <span className={styles.emoji}>{emoji}</span>
          <h3 className={styles.title}>Night Action Complete</h3>
        </div>
        <NightActionResult role={role} result={nightResult} otherPlayers={otherPlayers} />
        <p className={styles.waiting}>Waiting for other players...</p>
      </div>
    );
  }

  // Role-specific action UI
  const renderActionUI = () => {
    switch (role) {
      case 'werewolf':
        return <WerewolfAction
          nightResult={nightResult}
          otherPlayers={otherPlayers}
          selectedCenterCards={selectedCenterCards}
          onSelectCenterCard={(idx) => setSelectedCenterCards([idx])}
          onPerformAction={onPerformAction}
          onSkip={onSkip}
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
          onPerformAction={onPerformAction}
          isPerforming={isPerforming}
        />;

      case 'robber':
        return <RobberAction
          otherPlayers={otherPlayers}
          selectedTarget={selectedTarget}
          setSelectedTarget={setSelectedTarget}
          onPerformAction={onPerformAction}
          onSkip={onSkip}
          isPerforming={isPerforming}
        />;

      case 'troublemaker':
        return <TroublemakerAction
          otherPlayers={otherPlayers}
          selectedTargets={selectedTargets}
          setSelectedTargets={setSelectedTargets}
          onPerformAction={onPerformAction}
          onSkip={onSkip}
          isPerforming={isPerforming}
        />;

      // =====================
      // ADVANCED PACK 1 ROLES
      // =====================

      case 'minion':
        return <MinionAction
          otherPlayers={otherPlayers}
          onPerformAction={onPerformAction}
          isPerforming={isPerforming}
        />;

      case 'mason':
        return <MasonAction
          otherPlayers={otherPlayers}
          onPerformAction={onPerformAction}
          isPerforming={isPerforming}
        />;

      case 'drunk':
        return <DrunkAction
          selectedCenterCards={selectedCenterCards}
          onSelectCenterCard={(idx) => setSelectedCenterCards([idx])}
          onPerformAction={onPerformAction}
          isPerforming={isPerforming}
        />;

      case 'insomniac':
        return <InsomniacAction
          onPerformAction={onPerformAction}
          isPerforming={isPerforming}
        />;

      case 'villager':
      default:
        return <VillagerAction onSkip={onSkip} isPerforming={isPerforming} />;
    }
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.emoji}>{emoji}</span>
        <h3 className={styles.title}>{config.name}</h3>
      </div>
      <p className={styles.actionDescription}>{config.actionDescription || 'No special action'}</p>
      {renderActionUI()}
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
          onClick={handleOpenEyes}
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
            onClick={() => onPerformAction('none')}
            disabled={isPerforming}
          >
            {isPerforming ? 'Confirming...' : 'Got it, close eyes'}
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
          >
            Card {idx + 1}
          </button>
        ))}
      </div>
      <div className={styles.buttonGroup}>
        <button
          className={styles.actionButton}
          onClick={() => onPerformAction('werewolf_peek', selectedCenterCards[0]?.toString())}
          disabled={isPerforming || selectedCenterCards.length === 0}
        >
          {isPerforming ? 'Peeking...' : 'Peek'}
        </button>
        <button
          className={styles.skipButton}
          onClick={onSkip}
          disabled={isPerforming}
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
  const toggleCenterCard = (idx: number) => {
    setSelectedCenterCards(
      selectedCenterCards.includes(idx)
        ? selectedCenterCards.filter((i) => i !== idx)
        : selectedCenterCards.length < 2
          ? [...selectedCenterCards, idx]
          : selectedCenterCards
    );
  };

  return (
    <div className={styles.actionContent}>
      {!actionMode && (
        <div className={styles.modeSelect}>
          <button
            className={styles.modeButton}
            onClick={() => setActionMode('player')}
          >
            👤 Look at a Player's Card
          </button>
          <button
            className={styles.modeButton}
            onClick={() => setActionMode('center')}
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
              >
                {p.displayName}
              </button>
            ))}
          </div>
          <div className={styles.buttonGroup}>
            <button
              className={styles.actionButton}
              onClick={() => onPerformAction('seer_player', selectedTarget!)}
              disabled={isPerforming || !selectedTarget}
            >
              {isPerforming ? 'Looking...' : 'View Card'}
            </button>
            <button
              className={styles.backButton}
              onClick={() => { setActionMode(null); setSelectedTarget(null); }}
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
              >
                Card {idx + 1}
              </button>
            ))}
          </div>
          <div className={styles.buttonGroup}>
            <button
              className={styles.actionButton}
              onClick={() => onPerformAction('seer_center', selectedCenterCards.map(String))}
              disabled={isPerforming || selectedCenterCards.length !== 2}
            >
              {isPerforming ? 'Looking...' : 'View Cards'}
            </button>
            <button
              className={styles.backButton}
              onClick={() => { setActionMode(null); setSelectedCenterCards([]); }}
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
  return (
    <div className={styles.actionContent}>
      <p className={styles.info}>Select a player to swap cards with:</p>
      <div className={styles.playerSelect}>
        {otherPlayers.map((p) => (
          <button
            key={p.id}
            className={`${styles.playerButton} ${selectedTarget === p.id ? styles.selected : ''}`}
            onClick={() => setSelectedTarget(p.id)}
          >
            {p.displayName}
          </button>
        ))}
      </div>
      <div className={styles.buttonGroup}>
        <button
          className={styles.actionButton}
          onClick={() => onPerformAction('robber_swap', selectedTarget!)}
          disabled={isPerforming || !selectedTarget}
        >
          {isPerforming ? 'Swapping...' : 'Swap'}
        </button>
        <button
          className={styles.skipButton}
          onClick={onSkip}
          disabled={isPerforming}
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
  const toggleTarget = (id: string) => {
    setSelectedTargets(
      selectedTargets.includes(id)
        ? selectedTargets.filter((t) => t !== id)
        : selectedTargets.length < 2
          ? [...selectedTargets, id]
          : selectedTargets
    );
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
          onClick={() => onPerformAction('troublemaker_swap', selectedTargets)}
          disabled={isPerforming || selectedTargets.length !== 2}
        >
          {isPerforming ? 'Swapping...' : 'Swap'}
        </button>
        <button
          className={styles.skipButton}
          onClick={onSkip}
          disabled={isPerforming}
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
        onClick={() => onPerformAction('minion_see')}
        disabled={isPerforming}
      >
        {isPerforming ? 'Looking...' : 'See Werewolves'}
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
  return (
    <div className={styles.actionContent}>
      <p className={styles.info}>
        Masons know each other. If there's another Mason, you'll see who they are.
        If you're alone, you'll know there's no other Mason among the players.
      </p>
      <button
        className={styles.actionButton}
        onClick={() => onPerformAction('mason_see')}
        disabled={isPerforming}
      >
        {isPerforming ? 'Looking...' : 'Find Other Mason'}
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
          >
            Card {idx + 1}
          </button>
        ))}
      </div>
      <button
        className={styles.actionButton}
        onClick={() => onPerformAction('drunk_swap', selectedCenterCards[0]?.toString())}
        disabled={isPerforming || selectedCenterCards.length === 0}
      >
        {isPerforming ? 'Swapping...' : 'Swap'}
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
  return (
    <div className={styles.actionContent}>
      <p className={styles.info}>
        You wake up at the very end of night and look at your own card.
        This tells you if someone swapped your role during the night!
      </p>
      <button
        className={styles.actionButton}
        onClick={() => onPerformAction('insomniac_check')}
        disabled={isPerforming}
      >
        {isPerforming ? 'Checking...' : 'Check My Card'}
      </button>
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
  return (
    <div className={styles.actionContent}>
      <p className={styles.info}>You have no special night action. Rest well!</p>
      <button
        className={styles.actionButton}
        onClick={onSkip}
        disabled={isPerforming}
      >
        {isPerforming ? 'Confirming...' : 'Continue'}
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
      {result.otherWerewolves && result.otherWerewolves.length === 0 && role === 'werewolf' && (
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
          <span>Your new role: <strong>{result.newRole}</strong></span>
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
    </div>
  );
}
