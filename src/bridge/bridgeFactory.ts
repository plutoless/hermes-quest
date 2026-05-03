import { createMockHermesBridge } from './mockHermesBridge';
import { RealHermesBridge } from './realHermesBridge';
import { createDefaultHermesApiClient, normalizeBaseUrl } from './hermesApiClient';
import type { BridgeConfig, HermesApiClient, HermesBridgeApi } from './types';

const configStorageKey = 'hermes-guild.bridge-config';

const defaultConfig: BridgeConfig = {
  bridgeMode: 'auto',
  hermesApiBaseUrl: 'http://127.0.0.1:8642',
};

interface BridgeFactoryOptions {
  apiClient?: HermesApiClient;
  persistMock?: boolean;
}

export function loadBridgeConfig(): BridgeConfig {
  if (typeof localStorage === 'undefined') return defaultConfig;

  try {
    const stored = localStorage.getItem(configStorageKey);
    if (!stored) return defaultConfig;
    return sanitizeConfig(JSON.parse(stored));
  } catch {
    return defaultConfig;
  }
}

export function saveBridgeConfig(config: BridgeConfig) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(configStorageKey, JSON.stringify(sanitizeConfig(config)));
}

export async function createBridgeFromConfig(config: BridgeConfig, options: BridgeFactoryOptions = {}): Promise<HermesBridgeApi> {
  const sanitized = sanitizeConfig(config);
  const apiClient = options.apiClient ?? await createDefaultHermesApiClient(sanitized.hermesApiBaseUrl);

  if (sanitized.bridgeMode === 'mock') {
    return decorateMockBridge(createMockHermesBridge({ persist: options.persistMock ?? false }), {
      bridgeMode: 'mock',
      activeImplementation: 'mock',
      hermesAvailable: 'unchecked',
      logsSummary: 'Bridge mode: mock. Active implementation: mock. Mock Hermes Bridge is driving lifecycle events locally.',
    });
  }

  const realBridge = new RealHermesBridge(sanitized, apiClient);
  const health = await realBridge.getHealth?.();

  if (sanitized.bridgeMode === 'real') {
    realBridge.setRuntimeStatus({
      bridgeMode: 'real',
      activeImplementation: 'real',
      hermesAvailable: health?.ok ? 'available' : 'unavailable',
      hermesApiBaseUrl: sanitized.hermesApiBaseUrl,
      logsSummary: health?.ok
        ? `Bridge mode: real. Active implementation: real. Hermes available: ${health.message}`
        : `Bridge mode: real. Active implementation: real. Hermes unavailable: ${health?.message ?? 'health check failed'}`,
    });
    if (health && !health.ok) {
      realBridge.markUnavailable(health.message);
    }
    return realBridge;
  }

  if (health?.ok) {
    realBridge.setRuntimeStatus({
      bridgeMode: 'auto',
      activeImplementation: 'real',
      hermesAvailable: 'available',
      hermesApiBaseUrl: sanitized.hermesApiBaseUrl,
      logsSummary: `Bridge mode: auto. Active implementation: real. Hermes available: ${health.message}`,
    });
    return realBridge;
  }

  const fallbackMessage = health?.message ?? 'Real Hermes health check did not return a result.';
  return decorateMockBridge(
    createMockHermesBridge({ persist: options.persistMock ?? false }),
    {
      bridgeMode: 'auto',
      activeImplementation: 'mock',
      hermesAvailable: 'unavailable',
      fallbackReason: fallbackMessage,
      hermesApiBaseUrl: sanitized.hermesApiBaseUrl,
      logsSummary: `Bridge mode: auto. Active implementation: mock; fallback to mock. ${fallbackMessage}`,
    },
    `Auto mode fallback: ${fallbackMessage}`,
  );
}

export async function createConfiguredBridge(options: BridgeFactoryOptions = {}) {
  return createBridgeFromConfig(loadBridgeConfig(), options);
}

function sanitizeConfig(raw: unknown): BridgeConfig {
  const candidate = raw && typeof raw === 'object' ? (raw as Partial<BridgeConfig>) : {};
  const bridgeMode = candidate.bridgeMode === 'mock' || candidate.bridgeMode === 'real' || candidate.bridgeMode === 'auto'
    ? candidate.bridgeMode
    : defaultConfig.bridgeMode;
  const hermesApiBaseUrl = typeof candidate.hermesApiBaseUrl === 'string' && candidate.hermesApiBaseUrl.trim()
    ? normalizeBaseUrl(candidate.hermesApiBaseUrl)
    : defaultConfig.hermesApiBaseUrl;

  return {
    bridgeMode,
    hermesApiBaseUrl,
  };
}

function decorateMockBridge(
  bridge: HermesBridgeApi,
  statusPatch: Pick<
    ReturnType<HermesBridgeApi['getSnapshot']>['systemStatus'],
    'bridgeMode' | 'activeImplementation' | 'hermesAvailable' | 'logsSummary'
  > &
    Partial<Pick<ReturnType<HermesBridgeApi['getSnapshot']>['systemStatus'], 'fallbackReason' | 'hermesApiBaseUrl'>>,
  warning?: string,
) {
  const applyStatus = (next: ReturnType<HermesBridgeApi['getSnapshot']>) => ({
    ...next,
    systemStatus: {
      ...next.systemStatus,
      ...statusPatch,
      warnings: warning
        ? [warning, ...next.systemStatus.warnings.filter((item) => item !== warning)]
        : [`Bridge mode: mock`, ...next.systemStatus.warnings.filter((item) => item !== 'Bridge mode: mock')],
    },
  });

  return new Proxy(bridge, {
    get(target, property, receiver) {
      if (property === 'getSnapshot') {
        return () => applyStatus(target.getSnapshot());
      }
      if (property === 'subscribe') {
        return (listener: Parameters<HermesBridgeApi['subscribe']>[0]) =>
          target.subscribe((next, event) => {
            listener(applyStatus(next), event);
          });
      }
      return Reflect.get(target, property, receiver);
    },
  }) as HermesBridgeApi;
}
