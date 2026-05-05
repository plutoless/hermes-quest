import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, FormEvent, MouseEvent, PointerEvent } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import {
  Bell,
  ChevronRight,
  Edit3,
  Eye,
  Feather,
  Grid2X2,
  Hand,
  Image as ImageIcon,
  MessageCircle,
  Moon,
  Plus,
  Send,
  Settings,
  Shield,
  Sparkles,
  Upload,
  UserRound,
  WifiOff,
  X,
} from 'lucide-react';
import { useBridgeSnapshot } from './hooks/useBridgeSnapshot';
import type {
  AnimationState,
  AppearanceSource,
  AppSettings,
  ChatMessage,
  ChatProvider,
  Companion,
  CompanionAppearance,
  CompanionStatus,
} from './types';
import type { HermesBridgeApi } from './bridge/types';
import type { BridgeMode } from './bridge/types';

const companionStateStorageKey = 'hermes-desktop.companion-state.v0';
const hermesCharacterUrl = new URL('./assets/hermes-character.png', import.meta.url).href;

type ProviderMode = 'mock' | 'hermes';
type PanelWindow = 'appearance' | 'companions' | 'settings';
type CompanionEvent = 'click' | 'send' | 'response' | 'timeout' | 'error';

interface CompanionRuntimeState {
  companions: Companion[];
  appearances: CompanionAppearance[];
  selectedCompanionId: string;
  settings: AppSettings;
}

interface CompanionChatProviderOptions {
  mode: ProviderMode;
  bridge?: HermesBridgeApi;
  waitTimeoutMs?: number;
  pollIntervalMs?: number;
}

const companionSubtitles: Record<string, string> = {
  hermes: 'Your digital concierge',
  astra: 'Productivity analyst',
  orion: 'Research specialist',
};

function getPanelWindow(): PanelWindow | null {
  if (typeof window === 'undefined') return null;
  const panel = new URLSearchParams(window.location.search).get('panel');
  return panel === 'appearance' || panel === 'companions' || panel === 'settings' ? panel : null;
}

async function showPanelWindow(panel: PanelWindow) {
  if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('show_panel_window', { panel });
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.set('panel', panel);
  url.searchParams.delete('mode');
  window.open(`${url.pathname}${url.search}${url.hash}`, `hermes-${panel}`, 'popup,width=520,height=640');
}

async function hidePanelWindow(panel: PanelWindow) {
  if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('hide_panel_window', { panel });
    return;
  }

  window.close();
}

function startNativeWindowDrag() {
  if (typeof window === 'undefined' || !('__TAURI_INTERNALS__' in window)) return false;
  void getCurrentWindow().startDragging();
  return true;
}

function handleNativeDragPointerDown(event: PointerEvent<HTMLElement>) {
  if (event.button !== 0) return;
  const target = event.target as HTMLElement;
  if (target.closest('button, input, textarea, select, a')) return;
  if (startNativeWindowDrag()) {
    event.preventDefault();
  }
}

const animationLabels: Array<{ id: AnimationState; label: string; icon: typeof Feather }> = [
  { id: 'idle', label: 'Idle', icon: Feather },
  { id: 'talk', label: 'Talk', icon: MessageCircle },
  { id: 'think', label: 'Think', icon: Sparkles },
  { id: 'wave', label: 'Wave', icon: Hand },
];

const mockResponses = [
  "I'm here.",
  'What would you like to work on?',
  'I can stay on your desktop while you work.',
  'Got it. I can help with that.',
];

export function addCompanion(state: CompanionRuntimeState): CompanionRuntimeState {
  const next = cloneCompanionState(state);
  const nextNumber = next.companions.length + 1;
  const id = `companion-${nextNumber}`;
  next.companions.push({
    id,
    name: `Companion ${nextNumber}`,
    description: 'Desktop companion',
    visible: true,
    status: 'idle',
    appearanceId: next.appearances[0]?.id ?? 'hermes-default',
    position: { x: 50, y: 54 },
    scale: 1,
    behavior: {
      allowDrag: next.settings.allowDragging,
      showSpeechBubbles: next.settings.showSpeechBubbles,
      clickThrough: next.settings.clickThrough,
    },
    agent: { provider: 'mock', model: 'local companion mode' },
  });
  next.selectedCompanionId = id;
  return next;
}

export function getAppearanceSourceMessage(source: AppearanceSource) {
  if (source === 'preset') {
    return 'Using the bundled Hermes preset. The sprite contract is ready for a production 4x4 sheet.';
  }
  if (source === 'generated') {
    return 'Generate is not connected yet. This placeholder keeps the flow honest until image generation is wired.';
  }
  return 'Upload is not connected yet. This placeholder keeps local file handling out of v0 until it is implemented.';
}

export function getCompanionProviderMode(bridgeMode: BridgeMode, hermesAvailable: 'available' | 'unavailable' | 'unchecked'): ProviderMode {
  if (bridgeMode === 'real') return 'hermes';
  if (bridgeMode === 'mock') return 'mock';
  return hermesAvailable === 'available' ? 'hermes' : 'mock';
}

function getProviderStatusCopy(bridgeMode: BridgeMode, providerMode: ProviderMode, bridgeUnavailable: boolean) {
  if (bridgeMode === 'real') {
    return bridgeUnavailable ? 'Hermes bridge unavailable. Real mode will not use mock output.' : 'Hermes bridge connected.';
  }
  if (bridgeMode === 'auto' && providerMode === 'mock') {
    return 'Auto mode is using local mock because Hermes is unavailable.';
  }
  return providerMode === 'mock' ? 'Mock mode is explicit.' : 'Hermes bridge connected.';
}

function cloneCompanionState(state: CompanionRuntimeState): CompanionRuntimeState {
  return JSON.parse(JSON.stringify(state)) as CompanionRuntimeState;
}

function clampCompanionPosition(position: Companion['position']): Companion['position'] {
  const x = Number.isFinite(position.x) ? position.x : 50;
  const y = Number.isFinite(position.y) ? position.y : 50;
  return {
    x: Math.min(82, Math.max(18, x)),
    y: Math.min(78, Math.max(24, y)),
  };
}

function sanitizeCompanion(companion: Companion): Companion {
  return {
    ...companion,
    position: clampCompanionPosition(companion.position),
    scale: Number.isFinite(companion.scale) ? Math.min(1.18, Math.max(0.62, companion.scale)) : 1,
  };
}

export function createInitialCompanionState(): CompanionRuntimeState {
  const defaultAppearance: CompanionAppearance = {
    id: 'hermes-default',
    name: 'Hermes Light',
    source: 'preset',
    thumbnailUrl: hermesCharacterUrl,
    spriteSheetUrl: hermesCharacterUrl,
    frameWidth: 512,
    frameHeight: 512,
    rows: { idle: 0, talk: 1, think: 2, wave: 3 },
    framesPerRow: 4,
    fps: { idle: 6, talk: 8, think: 6, wave: 8 },
    background: { type: 'transparent' },
  };

  return {
    selectedCompanionId: 'hermes',
    companions: [
      {
        id: 'hermes',
        name: 'Hermes',
        description: 'Your digital concierge',
        visible: true,
        status: 'idle',
        appearanceId: defaultAppearance.id,
        position: { x: 50, y: 54 },
        scale: 1,
        behavior: {
          allowDrag: true,
          showSpeechBubbles: true,
          idleAtScreenEdge: false,
          clickThrough: false,
        },
        agent: { provider: 'mock', model: 'local companion mode' },
      },
      {
        id: 'astra',
        name: 'Astra',
        description: 'Productivity analyst',
        visible: true,
        status: 'idle',
        appearanceId: 'astra-placeholder',
        position: { x: 50, y: 54 },
        scale: 1,
        behavior: {
          allowDrag: true,
          showSpeechBubbles: true,
        },
        agent: { provider: 'mock', model: 'local companion mode' },
      },
      {
        id: 'orion',
        name: 'Orion',
        description: 'Research specialist',
        visible: false,
        status: 'hidden',
        appearanceId: 'orion-placeholder',
        position: { x: 50, y: 54 },
        scale: 1,
        behavior: {
          allowDrag: true,
          showSpeechBubbles: true,
        },
        agent: { provider: 'mock', model: 'local companion mode' },
      },
    ],
    appearances: [
      defaultAppearance,
      { ...defaultAppearance, id: 'astra-placeholder', name: 'Astra Preset' },
      { ...defaultAppearance, id: 'orion-placeholder', name: 'Orion Preset' },
    ],
    settings: {
      launchAtStartup: false,
      alwaysOnTop: true,
      rememberPositions: true,
      allowDragging: true,
      showSpeechBubbles: true,
      quietMode: false,
      clickThrough: false,
      lowResourceMode: false,
      theme: 'system',
    },
  };
}

export function getNextAnimationState(event: CompanionEvent): AnimationState {
  switch (event) {
    case 'click':
      return 'wave';
    case 'send':
    case 'error':
      return 'think';
    case 'response':
      return 'talk';
    case 'timeout':
      return 'idle';
  }
}

export function createCompanionChatProvider({
  mode,
  bridge,
  waitTimeoutMs = 30_000,
  pollIntervalMs = 250,
}: CompanionChatProviderOptions): ChatProvider {
  if (mode === 'mock') {
    return {
      async sendMessage(input) {
        const lastUserMessage = [...input.messages].reverse().find((message) => message.role === 'user');
        const index = Math.abs((lastUserMessage?.content.length ?? 0) + input.companionId.length) % mockResponses.length;
        return {
          role: 'assistant',
          content: mockResponses[index],
          timestamp: Date.now(),
        };
      },
    };
  }

  return {
    async sendMessage(input) {
      if (!bridge?.submitTask && !bridge?.createTask) {
        throw new Error('Hermes bridge is unavailable for companion chat.');
      }

      const lastUserMessage = [...input.messages].reverse().find((message) => message.role === 'user');
      const prompt = lastUserMessage?.content.trim();
      if (!prompt) {
        throw new Error('Hermes bridge cannot send an empty companion message.');
      }

      const snapshot = bridge.getSnapshot();
      const companionAgent = snapshot.agents.find((agent) => agent.activeInPet) ?? snapshot.agents[0];
      if (!companionAgent || companionAgent.availability === 'offline') {
        throw new Error('Hermes bridge is unavailable for companion chat.');
      }

      const taskId = bridge.submitTask
        ? await bridge.submitTask({ brief: prompt, assigneeId: companionAgent.id, type: 'pet' })
        : bridge.createTask({ brief: prompt, assigneeId: companionAgent.id, type: 'pet' });
      const content = await waitForBridgeOutput(bridge, taskId, waitTimeoutMs, pollIntervalMs);

      return {
        role: 'assistant',
        content,
        timestamp: Date.now(),
      };
    },
  };
}

async function waitForBridgeOutput(
  bridge: HermesBridgeApi,
  taskId: string,
  waitTimeoutMs: number,
  pollIntervalMs: number,
): Promise<string> {
  const startedAt = Date.now();

  while (Date.now() - startedAt <= waitTimeoutMs) {
    const snapshot = bridge.getSnapshot();
    const report = snapshot.reports.find((item) => item.taskId === taskId);
    if (report?.summary.trim()) return report.summary;

    const task = bridge.getTask ? await bridge.getTask(taskId) : snapshot.tasks.find((item) => item.id === taskId);
    if (task?.error?.trim()) return task.error;
    if (task?.state === 'error') return 'Hermes could not complete that.';

    await new Promise((resolve) => globalThis.setTimeout(resolve, pollIntervalMs));
  }

  throw new Error('Hermes bridge did not finish the companion chat before the timeout.');
}

function loadCompanionState(): CompanionRuntimeState {
  const initialState = createInitialCompanionState();
  if (typeof localStorage === 'undefined') return initialState;

  try {
    const stored = localStorage.getItem(companionStateStorageKey);
    if (!stored) return initialState;
    const parsed = JSON.parse(stored) as Partial<CompanionRuntimeState>;
    const companions = parsed.companions?.length ? parsed.companions.map((companion) => sanitizeCompanion(companion)) : initialState.companions;
    return {
      ...initialState,
      ...parsed,
      companions,
      appearances: parsed.appearances?.length ? parsed.appearances : initialState.appearances,
      settings: { ...initialState.settings, ...parsed.settings },
      selectedCompanionId: parsed.selectedCompanionId ?? initialState.selectedCompanionId,
    };
  } catch {
    return initialState;
  }
}

function persistCompanionState(state: CompanionRuntimeState) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(companionStateStorageKey, JSON.stringify(state));
}

function statusToAnimation(status: CompanionStatus): AnimationState {
  if (status === 'thinking') return 'think';
  if (status === 'talking') return 'talk';
  return 'idle';
}

function App() {
  const panelWindow = getPanelWindow();
  const { bridge, bridgeReady, bridgeConfig, snapshot } = useBridgeSnapshot();
  const [runtime, setRuntime] = useState<CompanionRuntimeState>(() => loadCompanionState());
  const [draftMessage, setDraftMessage] = useState('');
  const [appearanceSource, setAppearanceSource] = useState<AppearanceSource>('preset');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Good morning!\nHow can I help you today?',
      timestamp: Date.now(),
    },
  ]);
  const [animation, setAnimation] = useState<AnimationState>('idle');
  const [isDragging, setIsDragging] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    persistCompanionState(runtime);
  }, [runtime]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== companionStateStorageKey) return;
      setRuntime(loadCompanionState());
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    if (!contextMenu) return undefined;
    const closeContextMenu = () => setContextMenu(null);
    window.addEventListener('pointerdown', closeContextMenu);
    return () => window.removeEventListener('pointerdown', closeContextMenu);
  }, [contextMenu]);

  const selectedCompanion = runtime.companions.find((companion) => companion.id === runtime.selectedCompanionId) ?? runtime.companions[0];
  const selectedAppearance = runtime.appearances.find((appearance) => appearance.id === selectedCompanion.appearanceId) ?? runtime.appearances[0];
  const activeMessage = [...messages].reverse().find((message) => message.role === 'assistant');
  const providerMode = getCompanionProviderMode(bridgeConfig.bridgeMode, snapshot.systemStatus.hermesAvailable);
  const provider = useMemo(
    () => createCompanionChatProvider({ mode: providerMode, bridge: bridgeReady ? bridge : undefined }),
    [bridge, bridgeReady, providerMode],
  );
  const bridgeUnavailable = providerMode === 'hermes' && snapshot.systemStatus.hermesAvailable !== 'available';

  const updateRuntime = (recipe: (state: CompanionRuntimeState) => void) => {
    setRuntime((current) => {
      const next = cloneCompanionState(current);
      recipe(next);
      return next;
    });
  };

  const updateSelectedCompanion = (patch: Partial<Companion>) => {
    updateRuntime((state) => {
      state.companions = state.companions.map((companion) => (
        companion.id === state.selectedCompanionId ? { ...companion, ...patch } : companion
      ));
    });
  };

  const setSelectedStatus = (status: CompanionStatus) => {
    updateSelectedCompanion({ status });
  };

  const handleCompanionClick = () => {
    setAnimation(getNextAnimationState('click'));
    setSelectedStatus('idle');
    setChatOpen((open) => !open);
    window.setTimeout(() => setAnimation('idle'), 900);
  };

  const handleCompanionContextMenu = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setContextMenu({
      x: Math.min(window.innerWidth - 180, event.clientX),
      y: Math.min(window.innerHeight - 160, event.clientY),
    });
  };

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (!runtime.settings.allowDragging || !selectedCompanion.behavior.allowDrag) return;
    if (event.button === 0 && startNativeWindowDrag()) {
      event.preventDefault();
      return;
    }

    setIsDragging(true);
    const rect = event.currentTarget.getBoundingClientRect();
    dragOffset.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (!isDragging) return;
    const nextX = ((event.clientX - dragOffset.current.x) / window.innerWidth) * 100;
    const nextY = ((event.clientY - dragOffset.current.y) / window.innerHeight) * 100;
    updateSelectedCompanion({
      position: {
        x: Math.min(82, Math.max(18, nextX)),
        y: Math.min(78, Math.max(24, nextY)),
      },
    });
  };

  const handlePointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    setIsDragging(false);
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const content = draftMessage.trim();
    if (!content) return;

    const userMessage: ChatMessage = { role: 'user', content, timestamp: Date.now() };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setDraftMessage('');
    setChatOpen(true);
    setAnimation(getNextAnimationState('send'));
    setSelectedStatus('thinking');

    try {
      const response = await provider.sendMessage({
        companionId: selectedCompanion.id,
        messages: nextMessages,
      });
      setMessages((current) => [...current, response]);
      setAnimation(getNextAnimationState('response'));
      setSelectedStatus('talking');
      window.setTimeout(() => {
        setAnimation(getNextAnimationState('timeout'));
        setSelectedStatus('idle');
      }, runtime.settings.lowResourceMode ? 900 : 2200);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Hermes could not complete that.';
      setMessages((current) => [...current, { role: 'assistant', content: message, timestamp: Date.now() }]);
      setAnimation(getNextAnimationState('error'));
      setSelectedStatus('thinking');
    }
  };

  const companionStyle = {
    '--companion-x': `${selectedCompanion.position.x}%`,
    '--companion-y': `${selectedCompanion.position.y}%`,
    '--companion-scale': selectedCompanion.scale,
  } as CSSProperties;

  if (panelWindow) {
    return (
      <PanelWindowShell panel={panelWindow}>
        {panelWindow === 'companions' ? (
          <CompanionsPopover
            open
            runtime={runtime}
            onClose={() => void hidePanelWindow(panelWindow)}
            onSelect={(id) => updateRuntime((state) => { state.selectedCompanionId = id; })}
            onToggleVisibility={(id) => updateRuntime((state) => {
              state.companions = state.companions.map((companion) => {
                if (companion.id !== id) return companion;
                const visible = !companion.visible;
                return { ...companion, visible, status: visible ? 'idle' : 'hidden' };
              });
            })}
            onAddCompanion={() => setRuntime((current) => addCompanion(current))}
          />
        ) : null}

        {panelWindow === 'appearance' ? (
          <AppearancePopover
            open
            companion={selectedCompanion}
            appearance={selectedAppearance}
            animation={animation}
            source={appearanceSource}
            onClose={() => void hidePanelWindow(panelWindow)}
            onNameChange={(name) => updateSelectedCompanion({ name })}
            onVisibilityChange={(visible) => updateSelectedCompanion({ visible, status: visible ? 'idle' : 'hidden' })}
            onScaleChange={(scale) => updateSelectedCompanion({ scale })}
            onAnimationPreview={(nextAnimation) => {
              setAnimation(nextAnimation);
              setSelectedStatus(nextAnimation === 'talk' ? 'talking' : nextAnimation === 'think' ? 'thinking' : 'idle');
            }}
            onSourceChange={setAppearanceSource}
          />
        ) : null}

        {panelWindow === 'settings' ? (
          <SettingsPopover
            open
            settings={runtime.settings}
            bridgeMode={providerMode}
            bridgeConfigMode={bridgeConfig.bridgeMode}
            bridgeUnavailable={bridgeUnavailable}
            onClose={() => void hidePanelWindow(panelWindow)}
            onChange={(patch) => updateRuntime((state) => {
              state.settings = { ...state.settings, ...patch };
              state.companions = state.companions.map((companion) => ({
                ...companion,
                behavior: {
                  ...companion.behavior,
                  allowDrag: patch.allowDragging ?? companion.behavior.allowDrag,
                  showSpeechBubbles: patch.showSpeechBubbles ?? companion.behavior.showSpeechBubbles,
                  clickThrough: patch.clickThrough ?? companion.behavior.clickThrough,
                },
              }));
            })}
          />
        ) : null}
      </PanelWindowShell>
    );
  }

  return (
    <main className="desktop-companion-shell">
      {chatOpen && runtime.settings.showSpeechBubbles && !runtime.settings.quietMode ? (
        <SpeechBubble message={activeMessage?.content ?? ''} />
      ) : null}

      <section className="companion-stage" aria-label="Hermes desktop companion">
        {[selectedCompanion].filter((companion) => companion.visible).map((companion) => (
          <button
            key={companion.id}
            className={`companion-figure-button ${companion.id === selectedCompanion.id ? 'selected' : ''}`}
            type="button"
            style={companion.id === selectedCompanion.id ? companionStyle : {
              '--companion-x': `${companion.position.x}%`,
              '--companion-y': `${companion.position.y}%`,
              '--companion-scale': companion.scale,
            } as CSSProperties}
            aria-label={`Chat with ${companion.name}`}
            onClick={() => {
              updateRuntime((state) => {
                state.selectedCompanionId = companion.id;
              });
              handleCompanionClick();
            }}
            onPointerDown={companion.id === selectedCompanion.id ? handlePointerDown : undefined}
            onPointerMove={companion.id === selectedCompanion.id ? handlePointerMove : undefined}
            onPointerUp={companion.id === selectedCompanion.id ? handlePointerUp : undefined}
            onContextMenu={companion.id === selectedCompanion.id ? handleCompanionContextMenu : undefined}
          >
            <span className={`companion-art companion-art-${animation}`} aria-hidden="true">
              <img src={selectedAppearance.spriteSheetUrl} alt="" />
            </span>
            <span className="companion-shadow" />
          </button>
        ))}
      </section>

      {contextMenu ? (
        <CompanionContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onOpenPanel={(panel) => {
            setContextMenu(null);
            void showPanelWindow(panel);
          }}
        />
      ) : null}

      {chatOpen ? (
        <ChatInput
          value={draftMessage}
          disabled={selectedCompanion.status === 'hidden'}
          onChange={setDraftMessage}
          onSubmit={handleSubmit}
        />
      ) : null}
    </main>
  );
}

function SpeechBubble({ message }: { message: string }) {
  return (
    <aside className="speech-bubble" aria-live="polite">
      <p>{message}</p>
    </aside>
  );
}

function PanelWindowShell({ panel, children }: { panel: PanelWindow; children: React.ReactNode }) {
  return (
    <main className={`panel-window-shell panel-window-${panel}`}>
      {children}
    </main>
  );
}

function CompanionContextMenu({
  x,
  y,
  onOpenPanel,
}: {
  x: number;
  y: number;
  onOpenPanel: (panel: PanelWindow) => void;
}) {
  return (
    <nav className="companion-context-menu" style={{ left: x, top: y }} aria-label="Companion menu" onPointerDown={(event) => event.stopPropagation()}>
      <button type="button" onClick={() => onOpenPanel('companions')}>
        <UserRound aria-hidden="true" />
        <span>Companions</span>
      </button>
      <button type="button" onClick={() => onOpenPanel('appearance')}>
        <Feather aria-hidden="true" />
        <span>Appearance</span>
      </button>
      <button type="button" onClick={() => onOpenPanel('settings')}>
        <Settings aria-hidden="true" />
        <span>Settings</span>
      </button>
    </nav>
  );
}

function CompanionsPopover({
  open,
  runtime,
  onClose,
  onSelect,
  onToggleVisibility,
  onAddCompanion,
}: {
  open: boolean;
  runtime: CompanionRuntimeState;
  onClose: () => void;
  onSelect: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onAddCompanion: () => void;
}) {
  if (!open) return null;

  return (
    <section className="glass-popover companions-popover" aria-label="Companions">
      <PopoverHeader icon={<UserRound size={22} />} title="Companions" onClose={onClose} action={<Plus size={20} />} actionLabel="Add Companion" onAction={onAddCompanion} />
      <div className="companion-list">
        {runtime.companions.map((companion) => {
          const appearance = runtime.appearances.find((item) => item.id === companion.appearanceId) ?? runtime.appearances[0];
          return (
            <article key={companion.id} className={`companion-row ${companion.id === runtime.selectedCompanionId ? 'selected' : ''}`}>
              <button type="button" className="companion-row-main" onClick={() => onSelect(companion.id)}>
                <img src={appearance.thumbnailUrl} alt="" />
                <span>
                  <strong>{companion.name}</strong>
                  <small>{companion.description ?? companionSubtitles[companion.id] ?? 'Desktop companion'}</small>
                </span>
              </button>
              <button
                type="button"
                className={`switch ${companion.visible ? 'on' : ''}`}
                onClick={() => onToggleVisibility(companion.id)}
                aria-label={`${companion.visible ? 'Hide' : 'Show'} ${companion.name} on desktop`}
              >
                <span />
              </button>
            </article>
          );
        })}
      </div>
      <button type="button" className="popover-link" onClick={onAddCompanion}>
        Add Companion
        <ChevronRight size={18} aria-hidden="true" />
      </button>
    </section>
  );
}

function AppearancePopover({
  open,
  companion,
  appearance,
  animation,
  source,
  onClose,
  onNameChange,
  onVisibilityChange,
  onScaleChange,
  onAnimationPreview,
  onSourceChange,
}: {
  open: boolean;
  companion: Companion;
  appearance: CompanionAppearance;
  animation: AnimationState;
  source: AppearanceSource;
  onClose: () => void;
  onNameChange: (name: string) => void;
  onVisibilityChange: (visible: boolean) => void;
  onScaleChange: (scale: number) => void;
  onAnimationPreview: (animation: AnimationState) => void;
  onSourceChange: (source: AppearanceSource) => void;
}) {
  if (!open) return null;

  return (
    <section className="glass-popover appearance-popover" aria-label="Appearance">
      <PopoverHeader icon={<UserRound size={22} />} title="Appearance" onClose={onClose} />
      <div className="appearance-grid">
        <img className="portrait-preview" src={appearance.thumbnailUrl} alt={`${companion.name} portrait preview`} />
        <label className="field-label">
          <span>Name</span>
          <span className="text-field">
            <input value={companion.name} onChange={(event) => onNameChange(event.target.value)} aria-label="Name" />
            <Edit3 size={18} aria-hidden="true" />
          </span>
        </label>
      </div>
      <label className="settings-row">
        <span>Show on desktop</span>
        <button type="button" className={`switch ${companion.visible ? 'on' : ''}`} onClick={() => onVisibilityChange(!companion.visible)} aria-label="Show on desktop">
          <span />
        </button>
      </label>
      <label className="size-row">
        <span>Size</span>
        <input type="range" min="0.62" max="1.18" step="0.01" value={companion.scale} onChange={(event) => onScaleChange(Number(event.target.value))} aria-label="Size" />
        <strong>{Math.round(companion.scale * 100)}%</strong>
      </label>
      <div className="appearance-tabs" role="tablist" aria-label="Appearance source">
        <button type="button" className={source === 'preset' ? 'active' : ''} role="tab" aria-selected={source === 'preset'} onClick={() => onSourceChange('preset')}>Preset</button>
        <button type="button" className={source === 'generated' ? 'active' : ''} role="tab" aria-selected={source === 'generated'} onClick={() => onSourceChange('generated')}>Generate</button>
        <button type="button" className={source === 'uploaded' ? 'active' : ''} role="tab" aria-selected={source === 'uploaded'} onClick={() => onSourceChange('uploaded')}>Upload</button>
      </div>
      <AppearanceSourceNotice source={source} />
      <div className="animation-section">
        <span className="section-label">Animation</span>
        <div className="animation-grid">
          {animationLabels.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" className={animation === id ? 'active' : ''} onClick={() => onAnimationPreview(id)}>
              <Icon size={23} aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>
      <SpriteSheetPreview appearance={appearance} />
    </section>
  );
}

function AppearanceSourceNotice({ source }: { source: AppearanceSource }) {
  const Icon = source === 'preset' ? ImageIcon : source === 'generated' ? Sparkles : Upload;
  return (
    <div className="source-notice">
      <Icon size={18} aria-hidden="true" />
      <span>{getAppearanceSourceMessage(source)}</span>
    </div>
  );
}

function SpriteSheetPreview({ appearance }: { appearance: CompanionAppearance }) {
  return (
    <div className="sprite-section">
      <span className="section-label">Sprite Sheet Preview</span>
      <div className="sprite-grid" aria-label="Sprite Sheet Preview">
        {Array.from({ length: appearance.framesPerRow * 4 }, (_, index) => (
          <span key={index} className="sprite-frame">
            <img src={appearance.spriteSheetUrl} alt="" />
          </span>
        ))}
      </div>
      <small>16 frames · {appearance.frameWidth}×{appearance.frameHeight} px</small>
    </div>
  );
}

function SettingsPopover({
  open,
  settings,
  bridgeMode,
  bridgeConfigMode,
  bridgeUnavailable,
  onClose,
  onChange,
}: {
  open: boolean;
  settings: AppSettings;
  bridgeMode: ProviderMode;
  bridgeConfigMode: BridgeMode;
  bridgeUnavailable: boolean;
  onClose: () => void;
  onChange: (patch: Partial<AppSettings>) => void;
}) {
  if (!open) return null;

  return (
    <section className="glass-popover settings-popover" aria-label="Settings">
      <PopoverHeader icon={<Settings size={22} />} title="Settings" onClose={onClose} />
      <SettingToggle icon={<Sparkles size={18} />} label="Launch at startup" checked={settings.launchAtStartup} onChange={(value) => onChange({ launchAtStartup: value })} />
      <SettingToggle icon={<Eye size={18} />} label="Always on top" checked={settings.alwaysOnTop} onChange={(value) => onChange({ alwaysOnTop: value })} />
      <SettingToggle icon={<Grid2X2 size={18} />} label="Remember positions" checked={settings.rememberPositions} onChange={(value) => onChange({ rememberPositions: value })} />
      <SettingToggle icon={<Hand size={18} />} label="Allow dragging" checked={settings.allowDragging} onChange={(value) => onChange({ allowDragging: value })} />
      <SettingToggle icon={<MessageCircle size={18} />} label="Show speech bubbles" checked={settings.showSpeechBubbles} onChange={(value) => onChange({ showSpeechBubbles: value })} />
      <SettingToggle icon={<Moon size={18} />} label="Quiet mode" checked={settings.quietMode} onChange={(value) => onChange({ quietMode: value })} />
      <SettingToggle icon={<Shield size={18} />} label="Click-through mode" checked={settings.clickThrough} onChange={(value) => onChange({ clickThrough: value })} />
      <SettingToggle icon={<Bell size={18} />} label="Low resource mode" checked={settings.lowResourceMode} onChange={(value) => onChange({ lowResourceMode: value })} />
      <div className={`bridge-state ${bridgeUnavailable ? 'unavailable' : ''}`}>
        {bridgeUnavailable ? <WifiOff size={18} aria-hidden="true" /> : <Sparkles size={18} aria-hidden="true" />}
        <span>{getProviderStatusCopy(bridgeConfigMode, bridgeMode, bridgeUnavailable)}</span>
      </div>
    </section>
  );
}

function SettingToggle({
  icon,
  label,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="settings-row">
      <span className="setting-label">{icon}{label}</span>
      <button type="button" className={`switch ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)} aria-label={label}>
        <span />
      </button>
    </label>
  );
}

function PopoverHeader({
  icon,
  title,
  action,
  actionLabel,
  onAction,
  onClose,
}: {
  icon: React.ReactNode;
  title: string;
  action?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  onClose: () => void;
}) {
  return (
    <header className="popover-header" onPointerDown={handleNativeDragPointerDown}>
      <span>{icon}<strong>{title}</strong></span>
      <span className="popover-header-actions">
        {action ? (
          <button type="button" onClick={onAction} aria-label={actionLabel ?? `${title} action`}>
            {action}
          </button>
        ) : null}
        <button type="button" onClick={onClose} aria-label={`Close ${title}`}>
          <X size={20} aria-hidden="true" />
        </button>
      </span>
    </header>
  );
}

function ChatInput({
  value,
  disabled,
  onChange,
  onSubmit,
}: {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <form className="chat-input-capsule" onSubmit={onSubmit}>
      <Sparkles size={24} aria-hidden="true" />
      <input
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Ask Hermes anything..."
        aria-label="Ask Hermes anything"
      />
      <button type="submit" className="send-button" aria-label="Send message">
        <Send size={22} aria-hidden="true" />
      </button>
    </form>
  );
}

export default App;
