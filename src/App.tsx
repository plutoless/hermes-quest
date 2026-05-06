import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, FormEvent, MouseEvent, PointerEvent } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import {
  ChevronRight,
  CircleAlert,
  Edit3,
  Feather,
  Gauge,
  Hand,
  Image as ImageIcon,
  KeyRound,
  MapPin,
  MessageCircle,
  Moon,
  MousePointer2,
  Move,
  Pin,
  Plus,
  Power,
  Send,
  Server,
  Settings,
  Sparkles,
  Upload,
  UserRound,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { useBridgeSnapshot } from './hooks/useBridgeSnapshot';
import type {
  Agent,
  AnimationState,
  AppearanceSource,
  AppSettings,
  BridgeSnapshot,
  ChatMessage,
  ChatProvider,
  Companion,
  CompanionAppearance,
  CompanionStatus,
} from './types';
import type { BridgeConfig, HermesBridgeApi } from './bridge/types';
import type { BridgeMode, HermesConnectionTarget } from './bridge/types';

const companionStateStorageKey = 'hermes-desktop.companion-state.v0';
const hermesCharacterUrl = new URL('./assets/hermes-character.png', import.meta.url).href;
const portraitFrameUrls = [
  new URL('../portrait/v2-transparent/frame-01.png', import.meta.url).href,
  new URL('../portrait/v2-transparent/frame-02.png', import.meta.url).href,
  new URL('../portrait/v2-transparent/frame-03.png', import.meta.url).href,
  new URL('../portrait/v2-transparent/frame-04.png', import.meta.url).href,
  new URL('../portrait/v2-transparent/frame-05.png', import.meta.url).href,
  new URL('../portrait/v2-transparent/frame-06.png', import.meta.url).href,
  new URL('../portrait/v2-transparent/frame-07.png', import.meta.url).href,
  new URL('../portrait/v2-transparent/frame-08.png', import.meta.url).href,
  new URL('../portrait/v2-transparent/frame-09.png', import.meta.url).href,
  new URL('../portrait/v2-transparent/frame-10.png', import.meta.url).href,
];

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
  pollIntervalMs?: number;
}

const companionSubtitles: Record<string, string> = {
  hermes: 'Your digital concierge',
  astra: 'Productivity analyst',
  orion: 'Research specialist',
};

function getDefaultFrameUrls() {
  return portraitFrameUrls.length ? portraitFrameUrls : [hermesCharacterUrl];
}

function hydrateAppearanceFrames(appearance: CompanionAppearance): CompanionAppearance {
  if (appearance.frameUrls?.length && !(appearance.id === 'hermes-default' && appearance.source === 'preset')) return appearance;
  const frameUrls = getDefaultFrameUrls();
  return {
    ...appearance,
    thumbnailUrl: frameUrls[0] ?? appearance.thumbnailUrl,
    spriteSheetUrl: frameUrls[0] ?? appearance.spriteSheetUrl,
    frameUrls,
    frameWidth: 1254,
    frameHeight: 1254,
    framesPerRow: frameUrls.length,
    fps: { idle: 2.5, talk: 4, think: 3, wave: 5 },
  };
}

function getPanelWindow(): PanelWindow | null {
  if (typeof window === 'undefined') return null;
  const panel = new URLSearchParams(window.location.search).get('panel');
  return panel === 'appearance' || panel === 'companions' || panel === 'settings' ? panel : null;
}

function getRouteCompanionId(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('companion');
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

async function showCompanionWindow(companionId: string) {
  if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('show_companion_window', { companionId });
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.set('mode', 'pet');
  url.searchParams.set('companion', companionId);
  url.searchParams.delete('panel');
  window.open(`${url.pathname}${url.search}${url.hash}`, `hermes-companion-${companionId}`, 'popup,width=460,height=420');
}

async function hideCompanionWindow(companionId: string) {
  if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('hide_companion_window', { companionId });
    return;
  }
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

const avatarBubbleMaxLength = 68;

function isLongAssistantMessage(message: string) {
  return message.length > avatarBubbleMaxLength || message.includes('\n');
}

function getAvatarBubbleCopy(message: string, status: CompanionStatus) {
  if (status === 'thinking') return 'Thinking...';
  if (!message.trim()) return '';
  return isLongAssistantMessage(message) ? 'I wrote a reply. Open chat to view.' : message;
}

function getUnreadAssistantCount(messages: ChatMessage[]) {
  return Math.max(0, messages.filter((message) => message.role === 'assistant').length - 1);
}

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

function getProviderStatusCopy(bridgeConfig: BridgeConfig, providerMode: ProviderMode, bridgeUnavailable: boolean) {
  if (bridgeConfig.hermesConnectionTarget === 'managed' && !bridgeConfig.managedHermesApiBaseUrl) {
    return 'Managed Hermes URL is not configured for this build.';
  }
  if (bridgeConfig.hermesConnectionTarget === 'managed' && !bridgeConfig.managedHermesBearerToken) {
    return 'Managed Hermes token required before connecting.';
  }
  const target = bridgeConfig.hermesConnectionTarget === 'managed' ? 'Managed Hermes' : 'Local Hermes';
  const bridgeMode = bridgeConfig.bridgeMode;
  if (bridgeMode === 'real') {
    return bridgeUnavailable ? `${target} unavailable. Real mode will not use mock output.` : `${target} connected.`;
  }
  if (bridgeMode === 'auto' && providerMode === 'mock') {
    return `Auto mode is using local mock because ${target} is unavailable.`;
  }
  return providerMode === 'mock' ? 'Mock mode is explicit.' : `${target} connected.`;
}

function cloneCompanionState(state: CompanionRuntimeState): CompanionRuntimeState {
  return JSON.parse(JSON.stringify(state)) as CompanionRuntimeState;
}

function clampCompanionPosition(position: Companion['position']): Companion['position'] {
  const y = Number.isFinite(position.y) ? position.y : 54;
  return {
    x: 50,
    y: Math.min(64, Math.max(42, y)),
  };
}

function sanitizeCompanion(companion: Companion): Companion {
  return {
    ...companion,
    position: clampCompanionPosition(companion.position),
    scale: Number.isFinite(companion.scale) ? Math.min(1.18, Math.max(0.62, companion.scale)) : 1,
  };
}

function sourceLabel(source: string | undefined) {
  if (!source) return 'Hermes profile';
  return source.split('-').map((part) => part ? `${part[0].toUpperCase()}${part.slice(1)}` : part).join(' ');
}

function descriptionForAgent(agent: Agent) {
  if (agent.source === 'unavailable' || agent.availability === 'offline' || agent.executionRouting === 'unsupported') {
    return agent.unavailableReason ?? agent.health ?? 'Hermes profile is unavailable.';
  }
  return `${sourceLabel(agent.source)} profile · ${agent.executionRouting === 'supported' ? 'routing supported' : 'routing unknown'}`;
}

export function companionAgentId(companion: Companion) {
  return companion.agent?.agentId ?? companion.id;
}

export function syncCompanionsWithBridgeProfiles(
  state: CompanionRuntimeState,
  snapshot: BridgeSnapshot,
  providerMode: ProviderMode,
): CompanionRuntimeState {
  if (providerMode !== 'hermes' || snapshot.systemStatus.activeImplementation !== 'real') return state;
  if (!snapshot.agents.length) return state;

  const currentByAgentId = new Map(state.companions.map((companion) => [companionAgentId(companion), companion]));
  const defaultAppearanceId = state.appearances[0]?.id ?? 'hermes-default';
  const companions = snapshot.agents.map((agent, index) => {
    const current = currentByAgentId.get(agent.id);
    const visible = current?.visible ?? agent.activeInPet ?? index === 0;
    return sanitizeCompanion({
      id: agent.id,
      name: agent.name,
      description: descriptionForAgent(agent),
      visible,
      status: visible ? (current?.status === 'hidden' ? 'idle' : current?.status ?? statusFromAgent(agent)) : 'hidden',
      appearanceId: current?.appearanceId ?? defaultAppearanceId,
      position: current?.position ?? { x: 50, y: 54 },
      scale: current?.scale ?? 1,
      behavior: {
        allowDrag: current?.behavior.allowDrag ?? state.settings.allowDragging,
        showSpeechBubbles: current?.behavior.showSpeechBubbles ?? state.settings.showSpeechBubbles,
        idleAtScreenEdge: current?.behavior.idleAtScreenEdge,
        clickThrough: current?.behavior.clickThrough ?? state.settings.clickThrough,
      },
      agent: {
        agentId: agent.id,
        provider: agent.source ?? snapshot.systemStatus.activeImplementation,
        source: agent.source,
        executionRouting: agent.executionRouting,
        unavailableReason: agent.unavailableReason,
      },
    });
  });

  const selectedCompanionId = companions.some((companion) => companion.id === state.selectedCompanionId)
    ? state.selectedCompanionId
    : snapshot.activeProfileId && companions.some((companion) => companion.id === snapshot.activeProfileId)
      ? snapshot.activeProfileId
      : companions[0].id;

  const next = {
    ...state,
    companions,
    selectedCompanionId,
  };

  return JSON.stringify(next.companions) === JSON.stringify(state.companions) && next.selectedCompanionId === state.selectedCompanionId
    ? state
    : next;
}

function statusFromAgent(agent: Agent): CompanionStatus {
  if (agent.availability === 'offline') return 'away';
  if (agent.status === 'thinking' || agent.status === 'running') return 'thinking';
  if (agent.status === 'needs_review') return 'talking';
  return agent.status === 'error' ? 'talking' : 'idle';
}

export function createInitialCompanionState(): CompanionRuntimeState {
  const frameUrls = getDefaultFrameUrls();
  const defaultAppearance: CompanionAppearance = {
    id: 'hermes-default',
    name: 'Hermes Light',
    source: 'preset',
    thumbnailUrl: frameUrls[0] ?? hermesCharacterUrl,
    spriteSheetUrl: frameUrls[0] ?? hermesCharacterUrl,
    frameUrls,
    frameWidth: 1254,
    frameHeight: 1254,
    rows: { idle: 0, talk: 1, think: 2, wave: 3 },
    framesPerRow: frameUrls.length,
    fps: { idle: 2.5, talk: 4, think: 3, wave: 5 },
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
      const companionAgent =
        snapshot.agents.find((agent) => agent.id === input.companionId) ??
        snapshot.agents.find((agent) => agent.activeInPet) ??
        snapshot.agents[0];
      if (!companionAgent || companionAgent.availability === 'offline') {
        throw new Error('Hermes bridge is unavailable for companion chat.');
      }

      const taskId = bridge.submitTask
        ? await bridge.submitTask({ brief: prompt, assigneeId: companionAgent.id, type: 'pet' })
        : bridge.createTask({ brief: prompt, assigneeId: companionAgent.id, type: 'pet' });
      const content = await waitForBridgeOutput(bridge, taskId, pollIntervalMs);

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
  pollIntervalMs: number,
): Promise<string> {
  for (;;) {
    const snapshot = bridge.getSnapshot();
    const task = bridge.getTask ? await bridge.getTask(taskId) : snapshot.tasks.find((item) => item.id === taskId);
    const completedMessage = [...(task?.timeline ?? [])]
      .reverse()
      .find((event) => event.type === 'completed' && event.source === 'hermes')
      ?.message
      .trim();
    if (completedMessage) return completedMessage;

    const report = snapshot.reports.find((item) => item.taskId === taskId);
    if (report?.summary.trim()) return report.summary;

    if (task?.error?.trim()) return task.error;
    if (task?.state === 'error') return 'Hermes could not complete that.';

    await new Promise((resolve) => globalThis.setTimeout(resolve, pollIntervalMs));
  }
}

function loadCompanionState(): CompanionRuntimeState {
  const initialState = createInitialCompanionState();
  if (typeof localStorage === 'undefined') return initialState;

  try {
    const stored = localStorage.getItem(companionStateStorageKey);
    if (!stored) return initialState;
    const parsed = JSON.parse(stored) as Partial<CompanionRuntimeState>;
    const companions = parsed.companions?.length ? parsed.companions.map((companion) => sanitizeCompanion(companion)) : initialState.companions;
    const appearances = parsed.appearances?.length ? parsed.appearances.map((appearance) => hydrateAppearanceFrames(appearance)) : initialState.appearances;
    return {
      ...initialState,
      ...parsed,
      companions,
      appearances,
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
  const routeCompanionId = getRouteCompanionId();
  const { bridge, bridgeReady, bridgeConfig, applyBridgeConfig, snapshot } = useBridgeSnapshot();
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
  const [avatarFrameIndex, setAvatarFrameIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [quickInputOpen, setQuickInputOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const suppressNextClick = useRef(false);

  useEffect(() => {
    persistCompanionState(runtime);
  }, [runtime]);

  const providerMode = getCompanionProviderMode(bridgeConfig.bridgeMode, snapshot.systemStatus.hermesAvailable);

  useEffect(() => {
    setRuntime((current) => syncCompanionsWithBridgeProfiles(current, snapshot, providerMode));
  }, [providerMode, snapshot]);

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

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const closeDrawerOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', closeDrawerOnEscape);
    return () => window.removeEventListener('keydown', closeDrawerOnEscape);
  }, [drawerOpen]);

  const selectedCompanionId = routeCompanionId ?? runtime.selectedCompanionId;
  const selectedCompanion = runtime.companions.find((companion) => companion.id === selectedCompanionId) ?? runtime.companions[0];
  const selectedAppearance = runtime.appearances.find((appearance) => appearance.id === selectedCompanion.appearanceId) ?? runtime.appearances[0];
  const activeFrameUrls = selectedAppearance.frameUrls?.length ? selectedAppearance.frameUrls : [selectedAppearance.spriteSheetUrl];
  const activeAvatarFrameUrl = activeFrameUrls[avatarFrameIndex % activeFrameUrls.length] ?? selectedAppearance.spriteSheetUrl;
  const activeMessage = [...messages].reverse().find((message) => message.role === 'assistant');
  const bubbleCopy = getAvatarBubbleCopy(activeMessage?.content ?? '', selectedCompanion.status);
  const shouldShowBubble = runtime.settings.showSpeechBubbles && !runtime.settings.quietMode && !drawerOpen && (
    selectedCompanion.status === 'thinking' || selectedCompanion.status === 'talking'
  );
  const unreadAssistantCount = getUnreadAssistantCount(messages);
  const drawerSide = selectedCompanion.position.x > 55 ? 'right' : 'left';
  const provider = useMemo(
    () => createCompanionChatProvider({ mode: providerMode, bridge: bridgeReady ? bridge : undefined }),
    [bridge, bridgeReady, providerMode],
  );
  const bridgeUnavailable = providerMode === 'hermes' && snapshot.systemStatus.hermesAvailable !== 'available';

  useEffect(() => {
    setAvatarFrameIndex(0);
    if (activeFrameUrls.length <= 1) return undefined;

    const fps = selectedAppearance.fps[animation] || 6;
    const intervalId = window.setInterval(() => {
      setAvatarFrameIndex((index) => (index + 1) % activeFrameUrls.length);
    }, 1000 / fps);

    return () => window.clearInterval(intervalId);
  }, [activeFrameUrls, animation, selectedAppearance.fps]);

  const updateRuntime = (recipe: (state: CompanionRuntimeState) => void) => {
    setRuntime((current) => {
      const next = cloneCompanionState(current);
      recipe(next);
      return next;
    });
  };

  const updateSelectedCompanion = (patch: Partial<Companion>) => {
    const targetId = selectedCompanion.id;
    updateRuntime((state) => {
      state.companions = state.companions.map((companion) => (
        companion.id === targetId ? { ...companion, ...patch } : companion
      ));
    });
  };

  const setSelectedStatus = (status: CompanionStatus) => {
    updateSelectedCompanion({ status });
  };

  const handleCompanionClick = () => {
    setAnimation(getNextAnimationState('click'));
    setSelectedStatus('idle');
    setQuickInputOpen((open) => !open);
    window.setTimeout(() => setAnimation('idle'), 900);
  };

  const handleCompanionContextMenu = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setContextMenu({
      x: Math.max(8, Math.min(window.innerWidth - 180, event.clientX)),
      y: Math.max(8, Math.min(window.innerHeight - 160, event.clientY)),
    });
  };

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (!runtime.settings.allowDragging || !selectedCompanion.behavior.allowDrag) return;
    if (event.button !== 0) return;

    dragStart.current = { x: event.clientX, y: event.clientY };
    suppressNextClick.current = false;
    const rect = event.currentTarget.getBoundingClientRect();
    dragOffset.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (!dragStart.current) return;
    const deltaX = event.clientX - dragStart.current.x;
    const deltaY = event.clientY - dragStart.current.y;
    if (!isDragging && Math.hypot(deltaX, deltaY) < 5) return;

    suppressNextClick.current = true;
    if (!isDragging && startNativeWindowDrag()) {
      dragStart.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
      event.preventDefault();
      return;
    }

    setIsDragging(true);
    const nextY = ((event.clientY - dragOffset.current.y) / window.innerHeight) * 100;
    updateSelectedCompanion({
      position: {
        x: 50,
        y: Math.min(64, Math.max(42, nextY)),
      },
    });
  };

  const handlePointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    dragStart.current = null;
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleCompanionButtonClick = (companionId: string) => {
    if (suppressNextClick.current) {
      suppressNextClick.current = false;
      return;
    }
    updateRuntime((state) => {
      state.selectedCompanionId = companionId;
    });
    handleCompanionClick();
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const content = draftMessage.trim();
    if (!content) return;
    const submittedFromDrawer = drawerOpen;

    const userMessage: ChatMessage = { role: 'user', content, timestamp: Date.now() };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setDraftMessage('');
    setQuickInputOpen(!submittedFromDrawer);
    setDrawerOpen(submittedFromDrawer);
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
      setSelectedStatus('talking');
      window.setTimeout(() => {
        setAnimation(getNextAnimationState('timeout'));
        setSelectedStatus('idle');
      }, runtime.settings.lowResourceMode ? 900 : 2200);
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
            onToggleVisibility={(id) => {
              const visible = !(runtime.companions.find((companion) => companion.id === id)?.visible ?? false);
              updateRuntime((state) => {
                state.companions = state.companions.map((companion) => (
                  companion.id === id ? { ...companion, visible, status: visible ? 'idle' : 'hidden' } : companion
                ));
              });
              void (visible ? showCompanionWindow(id) : hideCompanionWindow(id));
            }}
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
            onVisibilityChange={(visible) => {
              updateSelectedCompanion({ visible, status: visible ? 'idle' : 'hidden' });
              void (visible ? showCompanionWindow(selectedCompanion.id) : hideCompanionWindow(selectedCompanion.id));
            }}
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
            bridgeConfig={bridgeConfig}
            bridgeUnavailable={bridgeUnavailable}
            onClose={() => void hidePanelWindow(panelWindow)}
            onBridgeConfigChange={applyBridgeConfig}
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
    <main className="desktop-companion-shell" style={companionStyle}>
      {shouldShowBubble ? (
        <AvatarBubble
          message={bubbleCopy}
          longMessage={Boolean(activeMessage?.content && isLongAssistantMessage(activeMessage.content))}
          unreadCount={unreadAssistantCount}
          thinking={selectedCompanion.status === 'thinking'}
          onOpenDrawer={() => {
            setDrawerOpen(true);
            setQuickInputOpen(false);
          }}
        />
      ) : null}

      <section className="companion-stage" aria-label="Hermes desktop companion">
        {[selectedCompanion].filter((companion) => routeCompanionId ? Boolean(companion) : companion.visible).map((companion) => (
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
            onClick={() => handleCompanionButtonClick(companion.id)}
            onPointerDown={companion.id === selectedCompanion.id ? handlePointerDown : undefined}
            onPointerMove={companion.id === selectedCompanion.id ? handlePointerMove : undefined}
            onPointerUp={companion.id === selectedCompanion.id ? handlePointerUp : undefined}
            onContextMenu={companion.id === selectedCompanion.id ? handleCompanionContextMenu : undefined}
          >
            <span className={`companion-art companion-art-${animation}`} aria-hidden="true">
              <img src={activeAvatarFrameUrl} alt="" />
            </span>
            <span className="companion-shadow" />
          </button>
        ))}
      </section>

      {contextMenu ? (
        <CompanionContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onOpenChat={() => {
            setContextMenu(null);
            setDrawerOpen(true);
            setQuickInputOpen(false);
          }}
          onOpenPanel={(panel) => {
            setContextMenu(null);
            void showPanelWindow(panel);
          }}
        />
      ) : null}

      {quickInputOpen ? (
        <QuickChatInput
          value={draftMessage}
          disabled={selectedCompanion.status === 'hidden'}
          onChange={setDraftMessage}
          onSubmit={handleSubmit}
        />
      ) : null}

      {drawerOpen ? (
        <ChatDrawer
          side={drawerSide}
          companionName={selectedCompanion.name}
          companionStatus={selectedCompanion.status}
          appearanceUrl={activeAvatarFrameUrl}
          messages={messages}
          value={draftMessage}
          disabled={selectedCompanion.status === 'hidden'}
          onChange={setDraftMessage}
          onSubmit={handleSubmit}
          onClose={() => setDrawerOpen(false)}
        />
      ) : null}
    </main>
  );
}

function AvatarBubble({
  message,
  longMessage,
  unreadCount,
  thinking,
  onOpenDrawer,
}: {
  message: string;
  longMessage: boolean;
  unreadCount: number;
  thinking: boolean;
  onOpenDrawer: () => void;
}) {
  return (
    <button type="button" className="avatar-bubble" aria-live="polite" onClick={onOpenDrawer}>
      <p>{message}</p>
      {thinking ? (
        <span className="thinking-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      ) : null}
      {unreadCount > 1 ? <span className="unread-badge">+{Math.min(9, unreadCount - 1)}</span> : null}
      {longMessage ? <span className="bubble-open-chat">Open chat</span> : null}
    </button>
  );
}

function ChatDrawer({
  side,
  companionName,
  companionStatus,
  appearanceUrl,
  messages,
  value,
  disabled,
  onChange,
  onSubmit,
  onClose,
}: {
  side: 'left' | 'right';
  companionName: string;
  companionStatus: CompanionStatus;
  appearanceUrl: string;
  messages: ChatMessage[];
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  onClose: () => void;
}) {
  const statusCopy = companionStatus === 'thinking' ? 'Thinking' : companionStatus === 'talking' ? 'Reply ready' : 'Ready';

  return (
    <>
      <button type="button" className="chat-drawer-scrim" aria-label="Close chat" onClick={onClose} />
      <aside className={`chat-drawer chat-drawer-${side}`} aria-label={`${companionName} full chat`}>
        <header className="drawer-header" onPointerDown={handleNativeDragPointerDown}>
          <span className="drawer-title">
            <span className="drawer-avatar" aria-hidden="true">
              <img src={appearanceUrl} alt="" />
            </span>
            <span>
              <strong>{companionName}</strong>
              <small>{statusCopy}</small>
            </span>
          </span>
          <button type="button" className="drawer-close-button" onClick={onClose} aria-label="Close chat">
            <X size={20} aria-hidden="true" />
          </button>
        </header>
        <div className="drawer-message-list">
          {messages.length > 4 ? <span className="history-collapsed">Earlier history collapsed</span> : null}
          {messages.map((message, index) => (
            <article key={`${message.timestamp}-${index}`} className={`drawer-message drawer-message-${message.role}`}>
              <p>{message.content}</p>
            </article>
          ))}
        </div>
        <FullChatInput value={value} disabled={disabled} onChange={onChange} onSubmit={onSubmit} />
      </aside>
    </>
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
  onOpenChat,
  onOpenPanel,
}: {
  x: number;
  y: number;
  onOpenChat: () => void;
  onOpenPanel: (panel: PanelWindow) => void;
}) {
  return (
    <nav className="companion-context-menu" style={{ left: x, top: y }} aria-label="Companion menu" onPointerDown={(event) => event.stopPropagation()}>
      <button type="button" onClick={onOpenChat}>
        <MessageCircle aria-hidden="true" />
        <span>Open Chat</span>
      </button>
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
      <PopoverHeader icon={<Feather size={22} />} title="Appearance" onClose={onClose} />
      <div className="appearance-identity">
        <img className="portrait-preview" src={appearance.thumbnailUrl} alt={`${companion.name} portrait preview`} />
        <div className="appearance-controls">
          <label className="field-label">
            <span>Name</span>
            <span className="text-field">
              <input value={companion.name} onChange={(event) => onNameChange(event.target.value)} aria-label="Name" />
              <Edit3 size={18} aria-hidden="true" />
            </span>
          </label>
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
        </div>
      </div>
      <div className="appearance-source-block">
        <div className="appearance-tabs" role="tablist" aria-label="Appearance source">
          <button type="button" className={source === 'preset' ? 'active' : ''} role="tab" aria-selected={source === 'preset'} onClick={() => onSourceChange('preset')}>Preset</button>
          <button type="button" className={source === 'generated' ? 'active' : ''} role="tab" aria-selected={source === 'generated'} onClick={() => onSourceChange('generated')}>Generate</button>
          <button type="button" className={source === 'uploaded' ? 'active' : ''} role="tab" aria-selected={source === 'uploaded'} onClick={() => onSourceChange('uploaded')}>Upload</button>
        </div>
        <AppearanceSourceNotice source={source} />
      </div>
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
  const frameUrls = appearance.frameUrls?.length ? appearance.frameUrls : [appearance.spriteSheetUrl];
  return (
    <div className="sprite-section">
      <span className="section-label">Sprite Animation Preview</span>
      <div className="sprite-grid" aria-label="Sprite Animation Preview">
        {frameUrls.map((frameUrl, index) => (
          <span key={index} className="sprite-frame">
            <img src={frameUrl} alt="" />
          </span>
        ))}
      </div>
      <small>{frameUrls.length} frames · {appearance.frameWidth}×{appearance.frameHeight} px</small>
    </div>
  );
}

function SettingsPopover({
  open,
  settings,
  bridgeMode,
  bridgeConfig,
  bridgeUnavailable,
  onClose,
  onBridgeConfigChange,
  onChange,
}: {
  open: boolean;
  settings: AppSettings;
  bridgeMode: ProviderMode;
  bridgeConfig: BridgeConfig;
  bridgeUnavailable: boolean;
  onClose: () => void;
  onBridgeConfigChange: (config: BridgeConfig) => void;
  onChange: (patch: Partial<AppSettings>) => void;
}) {
  const [managedTokenDraft, setManagedTokenDraft] = useState(bridgeConfig.managedHermesBearerToken);

  useEffect(() => {
    setManagedTokenDraft(bridgeConfig.managedHermesBearerToken);
  }, [bridgeConfig.managedHermesBearerToken]);

  if (!open) return null;
  const BridgeIcon = bridgeUnavailable ? WifiOff : bridgeMode === 'mock' ? CircleAlert : Wifi;
  const bridgeStateClass = bridgeUnavailable ? 'unavailable' : bridgeMode === 'mock' ? 'mock' : 'connected';
  const updateConnectionTarget = (target: HermesConnectionTarget) => {
    if (target === 'custom') return;
    onBridgeConfigChange({ ...bridgeConfig, hermesConnectionTarget: target });
  };
  const updateManagedToken = (managedHermesBearerToken: string) => {
    onBridgeConfigChange({ ...bridgeConfig, managedHermesBearerToken });
  };

  return (
    <section className="glass-popover settings-popover" aria-label="Settings">
      <PopoverHeader icon={<Settings size={22} />} title="Settings" onClose={onClose} />
      <SettingToggle icon={<Power size={18} />} label="Launch at startup" checked={settings.launchAtStartup} onChange={(value) => onChange({ launchAtStartup: value })} />
      <SettingToggle icon={<Pin size={18} />} label="Always on top" checked={settings.alwaysOnTop} onChange={(value) => onChange({ alwaysOnTop: value })} />
      <SettingToggle icon={<MapPin size={18} />} label="Remember positions" checked={settings.rememberPositions} onChange={(value) => onChange({ rememberPositions: value })} />
      <SettingToggle icon={<Move size={18} />} label="Allow dragging" checked={settings.allowDragging} onChange={(value) => onChange({ allowDragging: value })} />
      <SettingToggle icon={<MessageCircle size={18} />} label="Show speech bubbles" checked={settings.showSpeechBubbles} onChange={(value) => onChange({ showSpeechBubbles: value })} />
      <SettingToggle icon={<Moon size={18} />} label="Quiet mode" checked={settings.quietMode} onChange={(value) => onChange({ quietMode: value })} />
      <SettingToggle icon={<MousePointer2 size={18} />} label="Click-through mode" checked={settings.clickThrough} onChange={(value) => onChange({ clickThrough: value })} />
      <SettingToggle icon={<Gauge size={18} />} label="Low resource mode" checked={settings.lowResourceMode} onChange={(value) => onChange({ lowResourceMode: value })} />
      <div className="connection-settings" aria-label="Hermes connection">
        <span className="setting-label"><Server size={18} />Hermes connection</span>
        <div className="connection-targets" role="group" aria-label="Hermes connection target">
          <button type="button" className={bridgeConfig.hermesConnectionTarget === 'local' ? 'active' : ''} onClick={() => updateConnectionTarget('local')}>Local</button>
          <button type="button" className={bridgeConfig.hermesConnectionTarget === 'managed' ? 'active' : ''} onClick={() => updateConnectionTarget('managed')}>Managed</button>
        </div>
        <small>
          {bridgeConfig.hermesConnectionTarget === 'managed'
            ? bridgeConfig.managedHermesApiBaseUrl || 'Managed URL not configured'
            : bridgeConfig.localHermesApiBaseUrl}
        </small>
        {bridgeConfig.hermesConnectionTarget === 'managed' ? (
          <label className="token-row">
            <span><KeyRound size={16} />Bearer token</span>
            <input
              type="password"
              value={managedTokenDraft}
              onChange={(event) => setManagedTokenDraft(event.target.value)}
              placeholder="Required for Managed"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => updateManagedToken(managedTokenDraft)}
              disabled={managedTokenDraft === bridgeConfig.managedHermesBearerToken}
            >
              Save
            </button>
            {managedTokenDraft || bridgeConfig.managedHermesBearerToken ? (
              <button type="button" onClick={() => {
                setManagedTokenDraft('');
                updateManagedToken('');
              }}>Clear</button>
            ) : null}
          </label>
        ) : null}
      </div>
      <div className={`bridge-state ${bridgeStateClass}`}>
        <BridgeIcon size={18} aria-hidden="true" />
        <span>{getProviderStatusCopy(bridgeConfig, bridgeMode, bridgeUnavailable)}</span>
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

function QuickChatInput({
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
    <form className="quick-chat-input" onSubmit={onSubmit}>
      <input
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Ask Hermes..."
        aria-label="Ask Hermes"
      />
      <button type="submit" className="send-button" aria-label="Send message">
        <Send size={22} aria-hidden="true" />
      </button>
    </form>
  );
}

function FullChatInput({
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
    <form className="full-chat-input" onSubmit={onSubmit}>
      <input
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Ask Hermes anything..."
        aria-label="Ask Hermes anything"
      />
      <button type="submit" className="send-button" aria-label="Send message">
        <Send size={18} aria-hidden="true" />
      </button>
    </form>
  );
}

export default App;
