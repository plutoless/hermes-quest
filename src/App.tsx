import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, MouseEvent, PointerEvent } from 'react';
import {
  Hammer,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { useBridgeSnapshot } from './hooks/useBridgeSnapshot';
import {
  PixelAppWindow,
  PixelAvatar,
  PixelBadge,
  PixelButton,
  PixelChip,
  PixelCommandBar,
  PixelIcon,
  PixelInput,
  PixelLogList,
  PixelMascot,
  PixelPanel,
  PixelQuestCard,
  PixelReviewCard,
  PixelSelect,
  PixelTruthStrip,
} from './ui/pixel';
import type { BridgeConfig, BridgeMode } from './bridge/types';
import type { Agent, ReportCard, SystemStatus, Task, TimelineEvent } from './types';

const isPetWindowMode = () => new URLSearchParams(window.location.search).get('mode') === 'pet';
const isPixelShowcaseMode = () => window.location.pathname === '/pixel-ui-showcase';
const variantStorageKey = 'hermes-guild.jrpg-variant';
const petHandoffStorageKey = 'hermes-guild.pet-handoff';
type MainView = 'hall' | 'board' | 'review';

const uiVariants = [
  {
    id: 'royal-guild-hall',
    number: '01',
    name: 'Royal Guild Hall',
    className: 'variant-royal',
    preview: 'Classic heroic guild headquarters with noble parchment panels.',
  },
  {
    id: 'magitech-workshop',
    number: '02',
    name: 'Magitech Workshop',
    className: 'variant-magitech',
    preview: 'Arcane machine console with blueprint grids and rune-tech diagnostics.',
  },
  {
    id: 'moon-crystal-sanctuary',
    number: '03',
    name: 'Moon Crystal Sanctuary',
    className: 'variant-sanctuary',
    preview: 'Quiet moonlit temple with crystal frames and ceremonial review surfaces.',
  },
  {
    id: 'skyship-command-deck',
    number: '04',
    name: 'Skyship Command Deck',
    className: 'variant-skyship',
    preview: 'Low-density companion workbench with one active quest and a compact review log.',
  },
  {
    id: 'arcane-archive-library',
    number: '05',
    name: 'Arcane Archive Library',
    className: 'variant-archive',
    preview: 'Scholar guild ledgers, book panels, and annotated archive reports.',
  },
  {
    id: 'mercenary-camp',
    number: '06',
    name: 'Mercenary Camp',
    className: 'variant-camp',
    preview: 'Frontier outpost with notice-board quests and stamped field reports.',
  },
  {
    id: 'dungeon-strategy-terminal',
    number: '07',
    name: 'Dungeon Strategy Terminal',
    className: 'variant-dungeon',
    preview: 'Tactical dungeon console with grid-heavy logs and mission-clear results.',
  },
  {
    id: 'cozy-inn-guild',
    number: '08',
    name: 'Cozy Inn Guild',
    className: 'variant-inn',
    preview: 'Warm town inn guild base with soft ledgers and companion-forward pet mode.',
  },
] as const;

type VariantId = (typeof uiVariants)[number]['id'];

function isVariantId(value: string | null): value is VariantId {
  return uiVariants.some((variant) => variant.id === value);
}

function getInitialVariant(): VariantId {
  const params = new URLSearchParams(window.location.search);
  const queryVariant = params.get('variant');
  if (isVariantId(queryVariant)) return queryVariant;

  const storedVariant = window.localStorage.getItem(variantStorageKey);
  if (isVariantId(storedVariant)) return storedVariant;

  return 'skyship-command-deck';
}

function getInitialView(): MainView {
  const queryView = new URLSearchParams(window.location.search).get('view');
  if (queryView === 'board' || queryView === 'review') return queryView;
  return 'hall';
}

function persistVariant(variantId: VariantId) {
  window.localStorage.setItem(variantStorageKey, variantId);
  const url = new URL(window.location.href);
  url.searchParams.set('variant', variantId);
  window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
}

async function focusGuildHallWindow() {
  if (!('__TAURI_INTERNALS__' in window)) return false;

  const { invoke } = await import('@tauri-apps/api/core');
  await invoke('show_hall_window');
  return true;
}

async function focusGuildHallWindowWithWebviewFallback() {
  if (!('__TAURI_INTERNALS__' in window)) return false;

  const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
  const mainWindow = await WebviewWindow.getByLabel('main');
  if (!mainWindow) return false;

  await mainWindow.show();
  await mainWindow.unminimize();
  await mainWindow.setFocus();
  return true;
}

async function startPetWindowDrag() {
  if (!('__TAURI_INTERNALS__' in window) || !isPetWindowMode()) return;

  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  await getCurrentWindow().startDragging();
}

function writePetHandoff(view: MainView, taskId?: string) {
  window.localStorage.setItem(petHandoffStorageKey, JSON.stringify({ view, taskId, timestamp: Date.now() }));
}

const statusLabel: Record<string, string> = {
  idle: 'Idle',
  thinking: 'Thinking',
  running: 'Running',
  blocked: 'Blocked',
  needs_review: 'Needs Review',
  error: 'Error',
  created: 'Created',
  assigned: 'Assigned',
  approved: 'Approved',
};

const viewTitle = {
  hall: 'Guild Hall',
  board: 'Quest Board',
  review: 'Review Chamber',
};

const roleIcon = {
  Researcher: Search,
  Builder: Hammer,
  Reviewer: ShieldCheck,
};

const isActionableReportTask = (task: Task | undefined) => task?.state === 'needs_review' && task.reviewStatus === 'required';

const questLogLabel: Record<string, string> = {
  created: 'Quest posted',
  assigned: 'Assigned to character',
  started: 'Expedition started',
  progress: 'Field note',
  blocked: 'Route blocked',
  artifact: 'Artifact found',
  completed: 'Quest completed',
  review_required: 'Returned to Guild',
  approved: 'Quest accepted',
  revision_requested: 'Revision ordered',
  error: 'Quest failed',
};

const petStateCopy = {
  idle: {
    label: 'Ready',
    message: 'Ready for a quest.',
  },
  thinking: {
    label: 'Thinking',
    message: 'Thinking...',
  },
  running: {
    label: 'Running',
    message: 'Working on your quest.',
  },
  needs_review: {
    label: 'Review',
    message: 'A quest is ready.',
  },
  error: {
    label: 'Attention',
    message: 'Something needs attention.',
  },
};

function getExecutionSource(status: SystemStatus) {
  if (status.activeImplementation === 'real') return 'Real Hermes API';
  if (status.bridgeMode === 'auto' && status.activeImplementation === 'mock') return 'Mock fallback';
  if (status.activeImplementation === 'loading') return 'Bridge loading';
  return 'Mock bridge';
}

function App() {
  const { snapshot, lastEvent, bridge, bridgeReady, bridgeConfig, applyBridgeConfig } = useBridgeSnapshot();
  const [activeView, setActiveView] = useState<MainView>(getInitialView);
  const [petOnly] = useState(isPetWindowMode);
  const [selectedVariantId] = useState<VariantId>(getInitialVariant);
  const [selectedTaskId, setSelectedTaskId] = useState<string | undefined>();
  const [petInput, setPetInput] = useState('');
  const [boardInput, setBoardInput] = useState('');
  const [boardGoals, setBoardGoals] = useState('');
  const [boardNonGoals, setBoardNonGoals] = useState('');
  const [boardContext, setBoardContext] = useState('');
  const [boardDefinitionOfDone, setBoardDefinitionOfDone] = useState('');
  const [boardAssignee, setBoardAssignee] = useState(snapshot.activeProfileId);
  const [revisionText, setRevisionText] = useState('Make it shorter for a 5 minute demo.');
  const [draftBridgeConfig, setDraftBridgeConfig] = useState(bridgeConfig);

  const activeAgent = snapshot.agents.find((agent) => agent.id === snapshot.activeProfileId) ?? snapshot.agents[0];
  const tasks = snapshot.tasks;
  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? tasks[0],
    [selectedTaskId, tasks],
  );
  const activeQuest = tasks.find((task) => task.assigneeId === activeAgent.id && !['approved', 'needs_review'].includes(task.state));
  const pendingReports = snapshot.reports.filter((report) => {
    const task = tasks.find((item) => item.id === report.taskId);
    return isActionableReportTask(task);
  });
  const selectedVariant = uiVariants.find((variant) => variant.id === selectedVariantId) ?? uiVariants[0];

  useEffect(() => {
    setDraftBridgeConfig(bridgeConfig);
  }, [bridgeConfig]);

  useEffect(() => {
    persistVariant(selectedVariantId);
  }, [selectedVariantId]);

  useEffect(() => {
    if (petOnly) return undefined;

    const handlePetHandoff = (event: StorageEvent) => {
      if (event.key !== petHandoffStorageKey || !event.newValue) return;

      try {
        const handoff = JSON.parse(event.newValue) as { view?: MainView; taskId?: string };
        if (handoff.view !== 'hall' && handoff.view !== 'board' && handoff.view !== 'review') return;
        if (handoff.taskId) setSelectedTaskId(handoff.taskId);
        setActiveView(handoff.view);
      } catch {
        // Ignore malformed handoff values from older app sessions.
      }
    };

    window.addEventListener('storage', handlePetHandoff);
    return () => window.removeEventListener('storage', handlePetHandoff);
  }, [petOnly]);

  async function openMainView(view: MainView, taskId?: string) {
    writePetHandoff(view, taskId);
    const focusedNativeWindow = await focusGuildHallWindow()
      .catch(() => focusGuildHallWindowWithWebviewFallback())
      .catch(() => false);
    if (!focusedNativeWindow) {
      if (taskId) setSelectedTaskId(taskId);
      setActiveView(view);
    }
  }

  async function createPetQuest(options: { openHall?: boolean } = {}) {
    if (!petInput.trim()) return undefined;
    const taskId = bridge.submitTask
      ? await bridge.submitTask({ brief: petInput.trim(), assigneeId: activeAgent.id, type: 'pet' })
      : bridge.createTask({ brief: petInput.trim(), assigneeId: activeAgent.id, type: 'pet' });
    setSelectedTaskId(taskId);
    setPetInput('');
    if (options.openHall !== false) {
      setActiveView('board');
      void openMainView('board', taskId);
    }
    return taskId;
  }

  async function createBoardQuest() {
    if (!boardInput.trim()) return;
    const taskInput = {
      brief: boardInput.trim(),
      goals: boardGoals.trim() || undefined,
      nonGoals: boardNonGoals.trim() || undefined,
      context: boardContext.trim() || undefined,
      definitionOfDone: boardDefinitionOfDone.trim() || undefined,
      assigneeId: boardAssignee,
      type: 'quest_board' as const,
    };
    const taskId = bridge.submitTask ? await bridge.submitTask(taskInput) : bridge.createTask(taskInput);
    setSelectedTaskId(taskId);
    setBoardInput('');
    setBoardGoals('');
    setBoardNonGoals('');
    setBoardContext('');
    setBoardDefinitionOfDone('');
  }

  const openHall = async () => {
    await openMainView('hall');
  };

  if (!petOnly && isPixelShowcaseMode()) {
    return <PixelShowcase />;
  }

  if (petOnly) {
    return (
      <div className={`pet-window-shell ${selectedVariant.className}`} data-variant={selectedVariant.id}>
        <PetPanel
          activeAgent={activeAgent}
          activeQuest={activeQuest}
          tasks={tasks}
          pendingReports={pendingReports}
          petInput={petInput}
          onPetInput={setPetInput}
          onCreateQuest={() => createPetQuest({ openHall: false })}
          onOpenHall={openHall}
          onOpenBoard={() => openMainView('board', activeQuest?.id)}
          onOpenReview={() => openMainView('review')}
          onOpenIssue={() => openMainView('board', activeQuest?.id)}
          bridgeReady={bridgeReady}
          nativeDragEnabled={petOnly}
        />
      </div>
    );
  }

  if (activeView === 'hall') {
    return (
      <div className={`main-window-shell ${selectedVariant.className}`} data-variant={selectedVariant.id}>
        <GuildHall
          agents={snapshot.agents}
          activeAgent={activeAgent}
          activeQuest={activeQuest}
          pendingReports={pendingReports}
          tasks={tasks}
          systemStatus={snapshot.systemStatus}
          bridgeConfig={draftBridgeConfig}
          bridgeReady={bridgeReady}
          onBridgeConfigChange={setDraftBridgeConfig}
          onApplyBridgeConfig={() => applyBridgeConfig(draftBridgeConfig)}
          onSelectAgent={(agentId) => {
            bridge.setActiveProfile(agentId);
            setBoardAssignee(agentId);
          }}
          onOpenTask={(taskId) => {
            setSelectedTaskId(taskId);
            setActiveView('board');
          }}
          onOpenBoard={() => setActiveView('board')}
          onOpenReview={() => setActiveView('review')}
          revisionText={revisionText}
          onRevisionText={setRevisionText}
          onApprove={(reportId) => bridge.approveReport(reportId)}
          onRevise={(reportId) => {
            bridge.requestRevision(reportId, revisionText);
            setActiveView('board');
          }}
          commandValue={petInput}
          onCommandValue={setPetInput}
          onCreateQuest={createPetQuest}
        />
      </div>
    );
  }

  return (
    <div className={`main-window-shell ${selectedVariant.className}`} data-variant={selectedVariant.id}>
      <PixelAppWindow
        className="pixel-guild-window pixel-workbench-window"
        title="Hermes Guild"
        subtitle={`${viewTitle[activeView]} · Companion Workbench`}
        status={
          <BridgeStatusDetails
            status={snapshot.systemStatus}
            config={draftBridgeConfig}
            bridgeReady={bridgeReady}
            onConfigChange={setDraftBridgeConfig}
            onApply={() => applyBridgeConfig(draftBridgeConfig)}
          />
        }
        toolbar={
          <AppHeader
            activeView={activeView}
            pendingCount={pendingReports.length}
            onOpenHall={() => setActiveView('hall')}
            onOpenBoard={() => setActiveView('board')}
            onOpenReview={() => setActiveView('review')}
          />
        }
      >
        <main className="workbench-screen">

        {activeView === 'board' && (
          <QuestBoard
            agents={snapshot.agents}
            tasks={tasks}
            selectedTask={selectedTask}
            systemStatus={snapshot.systemStatus}
            boardInput={boardInput}
            boardGoals={boardGoals}
            boardNonGoals={boardNonGoals}
            boardContext={boardContext}
            boardDefinitionOfDone={boardDefinitionOfDone}
            boardAssignee={boardAssignee}
            onBoardInput={setBoardInput}
            onBoardGoals={setBoardGoals}
            onBoardNonGoals={setBoardNonGoals}
            onBoardContext={setBoardContext}
            onBoardDefinitionOfDone={setBoardDefinitionOfDone}
            onBoardAssignee={setBoardAssignee}
            onCreateQuest={createBoardQuest}
            onSelectTask={setSelectedTaskId}
            bridgeReady={bridgeReady}
          />
        )}

        {activeView === 'review' && (
          <ReviewChamber
            reports={snapshot.reports}
            tasks={tasks}
            agents={snapshot.agents}
            revisionText={revisionText}
            onRevisionText={setRevisionText}
            onApprove={(reportId) => bridge.approveReport(reportId)}
            onRevise={(reportId) => {
              bridge.requestRevision(reportId, revisionText);
              setActiveView('board');
            }}
          />
        )}

        {lastEvent && (
          <footer className="event-footer">
            <span>{statusLabel[lastEvent.type] ?? lastEvent.type.replaceAll('_', ' ')}</span>
            <time>{new Date(lastEvent.timestamp).toLocaleTimeString()}</time>
          </footer>
        )}
        </main>
      </PixelAppWindow>
    </div>
  );
}

interface AppHeaderProps {
  activeView: MainView;
  pendingCount: number;
  onOpenHall: () => void;
  onOpenBoard: () => void;
  onOpenReview: () => void;
}

function AppHeader({ activeView, pendingCount, onOpenHall, onOpenBoard, onOpenReview }: AppHeaderProps) {
  return (
    <div className="pixel-main-toolbar app-header">
      <span>{viewTitle[activeView]}</span>
      <div>
        <PixelButton type="button" tone={activeView === 'hall' ? 'primary' : 'ghost'} onClick={onOpenHall}>
          <PixelIcon name="guild-hall" size={18} /> Guild Hall
        </PixelButton>
        <PixelButton type="button" tone={activeView === 'board' ? 'primary' : 'ghost'} onClick={onOpenBoard}>
          <PixelIcon name="quest-board" size={18} /> Quest Board
        </PixelButton>
        <PixelButton type="button" tone={activeView === 'review' ? 'primary' : 'ghost'} onClick={onOpenReview}>
          <PixelIcon name="review" size={18} /> Review
          {pendingCount > 0 && <strong className="pixel-toolbar-count">{pendingCount}</strong>}
        </PixelButton>
      </div>
    </div>
  );
}

interface BridgeStatusDetailsProps {
  status: SystemStatus;
  config: BridgeConfig;
  bridgeReady: boolean;
  onConfigChange: (config: BridgeConfig) => void;
  onApply: () => void;
}

function BridgeStatusDetails({ status, config, bridgeReady, onConfigChange, onApply }: BridgeStatusDetailsProps) {
  const bridgeModeLabel = status.bridgeMode.slice(0, 1).toUpperCase() + status.bridgeMode.slice(1);
  const bridgeFallbackLabel = status.fallbackReason
    ? status.activeImplementation === 'mock'
      ? 'Mock fallback'
      : 'Fallback active'
    : getExecutionSource(status);

  return (
    <details className="pixel-bridge-status">
      <summary>
        <span>Bridge:</span> {bridgeModeLabel} · {bridgeFallbackLabel}
      </summary>
      <div className="pixel-bridge-settings">
        <label>
          Bridge mode
          <PixelSelect
            value={config.bridgeMode}
            onChange={(bridgeMode) => onConfigChange({ ...config, bridgeMode: bridgeMode as BridgeMode })}
            ariaLabel="Bridge mode"
          >
            <option value="mock">mock</option>
            <option value="auto">auto</option>
            <option value="real">real</option>
          </PixelSelect>
        </label>
        <PixelButton type="button" tone="ghost" onClick={onApply} disabled={!bridgeReady}>
          Save
        </PixelButton>
        <PixelBadge status={status.activeImplementation}>Hermes {status.hermesAvailable}</PixelBadge>
      </div>
    </details>
  );
}

interface PetPanelProps {
  activeAgent: Agent;
  activeQuest?: Task;
  tasks: Task[];
  pendingReports: ReportCard[];
  petInput: string;
  onPetInput: (value: string) => void;
  onCreateQuest: () => string | void | Promise<string | void>;
  onOpenHall: () => void | Promise<void>;
  onOpenBoard: () => void | Promise<void>;
  onOpenReview: () => void | Promise<void>;
  onOpenIssue: () => void | Promise<void>;
  bridgeReady: boolean;
  nativeDragEnabled: boolean;
}

function PetPanel({
  activeAgent,
  activeQuest,
  tasks,
  pendingReports,
  petInput,
  onPetInput,
  onCreateQuest,
  onOpenHall,
  onOpenBoard,
  onOpenReview,
  onOpenIssue,
  bridgeReady,
  nativeDragEnabled,
}: PetPanelProps) {
  const [expanded, setExpanded] = useState(() => new URLSearchParams(window.location.search).get('pet') === 'expanded');
  const [chatState, setChatState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [chatMessages, setChatMessages] = useState<PetChatMessage[]>([]);
  const [lastSubmittedTaskId, setLastSubmittedTaskId] = useState<string | undefined>();
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const pointerDraggingRef = useRef(false);
  const suppressNextClickRef = useRef(false);
  const lastDerivedMessageKeyRef = useRef<string | undefined>(undefined);
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const chatBubbleRef = useRef<HTMLFormElement | null>(null);
  const petCharacterRef = useRef<HTMLButtonElement | null>(null);
  const petInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const petState = getPetDisplayState(activeAgent, activeQuest, pendingReports.length);
  const copy = petStateCopy[petState];
  const avatarClass = getPetAvatarAssetClass(activeAgent.role, petState);

  useEffect(() => {
    const derivedMessage = getPetAgentResponse({ activeAgent, activeQuest, pendingReports, tasks, lastSubmittedTaskId });
    if (!derivedMessage || derivedMessage.key === lastDerivedMessageKeyRef.current) return;

    lastDerivedMessageKeyRef.current = derivedMessage.key;
    setChatMessages((messages) => trimPetMessages([...messages, derivedMessage.message]));
    if (derivedMessage.state) {
      setChatState(derivedMessage.state);
    }
  }, [activeAgent, activeQuest, lastSubmittedTaskId, pendingReports, tasks]);

  useEffect(() => {
    if (!expanded || !messageListRef.current) return;
    messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
  }, [chatMessages, expanded]);

  useEffect(() => {
    if (!expanded) return undefined;
    const frame = requestAnimationFrame(() => petInputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return undefined;

    const handleOutsideClick = (event: globalThis.MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (chatBubbleRef.current?.contains(target)) return;
      if (petCharacterRef.current?.contains(target)) return;
      setExpanded(false);
    };

    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [expanded]);

  const appendPetMessage = (message: PetChatMessage) => {
    setChatMessages((messages) => trimPetMessages([...messages, message]));
  };

  const handleCreateQuest = async () => {
    const submittedText = petInput.trim();
    if (!submittedText || chatState === 'sending') return;
    const submittedAt = Date.now();
    setExpanded(true);
    setChatState('sending');
    setChatMessages([
      {
        id: `user-${submittedAt}`,
        speaker: 'user',
        text: submittedText,
      },
    ]);
    try {
      const taskId = await onCreateQuest();
      if (taskId) {
        setLastSubmittedTaskId(taskId);
      }
      setChatState('sent');
    } catch {
      setChatState('error');
      appendPetMessage({
        id: `agent-error-${Date.now()}`,
        speaker: 'agent',
        text: 'I could not send that quest. Open Hall for details if it keeps failing.',
        tone: 'error',
      });
    }
  };

  const handlePetClick = (event?: MouseEvent<HTMLElement>) => {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      event?.preventDefault();
      event?.stopPropagation();
      return;
    }
    event?.stopPropagation();
    setExpanded((isExpanded) => !isExpanded);
  };

  const handleWidgetClick = () => {
    if (!expanded) return;
    setExpanded(false);
  };

  const handleDoubleClick = () => {
    void onOpenHall();
  };

  const handlePointerDown = (event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
    pointerDraggingRef.current = false;
  };

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    if (!pointerStartRef.current) return;
    const deltaX = Math.abs(event.clientX - pointerStartRef.current.x);
    const deltaY = Math.abs(event.clientY - pointerStartRef.current.y);
    if (deltaX + deltaY < 7) return;
    pointerDraggingRef.current = true;
    suppressNextClickRef.current = true;
    pointerStartRef.current = null;
    if (nativeDragEnabled) {
      void startPetWindowDrag();
    }
  };

  const handlePointerUp = () => {
    if (pointerDraggingRef.current) {
      suppressNextClickRef.current = true;
    }
    pointerStartRef.current = null;
    pointerDraggingRef.current = false;
  };

  const handoffAction =
    petState === 'needs_review'
      ? { label: 'Review', icon: 'review' as const, action: onOpenReview }
      : petState === 'error'
        ? { label: 'Issue', icon: 'warning' as const, action: onOpenIssue }
        : petState === 'running' || petState === 'thinking'
          ? { label: 'Progress', icon: 'quest-log' as const, action: onOpenBoard }
          : { label: 'Hall', icon: 'guild-hall' as const, action: onOpenHall };

  return (
    <aside
      className={`pet-widget ${expanded ? 'bubble-open' : 'collapsed'} pet-state-${petState}`}
      aria-label={`${activeAgent.name} companion, ${copy.label}`}
      onDoubleClick={handleDoubleClick}
      onClick={handleWidgetClick}
    >
      <button
        ref={petCharacterRef}
        type="button"
        className="pet-character"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handlePetClick}
        aria-label={`${activeAgent.name}: ${copy.message}`}
      >
        <span className="pet-state-ring" aria-hidden="true" />
        <span className={`pet-character-sprite ${avatarClass}`} aria-hidden="true" />
      </button>

      {expanded && (
        <form
          ref={chatBubbleRef}
          className={`pet-chat-bubble pet-chat-${chatState}`}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            void handleCreateQuest();
          }}
        >
          <div className="pet-message-list" ref={messageListRef} aria-live="polite">
            {chatMessages.map((message) => (
              <div key={message.id} className={`pet-message pet-message-${message.speaker} ${message.tone ? `pet-message-${message.tone}` : ''}`}>
                <span className="pet-message-speaker">{message.speaker === 'user' ? 'You' : activeAgent.name}</span>
                <p>{message.text}</p>
              </div>
            ))}
          </div>
          <div className="pet-chat-tray">
            {activeQuest && (
              <div className="pet-chat-status" aria-label={`${activeQuest.title}: ${activeQuest.progress}% ${activeQuest.state.replace('_', ' ')}`}>
                <span>{activeQuest.progress}%</span>
                <span>{activeQuest.state.replace('_', ' ')}</span>
              </div>
            )}
            <div className="pet-chat-row">
              <PixelInput
                className="pet-command-input"
                value={petInput}
                onChange={onPetInput}
                placeholder="Ask Hermes..."
                ariaLabel="Pet quick chat"
                inputRef={petInputRef}
              />
              <PixelButton
                className="pet-send-chip"
                type="submit"
                tone="primary"
                disabled={!bridgeReady || !petInput.trim() || chatState === 'sending'}
              >
                <PixelIcon name="send" size={15} /> Send
              </PixelButton>
            </div>
            <div className="pet-action-row" aria-label="Pet quick actions">
              <button type="button" className="pet-action-chip" onClick={() => handoffAction.action()}>
                <PixelIcon name={handoffAction.icon} size={13} /> {handoffAction.label === 'Hall' ? 'Open Hall' : handoffAction.label}
              </button>
            </div>
          </div>
        </form>
      )}
    </aside>
  );
}

type PetDisplayState = 'idle' | 'thinking' | 'running' | 'needs_review' | 'error';

type PetChatMessage = {
  id: string;
  speaker: 'agent' | 'user';
  text: string;
  tone?: PetDisplayState | 'review' | 'completed';
};

function trimPetMessages(messages: PetChatMessage[]) {
  const deduped = messages.filter((message, index, collection) => collection.findIndex((item) => item.id === message.id) === index);
  return deduped.slice(-3);
}

function excerptPetText(text: string, maxLength = 190) {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (compact.length <= maxLength) return compact;
  return `${compact.slice(0, maxLength - 1).trimEnd()}...`;
}

function isPetVisibleTimelineEvent(event: TimelineEvent) {
  if (event.source === 'guild' || event.source === 'bridge') return false;
  const normalized = event.message.toLowerCase();
  return ![
    'started hermes api run',
    'hermes api streamed response text',
    'hermes api run completed',
    'captured final hermes output as a review artifact',
  ].some((blocked) => normalized.includes(blocked));
}

export function getPetAgentResponse({
  activeAgent,
  activeQuest,
  pendingReports,
  tasks,
  lastSubmittedTaskId,
}: {
  activeAgent: Agent;
  activeQuest?: Task;
  pendingReports: ReportCard[];
  tasks: Task[];
  lastSubmittedTaskId?: string;
}): { key: string; state?: 'sent' | 'error'; message: PetChatMessage } | undefined {
  const matchingReport = lastSubmittedTaskId
    ? pendingReports.find((report) => report.taskId === lastSubmittedTaskId)
    : pendingReports[0];

  if (matchingReport) {
    const reportTask = tasks.find((task) => task.id === matchingReport.taskId);
    const artifactOutput = matchingReport.artifacts.find((artifact) => artifact.kind === 'summary')?.description;
    const output = matchingReport.summary || artifactOutput;
    if (!output) return undefined;
    return {
      key: `report-${matchingReport.id}-${matchingReport.summary.length}-${artifactOutput?.length ?? 0}`,
      state: 'sent',
      message: {
        id: `agent-report-${matchingReport.id}`,
        speaker: 'agent',
        text: excerptPetText(output),
        tone: reportTask?.state === 'approved' ? 'completed' : 'review',
      },
    };
  }

  const trackedTask = (lastSubmittedTaskId ? tasks.find((task) => task.id === lastSubmittedTaskId) : undefined) ?? activeQuest;
  if (!trackedTask) return undefined;

  if (trackedTask.state === 'error') {
    const errorText = trackedTask.error ?? trackedTask.timeline.at(-1)?.message ?? 'Something needs attention.';
    return {
      key: `task-error-${trackedTask.id}-${trackedTask.updatedAt}-${errorText}`,
      state: 'error',
      message: {
        id: `agent-error-${trackedTask.id}-${trackedTask.updatedAt}`,
        speaker: 'agent',
        text: excerptPetText(errorText, 150),
        tone: 'error',
      },
    };
  }

  const latestUsefulEvent = [...trackedTask.timeline]
    .reverse()
    .find((event) => isPetVisibleTimelineEvent(event) && event.message.trim().length > 0);

  if (latestUsefulEvent) {
    const eventText = latestUsefulEvent.message;
    return {
      key: `task-event-${trackedTask.id}-${latestUsefulEvent.id}-${trackedTask.progress}`,
      state: 'sent',
      message: {
        id: `agent-event-${latestUsefulEvent.id}`,
        speaker: 'agent',
        text: excerptPetText(eventText, 160),
        tone: trackedTask.state === 'needs_review' ? 'review' : trackedTask.state === 'running' ? 'running' : 'thinking',
      },
    };
  }

  return undefined;
}

function getPetDisplayState(activeAgent: Agent, activeQuest: Task | undefined, pendingReportCount: number): PetDisplayState {
  if (activeQuest?.state === 'error' || activeAgent.status === 'error') return 'error';
  if (pendingReportCount > 0 || activeAgent.status === 'needs_review') return 'needs_review';
  if (activeQuest?.state === 'running' || activeAgent.status === 'running') return 'running';
  if (activeQuest?.state === 'created' || activeQuest?.state === 'assigned' || activeAgent.status === 'thinking') return 'thinking';
  return 'idle';
}

function getPetAvatarAssetClass(role: Agent['role'], petState: PetDisplayState) {
  const roleAsset = role === 'Builder' ? 'builder' : role === 'Reviewer' ? 'scribe' : role === 'Researcher' ? 'scout' : 'gatherer';
  const stateAsset = petState === 'needs_review' ? 'needs-review' : petState === 'running' ? 'running' : petState === 'error' ? 'error' : 'idle';
  return `pet-avatar-${roleAsset}-${stateAsset}`;
}

interface GuildHallProps {
  agents: Agent[];
  activeAgent: Agent;
  activeQuest?: Task;
  pendingReports: ReportCard[];
  tasks: Task[];
  systemStatus: SystemStatus;
  bridgeConfig: BridgeConfig;
  onSelectAgent: (agentId: string) => void;
  onOpenTask: (taskId: string) => void;
  onOpenBoard: () => void;
  onOpenReview: () => void;
  onBridgeConfigChange: (config: BridgeConfig) => void;
  onApplyBridgeConfig: () => void;
  revisionText: string;
  onRevisionText: (value: string) => void;
  onApprove: (reportId: string) => void;
  onRevise: (reportId: string) => void;
  commandValue: string;
  onCommandValue: (value: string) => void;
  onCreateQuest: () => void;
  bridgeReady: boolean;
}

function GuildHall({
  agents,
  activeAgent,
  activeQuest,
  pendingReports,
  tasks,
  systemStatus,
  bridgeConfig,
  onSelectAgent,
  onOpenTask,
  onOpenBoard,
  onOpenReview,
  onBridgeConfigChange,
  onApplyBridgeConfig,
  revisionText,
  onRevisionText,
  onApprove,
  onRevise,
  commandValue,
  onCommandValue,
  onCreateQuest,
  bridgeReady,
}: GuildHallProps) {
  const latestReport = pendingReports[0];
  const latestReportTask = tasks.find((task) => task.id === latestReport?.taskId);
  const logTask = activeQuest ?? latestReportTask ?? tasks[0];
  const recentEvents = logTask?.timeline.slice(-4).reverse() ?? [];
  const reportProvenance = latestReportTask?.timeline.some((event) => event.source === 'hermes') ? 'Real Hermes output' : 'Mock / Guild-generated report';
  const activeTaskRelation = activeQuest?.title ?? latestReportTask?.title ?? 'Standing by';
  const activeQuestCount = tasks.filter((task) => task.state === 'running' || task.state === 'assigned').length;
  const logEntries = recentEvents.map((event) => ({
    id: event.id,
    title: questLogLabel[event.type] ?? event.type.replaceAll('_', ' '),
    detail: event.message,
    time: new Date(event.timestamp).toLocaleTimeString(),
    status: event.type,
  }));
  const guildLogEntries =
    logEntries.length > 0
      ? logEntries
      : [
          {
            id: 'guild-ready',
            title: `${activeAgent.name} ready`,
            detail: `New quests route to ${activeAgent.role} unless reassigned.`,
            time: 'Now',
            status: activeAgent.status,
          },
          {
            id: 'guild-bridge',
            title: 'Bridge checked',
            detail: `${systemStatus.bridgeMode} mode using ${getExecutionSource(systemStatus)}.`,
            time: 'Live',
            status: systemStatus.activeImplementation,
          },
          {
            id: 'guild-review',
            title: 'Review inbox',
            detail: `${pendingReports.length} returned quest${pendingReports.length === 1 ? '' : 's'} waiting.`,
            time: 'Live',
            status: pendingReports.length > 0 ? 'needs_review' : 'idle',
          },
        ];
  const bridgeModeLabel = systemStatus.bridgeMode.slice(0, 1).toUpperCase() + systemStatus.bridgeMode.slice(1);
  const bridgeFallbackLabel = systemStatus.fallbackReason
    ? systemStatus.activeImplementation === 'mock'
      ? 'Mock fallback'
      : 'Fallback active'
    : getExecutionSource(systemStatus);
  const bridgeHealthLabel = `Hermes ${systemStatus.hermesAvailable}`;
  const suggestedPrompts = ['Prepare a demo brief', 'Summarize recent notes', 'Review returned quests'];
  const updateBridgeMode = (bridgeMode: BridgeMode) => onBridgeConfigChange({ ...bridgeConfig, bridgeMode });

  return (
    <PixelAppWindow
      className="pixel-guild-window"
      title="Hermes Guild"
      subtitle="Guild Hall · Companion Workbench"
      status={
        <details className="pixel-bridge-status">
          <summary>
            <span>Bridge:</span> {bridgeModeLabel} · {bridgeFallbackLabel}
          </summary>
          <div className="pixel-bridge-settings">
            <label>
              Bridge mode
              <PixelSelect value={bridgeConfig.bridgeMode} onChange={(bridgeMode) => updateBridgeMode(bridgeMode as BridgeMode)} ariaLabel="Bridge mode">
                <option value="mock">mock</option>
                <option value="auto">auto</option>
                <option value="real">real</option>
              </PixelSelect>
            </label>
            <PixelButton type="button" tone="ghost" onClick={onApplyBridgeConfig} disabled={!bridgeReady}>
              Save
            </PixelButton>
            <PixelBadge status={systemStatus.activeImplementation}>{bridgeHealthLabel}</PixelBadge>
          </div>
        </details>
      }
      toolbar={
        <div className="pixel-main-toolbar">
          <span>Guild Hall</span>
          <div>
            <PixelButton type="button" tone="ghost" onClick={onOpenBoard}>
              <PixelIcon name="quest-board" size={18} /> Quest Board
            </PixelButton>
            <PixelButton type="button" tone="ghost" onClick={onOpenReview}>
              <PixelIcon name="review" size={18} /> Review
              {pendingReports.length > 0 && <strong className="pixel-toolbar-count">{pendingReports.length}</strong>}
            </PixelButton>
          </div>
        </div>
      }
      commandBar={
        <PixelCommandBar
          value={commandValue}
          onChange={onCommandValue}
          onSubmit={onCreateQuest}
          disabled={!bridgeReady}
          hint={`${activeAgent.name} / ${activeAgent.role}`}
          placeholder="Ask Hermes to do something..."
          secondaryAction={
            <PixelButton type="button" tone="secondary" onClick={onOpenReview}>
              <PixelIcon name="review" size={18} /> Review
            </PixelButton>
          }
        />
      }
    >
      <header className="pixel-guild-summary">
        <div>
          <h1>Guild Hall</h1>
          <p>{activeAgent.name} is ready for direct quest work. Returned results stay one review action away.</p>
        </div>
        <div className="pixel-guild-kpis" aria-label="Guild Hall summary">
          <span>
            <strong>{pendingReports.length}</strong>
            pending review{pendingReports.length === 1 ? '' : 's'}
          </span>
          <span>
            <strong>{activeQuestCount}</strong>
            active quest{activeQuestCount === 1 ? '' : 's'}
          </span>
        </div>
      </header>

      <section className="pixel-guild-layout">
        <PixelPanel className="pixel-companion-card" title="Active Companion" icon={<PixelIcon name="companion" size={20} />}>
          <div className="pixel-companion-top">
            <PixelAvatar
              className="pixel-companion-portrait"
              name={activeAgent.name}
              role={activeAgent.role}
              status={activeAgent.status}
            />
            <div>
              <h2>{activeAgent.name}</h2>
              <p>{activeAgent.role} class</p>
              <PixelBadge status={activeAgent.status}>{statusLabel[activeAgent.status]}</PixelBadge>
            </div>
          </div>
          <p className="pixel-companion-line">
            {statusLabel[activeAgent.status]} beside the command desk. New quests route to this companion unless reassigned.
          </p>
          <div className="pixel-inset-note">
            <strong>Focus</strong>
            <p>{activeAgent.traits.slice(0, 2).join(' & ')}</p>
          </div>
          <div className="pixel-inset-note">
            <strong>Current task</strong>
            <p>{activeTaskRelation}</p>
          </div>
          <div className="pixel-companion-footer">
            <PixelBadge status="mock">Guild Role · Hermes default runner</PixelBadge>
            <label className="pixel-field-label pixel-profile-switcher">
              Switch
              <PixelSelect value={activeAgent.id} onChange={onSelectAgent} ariaLabel="Active companion">
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name} - {agent.role}
                  </option>
                ))}
              </PixelSelect>
            </label>
          </div>
        </PixelPanel>

        <PixelQuestCard
          title={activeQuest?.title ?? 'No active quest'}
          brief={activeQuest?.brief ?? `Ask ${activeAgent.name} to start from the command box below.`}
          currentStep={
            activeQuest?.timeline.at(-1)?.message ??
            `${activeAgent.name} is ready. Choose a suggested quest or type a new command below.`
          }
          progress={activeQuest?.progress ?? 0}
          state={activeQuest?.state ?? 'idle'}
          empty={!activeQuest}
          suggestions={suggestedPrompts}
          onSuggestionSelect={onCommandValue}
          action={
            activeQuest ? (
              <PixelButton onClick={() => onOpenTask(activeQuest.id)}>
                <PixelIcon name="quest-log" size={18} /> Open Quest Log
              </PixelButton>
            ) : (
              <PixelButton tone="secondary" onClick={onOpenReview}>
                <PixelIcon name="review" size={18} /> Review Returned Quests
              </PixelButton>
            )
          }
        />

        <aside className="pixel-guild-side">
          <PixelReviewCard
            title={latestReport ? latestReport.title.replace(/^Quest Completed:\s*/i, '') : 'No report waiting'}
            summary={latestReport ? latestReport.summary : 'Returned quests appear here with approve and revise actions.'}
            artifact={latestReport?.artifacts[0]?.title ?? undefined}
            provenance={latestReport ? reportProvenance : 'No returned output'}
            pendingCount={pendingReports.length}
            actions={
              latestReport ? (
                <div className="pixel-review-actions">
                  <PixelButton tone="success" onClick={() => onApprove(latestReport.id)}>
                    <PixelIcon name="approved" size={18} /> Approve
                  </PixelButton>
                  <PixelButton tone="secondary" onClick={() => onRevise(latestReport.id)}>
                    <PixelIcon name="revise" size={18} /> Revise
                  </PixelButton>
                  <PixelInput value={revisionText} onChange={onRevisionText} multiline rows={2} ariaLabel="Revision instructions" />
                </div>
              ) : (
                <PixelButton tone="secondary" onClick={onOpenReview}>
                  Open Review Chamber
                </PixelButton>
              )
            }
          />

          <PixelPanel title="Quest Log" icon={<PixelIcon name="quest-log" size={18} />} compact>
            <PixelLogList entries={guildLogEntries} emptyText="Recent field notes appear after a quest starts." />
            {logTask && (
              <PixelButton tone="ghost" onClick={() => onOpenTask(logTask.id)}>
                <PixelIcon name="chevron" size={16} /> View Full Log
              </PixelButton>
            )}
          </PixelPanel>
        </aside>

        <PixelTruthStrip
          mode={systemStatus.bridgeMode}
          implementation={systemStatus.activeImplementation}
          execution={getExecutionSource(systemStatus)}
          hermes={systemStatus.hermesAvailable}
          fallback={systemStatus.fallbackReason}
          profileSource="Guild-defined roles"
        />
      </section>
    </PixelAppWindow>
  );
}

function AgentCard({ agent, active, currentTask, onSelect }: { agent: Agent; active: boolean; currentTask?: Task; onSelect: () => void }) {
  const Icon = roleIcon[agent.role];
  return (
    <article className={`agent-card ${active ? 'active' : ''}`}>
      <div className="agent-card-header">
        <div className="party-emblem">
          <Icon size={22} />
        </div>
        <button onClick={onSelect}>{active ? 'Active Pet' : 'Assign Pet'}</button>
      </div>
      <h3>{agent.name}</h3>
      <p>{agent.role} class</p>
      <div className={`state-pill ${agent.status}`}>{statusLabel[agent.status]}</div>
      <div className="current-quest">
        <strong>Current quest</strong>
        <span>{currentTask?.title ?? 'Standing by'}</span>
      </div>
      <dl>
        <dt>Traits</dt>
        <dd>{agent.traits.join(', ')}</dd>
        <dt>Best for</dt>
        <dd>{agent.bestFor}</dd>
        <dt>Equipment</dt>
        <dd>{agent.equipment.join(', ')}</dd>
      </dl>
      <div className="truth-label">Guild Role · Real execution uses Hermes default runner</div>
    </article>
  );
}

interface QuestBoardProps {
  agents: Agent[];
  tasks: Task[];
  selectedTask?: Task;
  systemStatus: SystemStatus;
  boardInput: string;
  boardGoals: string;
  boardNonGoals: string;
  boardContext: string;
  boardDefinitionOfDone: string;
  boardAssignee: string;
  onBoardInput: (value: string) => void;
  onBoardGoals: (value: string) => void;
  onBoardNonGoals: (value: string) => void;
  onBoardContext: (value: string) => void;
  onBoardDefinitionOfDone: (value: string) => void;
  onBoardAssignee: (value: string) => void;
  onCreateQuest: () => void;
  onSelectTask: (taskId: string) => void;
  bridgeReady: boolean;
}

function QuestBoard({
  agents,
  tasks,
  selectedTask,
  systemStatus,
  boardInput,
  boardGoals,
  boardNonGoals,
  boardContext,
  boardDefinitionOfDone,
  boardAssignee,
  onBoardInput,
  onBoardGoals,
  onBoardNonGoals,
  onBoardContext,
  onBoardDefinitionOfDone,
  onBoardAssignee,
  onCreateQuest,
  onSelectTask,
  bridgeReady,
}: QuestBoardProps) {
  return (
    <section className="pixel-board-layout">
      <PixelPanel className="quest-post-panel" title="Quest Posting" icon={<PixelIcon name="feather-pen" size={20} />}>
        <div className="quest-post-scroll">
          <div className="quest-contract-note">
            <PixelIcon name="seal" size={28} />
            <span>
              <strong>Quest Contract</strong>
              <em>Brief the work, assign a Guild role, then post it to the active bridge.</em>
            </span>
          </div>
          <PixelInput
            value={boardInput}
            onChange={onBoardInput}
            placeholder="Post a quest for the guild..."
            multiline
            rows={3}
            ariaLabel="Quest brief"
          />
        <details className="advanced-intake pixel-advanced-brief">
          <summary>Advanced brief</summary>
          <label>
            Goals
            <PixelInput value={boardGoals} onChange={onBoardGoals} multiline rows={2} ariaLabel="Quest goals" />
          </label>
          <label>
            Non-goals
            <PixelInput value={boardNonGoals} onChange={onBoardNonGoals} multiline rows={2} ariaLabel="Quest non-goals" />
          </label>
          <label>
            Context
            <PixelInput value={boardContext} onChange={onBoardContext} multiline rows={2} ariaLabel="Quest context" />
          </label>
          <label>
            Definition of done
            <PixelInput value={boardDefinitionOfDone} onChange={onBoardDefinitionOfDone} multiline rows={2} ariaLabel="Definition of done" />
          </label>
        </details>
        </div>
        <div className="quest-post-actions">
          <PixelSelect value={boardAssignee} onChange={onBoardAssignee} ariaLabel="Quest assignee">
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name} - {agent.role}
              </option>
            ))}
          </PixelSelect>
          <PixelButton onClick={onCreateQuest} disabled={!bridgeReady}>
            <PixelIcon name="plus" size={18} /> Create Quest
          </PixelButton>
        </div>
      </PixelPanel>

      <PixelPanel className="quest-log-panel" title="Quest Board" icon={<PixelIcon name="quest-board" size={20} />}>
        {tasks.length === 0 ? (
          <div className="quest-board-empty">
            <PixelIcon name="quest" size={42} />
            <h3>No quests posted</h3>
            <p>Draft a quest on the left and assign it to a Guild role.</p>
            <span>Quest cards will show state, progress, and review readiness here.</span>
          </div>
        ) : (
          tasks.map((task) => (
            <button key={task.id} className={`quest-menu-item ${selectedTask?.id === task.id ? 'selected' : ''}`} onClick={() => onSelectTask(task.id)}>
              <span>
                <strong>{task.title}</strong>
                <em>{task.brief}</em>
              </span>
              <PixelBadge status={task.state}>{statusLabel[task.state]} · {task.progress}%</PixelBadge>
            </button>
          ))
        )}
      </PixelPanel>

      <TaskDetail task={selectedTask} agent={agents.find((agent) => agent.id === selectedTask?.assigneeId)} systemStatus={systemStatus} />

      <PixelTruthStrip
        mode={systemStatus.bridgeMode}
        implementation={systemStatus.activeImplementation}
        execution={getExecutionSource(systemStatus)}
        hermes={systemStatus.hermesAvailable}
        fallback={systemStatus.fallbackReason}
        profileSource="Guild-defined roles"
      />
    </section>
  );
}

function TaskDetail({ task, agent, systemStatus }: { task?: Task; agent?: Agent; systemStatus: SystemStatus }) {
  if (!task) {
    return (
      <PixelPanel className="quest-detail-panel empty">
        <div className="quest-detail-empty">
          <PixelIcon name="document" size={42} />
          <h3>No quest selected</h3>
          <p>Select a quest from the board to inspect its contract, timeline, artifacts, and review state.</p>
          <div>
            <span>Timeline</span>
            <span>Artifacts</span>
            <span>Review state</span>
          </div>
        </div>
      </PixelPanel>
    );
  }

  return (
    <PixelPanel className="quest-detail-panel" title="Quest Detail" icon={<PixelIcon name="scroll" size={20} />}>
      <div className="detail-header">
        <div>
          <h2>{task.title}</h2>
          <p>{task.brief}</p>
        </div>
        <PixelBadge status={task.state}>{statusLabel[task.state]}</PixelBadge>
      </div>
      <div className="pixel-progress" aria-label={`Progress ${task.progress}%`}>
        <span style={{ width: `${task.progress}%` }} />
      </div>
      <div className="detail-meta">
        <span>Assignee: {agent ? `${agent.name} / ${agent.role}` : task.assigneeId}</span>
        <span>Review: {task.reviewStatus.replaceAll('_', ' ')}</span>
        <span>Execution: {getExecutionSource(systemStatus)}</span>
        <span>Profile data: Guild-defined role</span>
      </div>
      {(task.goals || task.nonGoals || task.context || task.definitionOfDone) && (
        <div className="brief-notes">
          {task.goals && (
            <div>
              <strong>Goals</strong>
              <p>{task.goals}</p>
            </div>
          )}
          {task.nonGoals && (
            <div>
              <strong>Non-goals</strong>
              <p>{task.nonGoals}</p>
            </div>
          )}
          {task.context && (
            <div>
              <strong>Context</strong>
              <p>{task.context}</p>
            </div>
          )}
          {task.definitionOfDone && (
            <div>
              <strong>Definition of done</strong>
              <p>{task.definitionOfDone}</p>
            </div>
          )}
        </div>
      )}
      {task.error && <div className="error-box">{task.error}</div>}
      <div className="artifact-strip">
        {task.artifacts.map((artifact) => (
          <div key={artifact.id}>
            <strong>{artifact.title}</strong>
            <span>{artifact.description}</span>
          </div>
        ))}
      </div>
      <ol className="timeline">
        {task.timeline.map((event) => (
          <li key={event.id}>
            <span className={`timeline-type ${event.type}`} />
            <div>
              <strong>{questLogLabel[event.type] ?? event.type.replaceAll('_', ' ')}</strong>
              <p>{event.message}</p>
              <time>
                {new Date(event.timestamp).toLocaleTimeString()} / {event.source}
              </time>
            </div>
          </li>
        ))}
      </ol>
    </PixelPanel>
  );
}

interface ReviewChamberProps {
  reports: ReportCard[];
  tasks: Task[];
  agents: Agent[];
  revisionText: string;
  onRevisionText: (value: string) => void;
  onApprove: (reportId: string) => void;
  onRevise: (reportId: string) => void;
}

function ReviewChamber({ reports, tasks, agents, revisionText, onRevisionText, onApprove, onRevise }: ReviewChamberProps) {
  if (reports.length === 0) {
    return (
      <section className="review-empty-surface">
        <PixelPanel className="review-inbox-panel" title="Review Inbox" icon={<PixelIcon name="review" size={20} />}>
          <div className="review-empty-list">
            <PixelIcon name="returned" size={40} />
            <h2>No returned quests</h2>
            <p>Completed Hermes outputs will queue here for approve or revise.</p>
          </div>
        </PixelPanel>
        <PixelPanel className="review-detail-panel empty" title="Result Slip" icon={<PixelIcon name="report" size={20} />} variant="review">
          <div className="review-empty-detail">
            <PixelIcon name="scroll" size={44} />
            <h3>Awaiting report card</h3>
            <p>When a quest returns, this surface shows summary, artifacts, facts, assumptions, gaps, provenance, and review actions.</p>
            <div>
              <span>Approve</span>
              <span>Revise</span>
              <span>Provenance</span>
            </div>
          </div>
        </PixelPanel>
      </section>
    );
  }

  return (
    <section className="review-list">
      {reports.map((report) => {
        const task = tasks.find((item) => item.id === report.taskId);
        const agent = agents.find((item) => item.id === report.agentId);
        const locked = !isActionableReportTask(task);
        const reportTitle = report.title.replace(/^Quest Completed:\s*/i, '');

        return (
          <PixelPanel
            key={report.id}
            className={`report-card ${locked ? 'locked' : ''}`}
            title="Quest Report Card"
            icon={<PixelIcon name="report" size={20} />}
            variant="review"
          >
            <div className="report-header">
              <div>
                <p className="eyebrow">{agent ? `${agent.name} / ${agent.role}` : report.agentId}</p>
                <h2>Quest Completed: {reportTitle}</h2>
                <p>{report.summary}</p>
              </div>
              <PixelBadge status={task?.reviewStatus ?? 'unchecked'}>{task?.reviewStatus.replaceAll('_', ' ') ?? 'missing task'}</PixelBadge>
            </div>
            <div className="provenance-box">
              <strong>Output provenance</strong>
              <span>{task?.timeline.some((event) => event.source === 'hermes') ? 'Real Hermes output' : 'Mock / Guild-generated report'}</span>
            </div>
            <div className="reward-grid">
              {report.artifacts.map((artifact) => (
                <div key={artifact.id}>
                  <strong>{artifact.title}</strong>
                  <span>{artifact.description}</span>
                </div>
              ))}
            </div>
            <ReportSection title="Facts" items={report.facts} />
            <ReportSection title="Assumptions" items={report.assumptions} />
            <ReportSection title="Known Gaps" items={report.knownGaps} />
            <ReportSection title="Review Items" items={report.reviewItems} />
            <div className="next-action">
              <strong>Recommended next action</strong>
              <p>{report.recommendedNextAction}</p>
            </div>
            {!locked && (
              <div className="review-actions">
                <PixelInput value={revisionText} onChange={onRevisionText} multiline rows={2} ariaLabel="Revision instructions" />
                <PixelButton tone="success" onClick={() => onApprove(report.id)}>
                  <PixelIcon name="approved" size={18} /> Approve
                </PixelButton>
                <PixelButton tone="secondary" onClick={() => onRevise(report.id)}>
                  <PixelIcon name="revise" size={18} /> Revise
                </PixelButton>
              </div>
            )}
          </PixelPanel>
        );
      })}
    </section>
  );
}

function ReportSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="report-section">
      <h3>{title}</h3>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function PixelShowcase() {
  const showcaseIcons = [
    'guild-hall',
    'quest-board',
    'review',
    'quest',
    'quest-log',
    'report',
    'companion',
    'settings',
    'diagnostics',
    'bridge-real',
    'bridge-mock',
    'bridge-auto',
    'hermes-available',
    'hermes-unavailable',
    'approved',
    'revise',
    'send',
    'scroll',
    'feather-pen',
    'spark',
  ] as const;
  const sampleLogs = [
    {
      id: 'log-1',
      title: 'Agent started work',
      detail: 'Compiled source notes and scoped the returned brief.',
      time: '09:12',
    },
    {
      id: 'log-2',
      title: 'Field note',
      detail: 'Extracted positioning themes and pricing deltas.',
      time: '09:18',
    },
    {
      id: 'log-3',
      title: 'Report drafted',
      detail: 'Prepared artifact preview and review notes.',
      time: '09:24',
    },
  ];

  return (
    <div className="pixel-showcase">
      <PixelAppWindow
        title="Hermes Guild"
        subtitle="Pixel UI Kit Showcase"
        status={<PixelBadge status="auto">auto</PixelBadge>}
        commandBar={
          <PixelCommandBar
            value=""
            onChange={() => undefined}
            onSubmit={() => undefined}
            hint="Hermes / Researcher"
            placeholder="What shall we do today?"
          />
        }
      >
        <div className="pixel-showcase-grid">
          <PixelPanel title="Panel Variants">
            <div className="pixel-showcase-row">
              <PixelPanel compact title="Parchment">
                <p className="pixel-muted">Parchment panel 9-slice</p>
              </PixelPanel>
              <PixelPanel compact title="Dark" variant="dark">
                <p className="pixel-muted">Dark panel 9-slice</p>
              </PixelPanel>
              <PixelPanel compact title="Inset" variant="inset">
                <p className="pixel-muted">Inset frame</p>
              </PixelPanel>
            </div>
            <div className="pixel-showcase-row">
              <PixelBadge status="idle">idle</PixelBadge>
              <PixelBadge status="running">running</PixelBadge>
              <PixelBadge status="needs_review">needs review</PixelBadge>
              <PixelBadge status="error">error</PixelBadge>
              <PixelBadge status="real">real</PixelBadge>
              <PixelBadge status="mock">mock</PixelBadge>
            </div>
            <div className="pixel-showcase-row">
              <PixelChip>Builder</PixelChip>
              <PixelChip>Researcher</PixelChip>
              <PixelChip>Reviewer</PixelChip>
            </div>
            <div className="pixel-showcase-row">
              <PixelButton>Primary</PixelButton>
              <PixelButton tone="secondary">Secondary</PixelButton>
              <PixelButton tone="success">Approve</PixelButton>
              <PixelButton tone="danger">Danger</PixelButton>
              <PixelButton tone="ghost">Ghost</PixelButton>
            </div>
            <PixelInput value="" onChange={() => undefined} placeholder="Ask Hermes to do something..." />
            <PixelInput value="" onChange={() => undefined} placeholder="Detailed quest notes..." multiline rows={3} />
          </PixelPanel>

          <PixelPanel title="Avatar States">
            <div className="pixel-showcase-row">
              <PixelAvatar name="Lyra" role="Researcher" status="idle" />
              <PixelAvatar name="Brass" role="Builder" status="running" />
              <PixelAvatar name="Sable" role="Reviewer" status="needs_review" />
              <PixelAvatar name="Moss" role="Gatherer" status="error" />
            </div>
            <div className="pixel-showcase-row">
              <PixelMascot state="idle" label="Owl idle" />
              <PixelMascot state="running" label="Owl running" />
              <PixelMascot state="needs_review" label="Owl needs review" />
              <PixelMascot state="error" label="Owl error" />
            </div>
          </PixelPanel>

          <PixelPanel title="Icon Catalog">
            <div className="pixel-icon-grid">
              {showcaseIcons.map((iconName) => (
                <span key={iconName}>
                  <PixelIcon name={iconName} size={42} label={iconName} />
                  <small>{iconName}</small>
                </span>
              ))}
            </div>
          </PixelPanel>

          <PixelQuestCard
            title="Market Research Brief"
            brief="Compile insights on competitor pricing and positioning."
            currentStep="Drafted insights and recommendations outline."
            progress={68}
            state="running"
            action={<PixelButton>Continue Quest</PixelButton>}
          />

          <PixelReviewCard
            title="market-research-brief.md"
            summary="Well-structured brief with clear insights."
            artifact="market-research-brief.md"
            provenance="Real Hermes output"
            pendingCount={1}
            actions={
              <div className="pixel-showcase-row">
                <PixelButton tone="success">Approve</PixelButton>
                <PixelButton tone="secondary">Revise</PixelButton>
              </div>
            }
          />

          <PixelPanel title="Quest Log">
            <PixelLogList entries={sampleLogs} emptyText="No entries yet." />
          </PixelPanel>

          <PixelTruthStrip
            mode="auto"
            implementation="mock"
            execution="Mock fallback"
            hermes="unavailable"
            fallback="Hermes API health request failed"
            profileSource="Guild-defined roles"
          />
        </div>
      </PixelAppWindow>
    </div>
  );
}

export default App;
