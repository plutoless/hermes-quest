import { createMockHermesBridge } from './mockHermesBridge';
import { RealHermesBridge } from './realHermesBridge';
import { createDefaultHermesApiClient, normalizeBaseUrl } from './hermesApiClient';
import { createDefaultHermesDashboardApiClient } from './hermesDashboardApiClient';
import type { BridgeConfig, HermesApiClient, HermesBridgeApi, HermesDashboardApiClient, HermesDashboardStatus } from './types';

const configStorageKey = 'hermes-guild.bridge-config';

const defaultConfig: BridgeConfig = {
  bridgeMode: 'auto',
  hermesApiBaseUrl: 'http://127.0.0.1:8642',
  hermesDashboardBaseUrl: 'http://127.0.0.1:9119',
};

interface BridgeFactoryOptions {
  apiClient?: HermesApiClient;
  dashboardClient?: HermesDashboardApiClient;
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
  const dashboardClient = options.dashboardClient ?? await createDefaultHermesDashboardApiClient(sanitized.hermesDashboardBaseUrl);

  if (sanitized.bridgeMode === 'mock') {
    return decorateMockBridge(createMockHermesBridge({ persist: options.persistMock ?? false }), {
      bridgeMode: 'mock',
      activeImplementation: 'mock',
      hermesAvailable: 'unchecked',
      dashboardAvailable: 'unchecked',
      hermesDashboardBaseUrl: sanitized.hermesDashboardBaseUrl,
      logsSummary: 'Bridge mode: mock. Active implementation: mock. Mock Hermes Bridge is driving lifecycle events locally.',
    });
  }

  const realBridge = new RealHermesBridge(sanitized, apiClient);
  const health = await realBridge.getHealth?.();
  const dashboardStatus = health?.ok ? await dashboardClient.checkStatus() : undefined;

  if (sanitized.bridgeMode === 'real') {
    const dashboardPatch = statusFromDashboard(sanitized, dashboardStatus);
    realBridge.setRuntimeStatus({
      bridgeMode: 'real',
      activeImplementation: 'real',
      hermesAvailable: health?.ok ? 'available' : 'unavailable',
      hermesApiBaseUrl: sanitized.hermesApiBaseUrl,
      ...dashboardPatch,
      logsSummary: health?.ok
        ? `Bridge mode: real. Active implementation: real. Hermes available: ${health.message}. ${dashboardPatch.logsSummary}`
        : `Bridge mode: real. Active implementation: real. Hermes unavailable: ${health?.message ?? 'health check failed'}`,
    });
    if (health?.ok) {
      realBridge.applyHermesProfile(health.profile);
      await applyGatewayMetadata(realBridge, apiClient);
      if (dashboardStatus?.ok) {
        await applyDashboardCompatibilityInventory(realBridge, dashboardClient);
      }
    }
    if (health && !health.ok) {
      realBridge.markUnavailable(health.message);
    }
    return realBridge;
  }

  if (health?.ok) {
    const dashboardPatch = statusFromDashboard(sanitized, dashboardStatus);
    realBridge.setRuntimeStatus({
      bridgeMode: 'auto',
      activeImplementation: 'real',
      hermesAvailable: 'available',
      hermesApiBaseUrl: sanitized.hermesApiBaseUrl,
      ...dashboardPatch,
      logsSummary: `Bridge mode: auto. Active implementation: real. Hermes available: ${health.message}. ${dashboardPatch.logsSummary}`,
    });
    realBridge.applyHermesProfile(health.profile);
    await applyGatewayMetadata(realBridge, apiClient);
    if (dashboardStatus?.ok) {
      await applyDashboardCompatibilityInventory(realBridge, dashboardClient);
    }
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
      hermesDashboardBaseUrl: sanitized.hermesDashboardBaseUrl,
      dashboardAvailable: 'unchecked',
      logsSummary: `Bridge mode: auto. Active implementation: mock; fallback to mock. ${fallbackMessage}`,
    },
    `Auto mode fallback: ${fallbackMessage}`,
  );
}

async function applyGatewayMetadata(realBridge: RealHermesBridge, apiClient: HermesApiClient) {
  const [detailedHealth, models, capabilities, jobs] = await Promise.all([
    apiClient.checkDetailedHealth?.(),
    apiClient.listModels?.(),
    apiClient.getCapabilities?.(),
    apiClient.listJobs?.(),
  ]);
  realBridge.applyGatewayMetadata({
    detailedHealth: detailedHealth?.ok ? detailedHealth.data : undefined,
    models: models?.ok ? models.data : undefined,
    capabilities: capabilities?.ok ? capabilities.data : undefined,
  });
  if (jobs?.ok) {
    realBridge.applyOperationalData({ gatewayJobs: jobs.data });
  }
}

async function applyDashboardCompatibilityInventory(realBridge: RealHermesBridge, dashboardClient: HermesDashboardApiClient) {
  if (!dashboardClient.hasProtectedAccess()) {
    realBridge.markDashboardCompatibilityProtected();
    return;
  }

  const [skills, toolsets, sessions, logs, analytics, cronJobs, config, configDefaults, configSchema, env] = await Promise.all([
    dashboardClient.listSkills(),
    dashboardClient.listToolsets(),
    dashboardClient.listSessions(),
    dashboardClient.getLogs(),
    dashboardClient.getAnalyticsUsage(),
    dashboardClient.listCronJobs(),
    dashboardClient.getConfig(),
    dashboardClient.getConfigDefaults(),
    dashboardClient.getConfigSchema(),
    dashboardClient.getEnv(),
  ]);
  realBridge.applyDashboardInventory({
    skills: skills.ok ? skills.data : undefined,
    toolsets: toolsets.ok ? toolsets.data : undefined,
  });
  realBridge.applyOperationalData({
    sessions: sessions.ok ? sessions.data : undefined,
    logs: logs.ok ? logs.data : undefined,
    analytics: analytics.ok ? analytics.data : undefined,
    cronJobs: cronJobs.ok ? cronJobs.data : undefined,
    config: config.ok ? config.data : undefined,
    configDefaults: configDefaults.ok ? configDefaults.data : undefined,
    configSchema: configSchema.ok ? configSchema.data : undefined,
    env: env.ok ? env.data : undefined,
  });
  if (sessions.ok) {
    const sessionId = firstIdFromCollection(sessions.data, ['sessions', 'items', 'data']);
    if (sessionId) {
      const [sessionDetail, sessionMessages] = await Promise.all([
        dashboardClient.getSession(sessionId),
        dashboardClient.listSessionMessages(sessionId),
      ]);
      realBridge.applyOperationalData({
        session: sessionDetail.ok ? sessionDetail.data : undefined,
        sessionMessages: sessionMessages.ok ? sessionMessages.data : undefined,
        sessionMessagesSessionId: sessionId,
      });
    }
  }
}

function firstIdFromCollection(payload: unknown, keys: string[]) {
  const collection = collectionFromPayload(payload, keys);
  const first = collection[0];
  if (typeof first === 'string') return first;
  if (!first || typeof first !== 'object') return undefined;
  const candidate = first as Record<string, unknown>;
  return typeof candidate.id === 'string' ? candidate.id : typeof candidate.session_id === 'string' ? candidate.session_id : undefined;
}

function collectionFromPayload(payload: unknown, keys: string[]) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  const candidate = payload as Record<string, unknown>;
  for (const key of keys) {
    if (Array.isArray(candidate[key])) return candidate[key] as unknown[];
  }
  return [];
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
  const hermesDashboardBaseUrl = typeof candidate.hermesDashboardBaseUrl === 'string' && candidate.hermesDashboardBaseUrl.trim()
    ? normalizeBaseUrl(candidate.hermesDashboardBaseUrl, defaultConfig.hermesDashboardBaseUrl)
    : defaultConfig.hermesDashboardBaseUrl;
  return {
    bridgeMode,
    hermesApiBaseUrl,
    hermesDashboardBaseUrl,
  };
}

function statusFromDashboard(config: BridgeConfig, status: HermesDashboardStatus | undefined) {
  const dashboardAvailable = status?.ok ? 'available' : 'unavailable';
  const dashboardSource = status?.ok ? 'dashboard-compatibility' : 'unavailable';
  const warning = status?.ok || !status ? undefined : `Hermes dashboard compatibility unavailable: ${status.message}`;
  return {
    dashboardAvailable,
    hermesDashboardBaseUrl: config.hermesDashboardBaseUrl,
    dataSources: {
      gateway: 'gateway-rest',
      profiles: 'gateway-rest',
      tasks: 'gateway-rest',
      review: 'guild-owned',
      sessions: dashboardSource,
      logs: dashboardSource,
      analytics: dashboardSource,
      skills: dashboardSource,
      toolsets: dashboardSource,
      config: dashboardSource,
      env: dashboardSource,
      cronJobs: dashboardSource,
    },
    logsSummary: status?.ok
      ? `Dashboard compatibility available: ${status.message}`
      : `Dashboard compatibility unavailable: ${status?.message ?? 'status check did not run'}`,
    warnings: warning ? [warning] : [],
  } satisfies Partial<ReturnType<HermesBridgeApi['getSnapshot']>['systemStatus']>;
}

function decorateMockBridge(
  bridge: HermesBridgeApi,
  statusPatch: Pick<
    ReturnType<HermesBridgeApi['getSnapshot']>['systemStatus'],
    'bridgeMode' | 'activeImplementation' | 'hermesAvailable' | 'logsSummary'
  > &
    Partial<
      Pick<
        ReturnType<HermesBridgeApi['getSnapshot']>['systemStatus'],
        'fallbackReason' | 'hermesApiBaseUrl' | 'hermesDashboardBaseUrl' | 'dashboardAvailable' | 'dataSources'
      >
    >,
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
