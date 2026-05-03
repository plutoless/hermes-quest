import { useEffect, useState } from 'react';
import { createBridgeFromConfig, loadBridgeConfig, saveBridgeConfig } from '../bridge/bridgeFactory';
import type { BridgeConfig, HermesBridgeApi } from '../bridge/types';
import type { Agent, BridgeEvent, BridgeSnapshot, CreateTaskInput, PetPosition } from '../types';

const loadingAgents: Agent[] = [
  {
    id: 'researcher',
    name: 'Researcher',
    role: 'Researcher',
    status: 'idle',
    availability: 'offline',
    activeInPet: false,
    skills: [],
    traits: ['Research', 'Context Discipline', 'Judgement'],
    bestFor: 'Waiting for bridge configuration.',
    avoid: 'Submitting before bridge selection completes.',
    health: 'Bridge loading',
    equipment: ['Pending bridge selection'],
  },
  {
    id: 'builder',
    name: 'Builder',
    role: 'Builder',
    status: 'idle',
    availability: 'offline',
    activeInPet: true,
    skills: [],
    traits: ['Execution', 'Planning', 'Reliability'],
    bestFor: 'Waiting for bridge configuration.',
    avoid: 'Submitting before bridge selection completes.',
    health: 'Bridge loading',
    equipment: ['Pending bridge selection'],
  },
  {
    id: 'reviewer',
    name: 'Reviewer',
    role: 'Reviewer',
    status: 'idle',
    availability: 'offline',
    activeInPet: false,
    skills: [],
    traits: ['Judgement', 'Communication', 'Reliability'],
    bestFor: 'Waiting for bridge configuration.',
    avoid: 'Submitting before bridge selection completes.',
    health: 'Bridge loading',
    equipment: ['Pending bridge selection'],
  },
];

const loadingSnapshot: BridgeSnapshot = {
  agents: loadingAgents,
  activeProfileId: 'builder',
  tasks: [],
  reports: [],
  systemStatus: {
    gatewayStatus: 'mocked',
    providerHealth: 'mocked',
    bridgeMode: 'auto',
    activeImplementation: 'loading',
    hermesAvailable: 'unchecked',
    logsSummary: 'Bridge selection is loading. Task submission is disabled until mock, real, or auto mode is active.',
    warnings: ['Bridge not ready yet.'],
  },
  petPosition: { x: 32, y: 32 },
};

const loadingBridge: HermesBridgeApi = {
  getSnapshot: () => structuredClone(loadingSnapshot),
  subscribe: () => () => undefined,
  setActiveProfile: () => undefined,
  createTask: (_input: CreateTaskInput) => {
    throw new Error('Bridge is still loading; task submission is disabled.');
  },
  approveReport: () => undefined,
  requestRevision: () => undefined,
  simulateBlocked: () => undefined,
  simulateError: () => undefined,
  setPetPosition: (_position: PetPosition) => undefined,
};

export function useBridgeSnapshot() {
  const [snapshot, setSnapshot] = useState<BridgeSnapshot>(() => structuredClone(loadingSnapshot));
  const [lastEvent, setLastEvent] = useState<BridgeEvent | null>(null);
  const [bridge, setBridge] = useState<HermesBridgeApi>(loadingBridge);
  const [bridgeReady, setBridgeReady] = useState(false);
  const [bridgeConfig, setBridgeConfig] = useState<BridgeConfig>(() => loadBridgeConfig());

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    void createBridgeFromConfig(bridgeConfig, { persistMock: true }).then((configuredBridge) => {
      if (cancelled) return;
      setBridge(configuredBridge);
      setSnapshot(configuredBridge.getSnapshot());
      setBridgeReady(true);
      unsubscribe = configuredBridge.subscribe((nextSnapshot, event) => {
        setSnapshot(nextSnapshot);
        setLastEvent(event);
      });
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [bridgeConfig]);

  const applyBridgeConfig = (nextConfig: BridgeConfig) => {
    saveBridgeConfig(nextConfig);
    const reloadedConfig = loadBridgeConfig();
    setLastEvent(null);
    setBridgeReady(false);
    setBridge(loadingBridge);
    setSnapshot({
      ...structuredClone(loadingSnapshot),
      systemStatus: {
        ...loadingSnapshot.systemStatus,
        bridgeMode: reloadedConfig.bridgeMode,
        logsSummary: `Bridge selection is applying ${reloadedConfig.bridgeMode} mode. Task submission is disabled until the bridge is active.`,
      },
    });
    setBridgeConfig({
      ...reloadedConfig,
    });
  };

  return { snapshot, lastEvent, bridge, bridgeReady, bridgeConfig, applyBridgeConfig };
}
