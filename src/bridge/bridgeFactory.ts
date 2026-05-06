import { createMockHermesBridge } from './mockHermesBridge';
import { RealHermesBridge } from './realHermesBridge';
import { createDefaultHermesApiClient, normalizeBaseUrl } from './hermesApiClient';
import { createDefaultHermesDashboardApiClient } from './hermesDashboardApiClient';
import { createDefaultHermesProfileClient } from './hermesProfileClient';
import { createDefaultHermesProfileDetailsClient } from './hermesProfileDetailsClient';
import { createDefaultHermesProfileRunClient } from './hermesProfileRunClient';
import { createDefaultHermesSidecarClient } from './hermesSidecarClient';
import type {
  BridgeConfig,
  HermesApiClient,
  HermesBridgeApi,
  HermesDashboardApiClient,
  HermesDashboardStatus,
  HermesProfileClient,
  HermesProfileDetailsClient,
  HermesProfileListResult,
  HermesProfileRunClient,
  HermesSidecarClient,
  HermesSidecarStatus,
} from './types';

const configStorageKey = 'hermes-guild.bridge-config';

const defaultConfig: BridgeConfig = {
  bridgeMode: 'auto',
  hermesApiBaseUrl: 'http://127.0.0.1:8642',
  hermesDashboardBaseUrl: 'http://127.0.0.1:9119',
  hermesSidecarBaseUrl: 'http://127.0.0.1:8765',
};

interface BridgeFactoryOptions {
  apiClient?: HermesApiClient;
  dashboardClient?: HermesDashboardApiClient;
  sidecarClient?: HermesSidecarClient;
  profileClient?: HermesProfileClient;
  profileDetailsClient?: HermesProfileDetailsClient;
  profileRunClient?: HermesProfileRunClient;
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

export async function createBridgeFromConfig(config: Partial<BridgeConfig>, options: BridgeFactoryOptions = {}): Promise<HermesBridgeApi> {
  const sanitized = sanitizeConfig(config);
  const apiClient = options.apiClient ?? await createDefaultHermesApiClient(sanitized.hermesApiBaseUrl);
  const dashboardClient = options.dashboardClient ?? await createDefaultHermesDashboardApiClient(sanitized.hermesDashboardBaseUrl);
  const sidecarClient = options.sidecarClient ?? await createDefaultHermesSidecarClient(sanitized.hermesSidecarBaseUrl);
  const profileClient = options.profileClient ?? await createDefaultHermesProfileClient(sanitized.hermesSidecarBaseUrl);
  const profileDetailsClient = options.profileDetailsClient ?? await createDefaultHermesProfileDetailsClient(sanitized.hermesSidecarBaseUrl);
  const profileRunClient = options.profileRunClient ?? await createDefaultHermesProfileRunClient();

  if (sanitized.bridgeMode === 'mock') {
    return decorateMockBridge(createMockHermesBridge({ persist: options.persistMock ?? false }), {
      bridgeMode: 'mock',
      activeImplementation: 'mock',
      hermesAvailable: 'unchecked',
      dashboardAvailable: 'unchecked',
      sidecarAvailable: 'unchecked',
      hermesDashboardBaseUrl: sanitized.hermesDashboardBaseUrl,
      hermesSidecarBaseUrl: sanitized.hermesSidecarBaseUrl,
      logsSummary: 'Bridge mode: mock. Active implementation: mock. Mock Hermes Bridge is driving lifecycle events locally.',
    });
  }

  const realBridge = new RealHermesBridge(sanitized, apiClient, sidecarClient, profileRunClient, profileDetailsClient);
  const health = await realBridge.getHealth?.();
  const dashboardStatus = health?.ok ? await dashboardClient.checkStatus() : undefined;
  const sidecarStatus = health?.ok ? await sidecarClient.checkHealth() : undefined;
  const sidecarCapabilities = health?.ok && sidecarStatus?.ok ? await sidecarClient.getCapabilities() : undefined;
  const gatewayProfileList = health?.ok ? await apiClient.listProfiles?.() : undefined;
  const rawProfileList = gatewayProfileList?.ok ? gatewayProfileList : await profileClient?.listProfiles();
  const profileList = applySidecarExecutionRouting(rawProfileList, sidecarCapabilities?.ok ? sidecarCapabilities.data : undefined);
  const hasProfileList = Boolean(profileList?.ok && profileList.profiles.length > 0);

  if (sanitized.bridgeMode === 'real') {
    const dashboardPatch = statusFromDashboard(sanitized, dashboardStatus);
    const sidecarPatch = statusFromSidecar(sanitized, sidecarStatus);
    realBridge.setRuntimeStatus({
      bridgeMode: 'real',
      activeImplementation: 'real',
      hermesAvailable: health?.ok || hasProfileList ? 'available' : 'unavailable',
      hermesApiBaseUrl: sanitized.hermesApiBaseUrl,
      ...dashboardPatch,
      ...sidecarPatch,
      dataSources: {
        ...dashboardPatch.dataSources,
        ...sidecarPatch.dataSources,
      },
      warnings: [...(dashboardPatch.warnings ?? []), ...(sidecarPatch.warnings ?? [])],
      logsSummary: health?.ok
        ? `Bridge mode: real. Active implementation: real. Hermes available: ${health.message}. ${dashboardPatch.logsSummary} ${sidecarPatch.logsSummary}`
        : hasProfileList
          ? `Bridge mode: real. Active implementation: real. Hermes REST unavailable: ${health?.message ?? 'health check failed'}. Profiles discovered from ${profileList?.source}.`
          : `Bridge mode: real. Active implementation: real. Hermes unavailable: ${health?.message ?? 'health check failed'}`,
    });
    if (health?.ok || hasProfileList) {
      applyVerifiedProfiles(realBridge, health.profile, profileList);
    }
    if (health?.ok) {
      await applyGatewayMetadata(realBridge, apiClient);
      if (sidecarStatus?.ok) {
        await applySidecarCompatibility(realBridge, sidecarClient);
      }
      if (dashboardStatus?.ok) {
        await applyDashboardCompatibilityInventory(realBridge, dashboardClient);
      }
    }
    if (health && !health.ok && !hasProfileList) {
      realBridge.markUnavailable(health.message);
    }
    return realBridge;
  }

  if (health?.ok) {
    const dashboardPatch = statusFromDashboard(sanitized, dashboardStatus);
    const sidecarPatch = statusFromSidecar(sanitized, sidecarStatus);
    realBridge.setRuntimeStatus({
      bridgeMode: 'auto',
      activeImplementation: 'real',
      hermesAvailable: 'available',
      hermesApiBaseUrl: sanitized.hermesApiBaseUrl,
      ...dashboardPatch,
      ...sidecarPatch,
      dataSources: {
        ...dashboardPatch.dataSources,
        ...sidecarPatch.dataSources,
      },
      warnings: [...(dashboardPatch.warnings ?? []), ...(sidecarPatch.warnings ?? [])],
      logsSummary: `Bridge mode: auto. Active implementation: real. Hermes available: ${health.message}. ${dashboardPatch.logsSummary} ${sidecarPatch.logsSummary}`,
    });
    applyVerifiedProfiles(realBridge, health.profile, profileList);
    await applyGatewayMetadata(realBridge, apiClient);
    if (sidecarStatus?.ok) {
      await applySidecarCompatibility(realBridge, sidecarClient);
    }
    if (dashboardStatus?.ok) {
      await applyDashboardCompatibilityInventory(realBridge, dashboardClient);
    }
    return realBridge;
  }

  if (hasProfileList) {
    realBridge.setRuntimeStatus({
      bridgeMode: 'auto',
      activeImplementation: 'real',
      hermesAvailable: 'available',
      hermesApiBaseUrl: sanitized.hermesApiBaseUrl,
      hermesDashboardBaseUrl: sanitized.hermesDashboardBaseUrl,
      hermesSidecarBaseUrl: sanitized.hermesSidecarBaseUrl,
      dashboardAvailable: 'unchecked',
      sidecarAvailable: 'unchecked',
      logsSummary: `Bridge mode: auto. Active implementation: real. Hermes REST unavailable: ${health?.message ?? 'health check failed'}. Profiles discovered from ${profileList?.source}.`,
    });
    applyVerifiedProfiles(realBridge, undefined, profileList);
    return realBridge;
  }

  const fallbackMessage = health?.message ?? 'Real Hermes health check did not return a result.';
  realBridge.applyHermesProfile(undefined);
  realBridge.setRuntimeStatus({
    bridgeMode: 'auto',
    activeImplementation: 'real',
    hermesAvailable: 'unavailable',
    hermesApiBaseUrl: sanitized.hermesApiBaseUrl,
    hermesDashboardBaseUrl: sanitized.hermesDashboardBaseUrl,
    hermesSidecarBaseUrl: sanitized.hermesSidecarBaseUrl,
    dashboardAvailable: 'unchecked',
    sidecarAvailable: 'unchecked',
  });
  realBridge.markUnavailable(fallbackMessage);
  return realBridge;
}

function applyVerifiedProfiles(
  realBridge: RealHermesBridge,
  healthProfile: Parameters<RealHermesBridge['applyHermesProfile']>[0],
  profileList: HermesProfileListResult | undefined,
) {
  if (profileList?.ok && profileList.profiles.length > 0) {
    realBridge.applyHermesProfiles(healthProfile ? mergeRestActiveProfile(profileList, healthProfile) : profileList);
    return;
  }

  realBridge.applyHermesProfile(healthProfile);
}

function mergeRestActiveProfile(
  profileList: HermesProfileListResult,
  healthProfile: NonNullable<Parameters<RealHermesBridge['applyHermesProfile']>[0]>,
): HermesProfileListResult {
  const activeProfile = {
    ...profileList.profiles.find((profile) => profile.id === healthProfile.id),
    ...healthProfile,
    source: healthProfile.source ?? 'public-rest' as const,
  };
  const profiles = profileList.profiles.some((profile) => profile.id === healthProfile.id)
    ? profileList.profiles.map((profile) => profile.id === healthProfile.id ? activeProfile : profile)
    : [activeProfile, ...profileList.profiles];
  return {
    ...profileList,
    profiles,
    activeProfileId: activeProfile.id,
    activeProfileSource: activeProfile.source,
  };
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

async function applySidecarCompatibility(realBridge: RealHermesBridge, sidecarClient: HermesSidecarClient) {
  const [capabilities, localStateSummary] = await Promise.all([
    sidecarClient.getCapabilities(),
    sidecarClient.getLocalStateSummary(),
  ]);
  realBridge.applySidecarCompatibility({
    capabilities: capabilities.ok ? capabilities.data : undefined,
    localStateSummary: localStateSummary.ok ? localStateSummary.data : undefined,
  });
}

function applySidecarExecutionRouting(
  profileList: HermesProfileListResult | undefined,
  sidecarCapabilities: unknown,
): HermesProfileListResult | undefined {
  if (!profileList?.ok || profileList.executionRouting === 'supported') return profileList;
  if (profileList.source !== 'cli' || !sidecarRunsSupported(sidecarCapabilities)) return profileList;
  const reason = sidecarRunReason(sidecarCapabilities) ?? 'Verified CLI route through Hermes Guild sidecar.';
  return {
    ...profileList,
    profiles: profileList.profiles.map((profile) => ({
      ...profile,
      executionRouting: 'supported',
      unavailableReason: undefined,
    })),
    executionRouting: 'supported',
    executionRoutingReason: reason,
    executionRoutingSource: 'sidecar',
    executionRoutingMode: 'sidecar',
  };
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

function sidecarRunsSupported(payload: unknown) {
  const runs = sidecarRunsCapability(payload);
  return stringField(runs?.status) === 'available';
}

function sidecarRunReason(payload: unknown) {
  return stringField(sidecarRunsCapability(payload)?.reason);
}

function sidecarRunsCapability(payload: unknown): Record<string, unknown> | undefined {
  if (!payload || typeof payload !== 'object') return undefined;
  const candidate = payload as Record<string, unknown>;
  const capabilities = objectField(candidate.capabilities);
  return objectField(capabilities?.runs) ?? objectField(candidate.runs);
}

function objectField(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function stringField(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
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
  const hermesSidecarBaseUrl = typeof candidate.hermesSidecarBaseUrl === 'string' && candidate.hermesSidecarBaseUrl.trim()
    ? normalizeBaseUrl(candidate.hermesSidecarBaseUrl, defaultConfig.hermesSidecarBaseUrl)
    : defaultConfig.hermesSidecarBaseUrl;
  return {
    bridgeMode,
    hermesApiBaseUrl,
    hermesDashboardBaseUrl,
    hermesSidecarBaseUrl,
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

function statusFromSidecar(config: BridgeConfig, status: HermesSidecarStatus | undefined) {
  const sidecarAvailable = status?.ok ? 'available' : 'unavailable';
  const warning = status?.ok || !status ? undefined : `Hermes Guild sidecar unavailable: ${status.message}`;
  return {
    sidecarAvailable,
    hermesSidecarBaseUrl: config.hermesSidecarBaseUrl,
    dataSources: {
      sidecar: status?.ok ? 'sidecar' : 'unavailable',
    },
    logsSummary: status?.ok
      ? `Sidecar compatibility available: ${status.message}`
      : `Sidecar compatibility unavailable: ${status?.message ?? 'health check did not run'}`,
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
        | 'fallbackReason'
        | 'hermesApiBaseUrl'
        | 'hermesDashboardBaseUrl'
        | 'hermesSidecarBaseUrl'
        | 'dashboardAvailable'
        | 'sidecarAvailable'
        | 'dataSources'
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
