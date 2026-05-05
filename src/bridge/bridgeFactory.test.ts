import { beforeEach, describe, expect, test } from 'bun:test';
import { createBridgeFromConfig, loadBridgeConfig, saveBridgeConfig } from './bridgeFactory';
import type { BridgeConfig, HermesApiClient, HermesDashboardApiClient } from './types';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const defaultConfig: BridgeConfig = {
  bridgeMode: 'auto',
  hermesApiBaseUrl: 'http://127.0.0.1:8642',
  hermesDashboardBaseUrl: 'http://127.0.0.1:9119',
};

function installFakeStorage() {
  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
      clear: () => {
        storage.clear();
      },
    },
  });
}

function legacyConfigWithManualProfileName(name: string): BridgeConfig & { realProfileName: string } {
  return {
    bridgeMode: 'real',
    hermesApiBaseUrl: 'http://127.0.0.1:8642',
    hermesDashboardBaseUrl: 'http://127.0.0.1:9119',
    realProfileName: name,
  };
}

function dashboardClient(status: { ok: boolean; message: string }, protectedAccess = false): HermesDashboardApiClient {
  const endpoint = async () => ({ ok: status.ok, status: status.ok ? 200 : 503, data: {} });
  return {
    hasProtectedAccess: () => protectedAccess,
    checkStatus: async () => status,
    listSessions: endpoint,
    getSession: endpoint,
    listSessionMessages: endpoint,
    searchSessions: endpoint,
    getConfig: endpoint,
    getConfigDefaults: endpoint,
    getConfigSchema: endpoint,
    updateConfig: endpoint,
    getEnv: endpoint,
    updateEnv: endpoint,
    deleteEnv: endpoint,
    getLogs: endpoint,
    getAnalyticsUsage: endpoint,
    listCronJobs: endpoint,
    createCronJob: endpoint,
    pauseCronJob: endpoint,
    resumeCronJob: endpoint,
    triggerCronJob: endpoint,
    deleteCronJob: endpoint,
    listSkills: endpoint,
    toggleSkill: endpoint,
    listToolsets: endpoint,
  };
}

describe('bridgeFactory', () => {
  beforeEach(() => {
    installFakeStorage();
  });

  test('loads bridge config from local storage with safe defaults', () => {
    expect(loadBridgeConfig()).toEqual(defaultConfig);

    saveBridgeConfig({
      bridgeMode: 'real',
      hermesApiBaseUrl: 'http://127.0.0.1:9999',
      hermesDashboardBaseUrl: 'http://127.0.0.1:9229',
    });

    expect(loadBridgeConfig()).toEqual({
      bridgeMode: 'real',
      hermesApiBaseUrl: 'http://127.0.0.1:9999',
      hermesDashboardBaseUrl: 'http://127.0.0.1:9229',
    });
  });

  test('bridge config discards manual real profile display name', () => {
    localStorage.setItem(
      'hermes-guild.bridge-config',
      JSON.stringify({
        bridgeMode: 'real',
        hermesApiBaseUrl: 'http://127.0.0.1:8642/',
        realProfileName: 'Daily Driver',
      }),
    );

    expect(loadBridgeConfig()).toEqual({
      bridgeMode: 'real',
      hermesApiBaseUrl: 'http://127.0.0.1:8642',
      hermesDashboardBaseUrl: 'http://127.0.0.1:9119',
    });
  });

  test('bridge config normalizes separate gateway and dashboard base URLs', () => {
    saveBridgeConfig({
      bridgeMode: 'auto',
      hermesApiBaseUrl: ' http://127.0.0.1:8642/ ',
      hermesDashboardBaseUrl: ' http://127.0.0.1:9119/ ',
    });

    expect(loadBridgeConfig()).toEqual(defaultConfig);
  });

  test('creates mock bridge directly in mock mode', async () => {
    const bridge = await createBridgeFromConfig({ ...defaultConfig, bridgeMode: 'mock' });
    const status = bridge.getSnapshot().systemStatus;

    expect(status.bridgeMode).toBe('mock');
    expect(status.activeImplementation).toBe('mock');
    expect(status.hermesAvailable).toBe('unchecked');
    expect(status.dashboardAvailable).toBe('unchecked');
    expect(status.logsSummary).toContain('Mock Hermes Bridge');
    expect(status.warnings.some((warning) => warning.includes('Bridge mode: mock'))).toBe(true);
  });

  test('auto mode falls back to mock when real Hermes health fails', async () => {
    const apiClient: HermesApiClient = {
      checkHealth: async () => ({ ok: false, message: 'Hermes API refused connection' }),
      runTask: async () => {
        throw new Error('should not run');
      },
    };

    const bridge = await createBridgeFromConfig(defaultConfig, {
      apiClient,
      dashboardClient: dashboardClient({ ok: true, message: 'Dashboard API healthy' }),
    });
    const status = bridge.getSnapshot().systemStatus;

    expect(status.bridgeMode).toBe('auto');
    expect(status.activeImplementation).toBe('mock');
    expect(status.hermesAvailable).toBe('unavailable');
    expect(status.fallbackReason).toBe('Hermes API refused connection');
    expect(status.gatewayStatus).toBe('mocked');
    expect(status.hermesDashboardBaseUrl).toBe('http://127.0.0.1:9119');
    expect(status.dashboardAvailable).toBe('unchecked');
    expect(status.logsSummary).toContain('fallback to mock');
    expect(status.warnings).toContain('Auto mode fallback: Hermes API refused connection');
  });

  test('auto mode uses real bridge when Hermes health passes without requiring protected dashboard REST', async () => {
    const apiClient: HermesApiClient = {
      checkHealth: async () => ({ ok: true, message: 'Hermes API healthy' }),
      runTask: async () => ({ ok: true, output: 'auto real output', events: [] }),
    };

    const bridge = await createBridgeFromConfig(defaultConfig, {
      apiClient,
      dashboardClient: dashboardClient({ ok: true, message: 'Dashboard API healthy' }),
    });
    const status = bridge.getSnapshot().systemStatus;

    expect(status.bridgeMode).toBe('auto');
    expect(status.activeImplementation).toBe('real');
    expect(status.hermesAvailable).toBe('available');
    expect(status.gatewayStatus).toBe('connected');
    expect(status.dashboardAvailable).toBe('available');
    expect(status.hermesDashboardBaseUrl).toBe('http://127.0.0.1:9119');
    expect(status.dataSources?.skills).toBe('unavailable');
    expect(status.warnings).toContain('Hermes dashboard protected REST skipped: session token unavailable.');
    expect(status.logsSummary).toContain('Bridge mode: auto');
  });

  test('auto mode keeps real gateway active when dashboard compatibility is unavailable', async () => {
    const apiClient: HermesApiClient = {
      checkHealth: async () => ({ ok: true, message: 'Gateway API healthy' }),
      runTask: async () => ({ ok: true, output: 'real output', events: [] }),
    };

    const bridge = await createBridgeFromConfig(defaultConfig, {
      apiClient,
      dashboardClient: dashboardClient({ ok: false, message: 'Dashboard refused connection' }),
    });
    const status = bridge.getSnapshot().systemStatus;

    expect(status.activeImplementation).toBe('real');
    expect(status.hermesAvailable).toBe('available');
    expect(status.dashboardAvailable).toBe('unavailable');
    expect(status.dataSources?.skills).toBe('unavailable');
    expect(status.warnings).toContain('Hermes dashboard compatibility unavailable: Dashboard refused connection');
    expect(status.logsSummary).toContain('Dashboard compatibility unavailable');
  });

  test('real mode does not call protected dashboard compatibility endpoints without token access', async () => {
    const calls: string[] = [];
    const protectedEndpoint = async (name: string) => {
      calls.push(name);
      return { ok: true, status: 200, data: {} };
    };

    const bridge = await createBridgeFromConfig(
      { ...defaultConfig, bridgeMode: 'real' },
      {
        apiClient: {
          checkHealth: async () => ({
            ok: true,
            message: 'Gateway API healthy',
            profile: { id: 'api-profile', name: 'API Profile' },
          }),
          runTask: async () => ({ ok: true, output: 'Done.', events: [] }),
        },
        dashboardClient: {
          ...dashboardClient({ ok: true, message: 'Dashboard API healthy' }, false),
          listSkills: () => protectedEndpoint('listSkills'),
          listToolsets: () => protectedEndpoint('listToolsets'),
          listSessions: () => protectedEndpoint('listSessions'),
          getLogs: () => protectedEndpoint('getLogs'),
        },
      },
    );

    expect(calls).toEqual([]);
    expect(bridge.getSnapshot().systemStatus.dataSources?.skills).toBe('unavailable');
    expect(bridge.getSnapshot().systemStatus.dataSources?.sessions).toBe('unavailable');
  });

  test('real mode maps dashboard compatibility skills and toolsets onto the active Hermes profile when token access is explicit', async () => {
    const bridge = await createBridgeFromConfig(
      { ...defaultConfig, bridgeMode: 'real' },
      {
        apiClient: {
          checkHealth: async () => ({
            ok: true,
            message: 'Gateway API healthy',
            profile: { id: 'api-profile', name: 'API Profile' },
          }),
          runTask: async () => ({ ok: true, output: 'Done.', events: [] }),
        },
        dashboardClient: {
          ...dashboardClient({ ok: true, message: 'Dashboard API healthy' }, true),
          listSkills: async () => ({
            ok: true,
            status: 200,
            data: {
              skills: [
                {
                  id: 'research',
                  name: 'Research',
                  category: 'analysis',
                  description: 'Search and synthesize sources.',
                  trigger: 'research',
                  enabled: true,
                },
              ],
            },
          }),
          listToolsets: async () => ({
            ok: true,
            status: 200,
            data: {
              toolsets: [
                { name: 'browser', enabled: true },
                { name: 'filesystem', enabled: false },
              ],
            },
          }),
        },
      },
    );

    const snapshot = bridge.getSnapshot();
    const activeAgent = snapshot.agents.find((agent) => agent.id === snapshot.activeProfileId);

    expect(activeAgent?.skills).toEqual([
      {
        id: 'research',
        name: 'Research',
        category: 'analysis',
        description: 'Search and synthesize sources.',
        trigger: 'research',
        enabled: true,
      },
    ]);
    expect(activeAgent?.equipment).toContain('Toolset: browser');
    expect(activeAgent?.equipment).not.toContain('Toolset: filesystem');
    expect(snapshot.systemStatus.dataSources?.skills).toBe('dashboard-compatibility');
    expect(snapshot.systemStatus.dataSources?.toolsets).toBe('dashboard-compatibility');
  });

  test('real mode maps gateway REST models and capabilities onto the active Hermes profile', async () => {
    const bridge = await createBridgeFromConfig(
      { ...defaultConfig, bridgeMode: 'real' },
      {
        apiClient: {
          checkHealth: async () => ({
            ok: true,
            message: 'Gateway API healthy',
            profile: { id: 'api-profile', name: 'API Profile' },
          }),
          checkDetailedHealth: async () => ({ ok: true, status: 200, data: { status: 'ok' } }),
          listModels: async () => ({ ok: true, status: 200, data: { data: [{ id: 'hermes-local' }] } }),
          getCapabilities: async () => ({ ok: true, status: 200, data: { capabilities: ['runs', 'responses'] } }),
          runTask: async () => ({ ok: true, output: 'Done.', events: [] }),
        },
        dashboardClient: dashboardClient({ ok: false, message: 'Dashboard unavailable' }),
      },
    );

    const snapshot = bridge.getSnapshot();
    const activeAgent = snapshot.agents.find((agent) => agent.id === snapshot.activeProfileId);

    expect(snapshot.systemStatus.providerHealth).toBe('healthy');
    expect(snapshot.systemStatus.dataSources?.models).toBe('gateway-rest');
    expect(snapshot.systemStatus.dataSources?.capabilities).toBe('gateway-rest');
    expect(activeAgent?.equipment).toContain('Model: hermes-local');
    expect(activeAgent?.equipment).toContain('Capability: runs');
    expect(activeAgent?.equipment).toContain('Capability: responses');
  });

  test('real mode maps dashboard operational REST data without exposing secret values', async () => {
    const bridge = await createBridgeFromConfig(
      { ...defaultConfig, bridgeMode: 'real' },
      {
        apiClient: {
          checkHealth: async () => ({
            ok: true,
            message: 'Gateway API healthy',
            profile: { id: 'api-profile', name: 'API Profile' },
          }),
          runTask: async () => ({ ok: true, output: 'Done.', events: [] }),
        },
        dashboardClient: {
          ...dashboardClient({ ok: true, message: 'Dashboard API healthy' }, true),
          listSessions: async () => ({ ok: true, status: 200, data: { sessions: [{ id: 's1' }, { id: 's2' }] } }),
          getSession: async (sessionId) => ({ ok: true, status: 200, data: { id: sessionId, title: 'Session one' } }),
          listSessionMessages: async (sessionId) => ({
            ok: true,
            status: 200,
            data: { messages: [{ session_id: sessionId, role: 'user' }, { session_id: sessionId, role: 'assistant' }] },
          }),
          getLogs: async () => ({ ok: true, status: 200, data: { logs: [{ level: 'warning' }, { level: 'info' }] } }),
          getAnalyticsUsage: async () => ({ ok: true, status: 200, data: { requests: 12, tokens: 3456 } }),
          listCronJobs: async () => ({ ok: true, status: 200, data: { jobs: [{ id: 'daily', enabled: true }] } }),
          getConfig: async () => ({ ok: true, status: 200, data: { default_model: 'hermes-local' } }),
          getConfigDefaults: async () => ({ ok: true, status: 200, data: { default_model: 'auto' } }),
          getConfigSchema: async () => ({ ok: true, status: 200, data: { properties: { default_model: {} } } }),
          getEnv: async () => ({
            ok: true,
            status: 200,
            data: {
              OPENAI_API_KEY: 'sk-live-secret',
              ANTHROPIC_API_KEY: { set: true, value: 'claude-secret' },
              EMPTY_KEY: '',
            },
          }),
        },
      },
    );

    const status = bridge.getSnapshot().systemStatus;

    expect(status.operationalData?.sessionsSummary).toBe('2 dashboard compatibility sessions');
    expect(status.operationalData?.sessionMessagesSummary).toBe('2 messages in session s1');
    expect(status.operationalData?.logsSummary).toBe('2 log entries, 1 warning/error');
    expect(status.operationalData?.analyticsSummary).toBe('12 requests, 3456 tokens');
    expect(status.operationalData?.cronSummary).toBe('1 cron job');
    expect(status.operationalData?.configSummary).toBe('config, defaults, schema available');
    expect(status.operationalData?.envSummary).toBe('2 env keys configured');
    expect(JSON.stringify(status.operationalData)).not.toContain('sk-live-secret');
    expect(JSON.stringify(status.operationalData)).not.toContain('claude-secret');
    expect(status.dataSources?.sessions).toBe('dashboard-compatibility');
    expect(status.dataSources?.logs).toBe('dashboard-compatibility');
    expect(status.dataSources?.analytics).toBe('dashboard-compatibility');
    expect(status.dataSources?.config).toBe('dashboard-compatibility');
    expect(status.dataSources?.env).toBe('dashboard-compatibility');
    expect(status.dataSources?.cronJobs).toBe('dashboard-compatibility');
  });

  test('real mode initialization does not call dashboard write endpoints', async () => {
    const writes: string[] = [];
    const writeEndpoint = async (name: string) => {
      writes.push(name);
      return { ok: true, status: 200, data: {} };
    };

    await createBridgeFromConfig(
      { ...defaultConfig, bridgeMode: 'real' },
      {
        apiClient: {
          checkHealth: async () => ({
            ok: true,
            message: 'Gateway API healthy',
            profile: { id: 'api-profile', name: 'API Profile' },
          }),
          runTask: async () => ({ ok: true, output: 'Done.', events: [] }),
        },
        dashboardClient: {
          ...dashboardClient({ ok: true, message: 'Dashboard API healthy' }),
          updateConfig: () => writeEndpoint('updateConfig'),
          updateEnv: () => writeEndpoint('updateEnv'),
          deleteEnv: () => writeEndpoint('deleteEnv'),
          createCronJob: () => writeEndpoint('createCronJob'),
          pauseCronJob: () => writeEndpoint('pauseCronJob'),
          resumeCronJob: () => writeEndpoint('resumeCronJob'),
          triggerCronJob: () => writeEndpoint('triggerCronJob'),
          deleteCronJob: () => writeEndpoint('deleteCronJob'),
          toggleSkill: () => writeEndpoint('toggleSkill'),
        },
      },
    );

    expect(writes).toEqual([]);
  });

  test('real mode maps gateway jobs when the gateway jobs endpoint is available', async () => {
    const bridge = await createBridgeFromConfig(
      { ...defaultConfig, bridgeMode: 'real' },
      {
        apiClient: {
          checkHealth: async () => ({
            ok: true,
            message: 'Gateway API healthy',
            profile: { id: 'api-profile', name: 'API Profile' },
          }),
          listJobs: async () => ({ ok: true, status: 200, data: { jobs: [{ id: 'j1' }, { id: 'j2' }, { id: 'j3' }] } }),
          runTask: async () => ({ ok: true, output: 'Done.', events: [] }),
        },
        dashboardClient: dashboardClient({ ok: false, message: 'Dashboard unavailable' }),
      },
    );

    const status = bridge.getSnapshot().systemStatus;

    expect(status.operationalData?.gatewayJobsSummary).toBe('3 gateway jobs');
    expect(status.dataSources?.gatewayJobs).toBe('gateway-rest');
  });

  test('real mode can stop a running gateway run when the run id is known', async () => {
    let runStarted: ((value: never) => void) | undefined;
    const stoppedRuns: string[] = [];
    const bridge = await createBridgeFromConfig(
      { ...defaultConfig, bridgeMode: 'real' },
      {
        apiClient: {
          checkHealth: async () => ({
            ok: true,
            message: 'Gateway API healthy',
            profile: { id: 'api-profile', name: 'API Profile' },
          }),
          runTask: async ({ onRunStarted }) => {
            onRunStarted?.('run-123');
            await new Promise<never>((resolve) => {
              runStarted = resolve;
            });
            return { ok: true, output: 'not reached', events: [] };
          },
          stopRun: async (runId) => {
            stoppedRuns.push(runId);
            return { ok: true, status: 200, data: { status: 'stopped' } };
          },
        },
        dashboardClient: dashboardClient({ ok: false, message: 'Dashboard unavailable' }),
      },
    );

    const taskId = bridge.createTask({ brief: 'Keep running.', assigneeId: bridge.getSnapshot().activeProfileId, type: 'pet' });
    await wait(10);

    const stopped = await bridge.stopTask?.(taskId);
    const task = bridge.getSnapshot().tasks.find((item) => item.id === taskId);

    expect(stopped).toBe(true);
    expect(stoppedRuns).toEqual(['run-123']);
    expect(task?.state).toBe('blocked');
    expect(task?.timeline.at(-1)?.message).toBe('Hermes gateway run stopped by the user.');
    runStarted?.(undefined as never);
  });

  test('real mode records gateway run status when run status endpoint is available', async () => {
    const bridge = await createBridgeFromConfig(
      { ...defaultConfig, bridgeMode: 'real' },
      {
        apiClient: {
          checkHealth: async () => ({
            ok: true,
            message: 'Gateway API healthy',
            profile: { id: 'api-profile', name: 'API Profile' },
          }),
          runTask: async ({ onRunStarted }) => {
            onRunStarted?.('run-123');
            return { ok: true, runId: 'run-123', output: 'Done.', events: [{ event: 'run.completed', output: 'Done.' }] };
          },
          getRun: async (runId) => ({ ok: true, status: 200, data: { id: runId, status: 'completed' } }),
        },
        dashboardClient: dashboardClient({ ok: false, message: 'Dashboard unavailable' }),
      },
    );

    const taskId = bridge.createTask({ brief: 'Check status.', assigneeId: bridge.getSnapshot().activeProfileId, type: 'pet' });
    await wait(20);

    const task = bridge.getSnapshot().tasks.find((item) => item.id === taskId);

    expect(task?.timeline.map((event) => event.message)).toContain('Gateway run status: completed.');
    expect(bridge.getSnapshot().systemStatus.dataSources?.runStatus).toBe('gateway-rest');
  });

  test('real mode reports stop unavailable when a running task has no gateway run id', async () => {
    let release: ((value: never) => void) | undefined;
    const bridge = await createBridgeFromConfig(
      { ...defaultConfig, bridgeMode: 'real' },
      {
        apiClient: {
          checkHealth: async () => ({
            ok: true,
            message: 'Gateway API healthy',
            profile: { id: 'api-profile', name: 'API Profile' },
          }),
          runTask: async () => {
            await new Promise<never>((resolve) => {
              release = resolve;
            });
            return { ok: true, output: 'not reached', events: [] };
          },
        },
        dashboardClient: dashboardClient({ ok: false, message: 'Dashboard unavailable' }),
      },
    );

    const taskId = bridge.createTask({ brief: 'No run id yet.', assigneeId: bridge.getSnapshot().activeProfileId, type: 'pet' });
    await wait(10);

    const stopped = await bridge.stopTask?.(taskId);
    const status = bridge.getSnapshot().systemStatus;

    expect(stopped).toBe(false);
    expect(status.warnings).toContain('Stop unavailable: Hermes run id is not known for this task.');
    release?.(undefined as never);
  });

  test('real mode never falls back to mock when Hermes health fails', async () => {
    const apiClient: HermesApiClient = {
      checkHealth: async () => ({ ok: false, message: 'Hermes API unavailable' }),
      runTask: async () => ({ ok: false, output: '', error: 'Hermes API unavailable', events: [] }),
    };

    const bridge = await createBridgeFromConfig({ ...defaultConfig, bridgeMode: 'real' }, { apiClient });
    const snapshot = bridge.getSnapshot();

    expect(snapshot.systemStatus.bridgeMode).toBe('real');
    expect(snapshot.systemStatus.activeImplementation).toBe('real');
    expect(snapshot.systemStatus.hermesAvailable).toBe('unavailable');
    expect(snapshot.systemStatus.fallbackReason).toBeUndefined();
    expect(snapshot.systemStatus.logsSummary).toContain('Hermes API unavailable');
    expect(snapshot.systemStatus.logsSummary).not.toContain('fallback to mock');
    expect(snapshot.systemStatus.logsSummary).not.toContain('Mock Hermes Bridge');
    expect(snapshot.agents.find((agent) => agent.id === snapshot.activeProfileId)?.status).toBe('error');
    expect(snapshot.agents.map((agent) => agent.name)).not.toContain('Brass');
  });

  test('real mode completes a pet task through the Hermes API into a reviewable report card', async () => {
    const calls: Array<{ input: string; instructions?: string; sessionId?: string }> = [];
    const apiClient: HermesApiClient = {
      checkHealth: async () => ({ ok: true, message: 'Hermes API healthy' }),
      runTask: async ({ input, instructions, sessionId }) => {
        calls.push({ input, instructions, sessionId });
        return {
          ok: true,
          output: `API completed:\n${input}\nFinal answer from Hermes API.`,
          events: [
            { event: 'message.delta', delta: 'Final answer ' },
            { event: 'run.completed', output: 'Final answer from Hermes API.' },
          ],
        };
      },
    };
    const bridge = await createBridgeFromConfig({ ...defaultConfig, bridgeMode: 'real' }, { apiClient });
    const activeAgent = await bridge.getActiveAgent?.();

    const taskId = await bridge.submitTask?.({
      brief: 'Write a real bridge smoke report.',
      assigneeId: activeAgent?.id ?? '',
      type: 'pet',
    });

    await wait(20);

    const snapshot = bridge.getSnapshot();
    const task = snapshot.tasks.find((item) => item.id === taskId);
    const report = snapshot.reports.find((item) => item.taskId === taskId);

    expect(activeAgent?.id).toBe('profile-unavailable');
    expect(calls).toHaveLength(1);
    expect(calls[0].input).toContain('Write a real bridge smoke report.');
    expect(calls[0].instructions).toContain('Quest Report Card');
    expect(calls[0].sessionId).toBe(taskId);
    expect(task?.state).toBe('needs_review');
    expect(task?.timeline.some((event) => event.source === 'hermes' && event.type === 'completed')).toBe(true);
    expect(report?.summary).toContain('Final answer from Hermes API');
    expect(report?.facts).toContain('Hermes API returned final output for this Guild quest.');
    expect(snapshot.systemStatus.hermesApiBaseUrl).toBe('http://127.0.0.1:8642');
  });

  test('real mode ignores configured real profile name and uses API profile metadata', async () => {
    const bridge = await createBridgeFromConfig(
      legacyConfigWithManualProfileName('Daily Driver'),
      {
        apiClient: {
          checkHealth: async () => ({
            ok: true,
            message: 'Hermes API healthy',
            profile: { id: 'api-profile', name: 'API Profile' },
          }),
          runTask: async () => ({ ok: true, output: 'Done.', events: [] }),
        },
      },
    );

    const snapshot = bridge.getSnapshot();
    const activeAgent = snapshot.agents.find((agent) => agent.id === snapshot.activeProfileId);

    expect(activeAgent?.id).toBe('api-profile');
    expect(activeAgent?.name).toBe('API Profile');
    expect(activeAgent?.activeInPet).toBe(true);
    expect(snapshot.activeProfileId).toBe('api-profile');
    expect(snapshot.systemStatus.logsSummary).toContain('API Profile');
    expect(snapshot.systemStatus.logsSummary).not.toContain('Daily Driver');
  });

  test('real mode uses API profile metadata when configured profile name is absent', async () => {
    const bridge = await createBridgeFromConfig(
      { bridgeMode: 'real', hermesApiBaseUrl: 'http://127.0.0.1:8642' },
      {
        apiClient: {
          checkHealth: async () => ({
            ok: true,
            message: 'Hermes API healthy',
            profile: { id: 'daily-driver', name: 'Daily Driver' },
          }),
          runTask: async () => ({ ok: true, output: 'Done.', events: [] }),
        },
      },
    );

    const snapshot = bridge.getSnapshot();
    const activeAgent = snapshot.agents.find((agent) => agent.id === snapshot.activeProfileId);

    expect(activeAgent?.id).toBe('daily-driver');
    expect(activeAgent?.name).toBe('Daily Driver');
  });

  test('real mode surfaces explicit missing profile state when API metadata is absent', async () => {
    const bridge = await createBridgeFromConfig(
      { bridgeMode: 'real', hermesApiBaseUrl: 'http://127.0.0.1:8642' },
      {
        apiClient: {
          checkHealth: async () => ({ ok: true, message: 'Hermes API healthy' }),
          runTask: async () => ({ ok: true, output: 'Done.', events: [] }),
        },
      },
    );

    const snapshot = bridge.getSnapshot();
    const activeAgent = snapshot.agents.find((agent) => agent.id === snapshot.activeProfileId);

    expect(activeAgent?.name).toBe('Profile unavailable');
    expect(activeAgent?.name).not.toBe('Hermes Builder');
    expect(activeAgent?.name).not.toBe('Hermes profile');
    expect(snapshot.systemStatus.warnings).toContain('Hermes API /health did not provide active profile metadata.');
  });

  test('real task timeline keeps pet-visible Hermes output free of synthetic run narration', async () => {
    const bridge = await createBridgeFromConfig(
      { bridgeMode: 'real', hermesApiBaseUrl: 'http://127.0.0.1:8642' },
      {
        apiClient: {
          checkHealth: async () => ({
            ok: true,
            message: 'Hermes API healthy',
            profile: { id: 'daily-driver', name: 'Daily Driver' },
          }),
          runTask: async () => ({
            ok: true,
            output: 'This is the real Hermes answer.',
            events: [
              { event: 'message.delta', delta: 'This is the real Hermes answer.' },
              { event: 'run.completed', output: 'This is the real Hermes answer.' },
            ],
          }),
        },
      },
    );

    const taskId = bridge.createTask({ brief: 'Say something useful.', assigneeId: bridge.getSnapshot().activeProfileId, type: 'pet' });
    await wait(20);

    const task = await bridge.getTask?.(taskId);
    const messages = task?.timeline.map((event) => event.message) ?? [];

    expect(messages).toContain('This is the real Hermes answer.');
    expect(messages).not.toContain('Started Hermes API run.');
    expect(messages).not.toContain('Hermes API streamed response text.');
    expect(messages).not.toContain('Hermes API run completed.');
    expect(messages).not.toContain('Captured final Hermes output as a review artifact.');
  });

  test('real mode uses the Hermes API client and not the subprocess runner', async () => {
    let apiRunCount = 0;
    const apiClient: HermesApiClient = {
      checkHealth: async () => ({ ok: true, message: 'Hermes API healthy' }),
      runTask: async () => ({
        ok: true,
        output: 'API path only.',
        events: [{ event: 'run.completed', output: 'API path only.' }],
      }),
    };
    const bridge = await createBridgeFromConfig({ ...defaultConfig, bridgeMode: 'real' }, {
      apiClient: {
        ...apiClient,
        runTask: async (input) => {
          apiRunCount += 1;
          return apiClient.runTask(input);
        },
      },
    });

    await bridge.submitTask?.({
      brief: 'Use API only.',
      assigneeId: bridge.getSnapshot().activeProfileId,
      type: 'pet',
    });

    await wait(20);

    expect(apiRunCount).toBe(1);
    expect(bridge.getSnapshot().systemStatus.logsSummary).not.toContain('CLI');
    expect(bridge.getSnapshot().systemStatus.logsSummary).not.toContain('subprocess');
  });

  test('real mode surfaces Hermes API failure on task, agent, and system status', async () => {
    const apiClient: HermesApiClient = {
      checkHealth: async () => ({ ok: true, message: 'Hermes API healthy' }),
      runTask: async () => ({
        ok: false,
        output: '',
        error: 'provider rejected the request',
        events: [{ event: 'run.failed', error: 'provider rejected the request' }],
      }),
    };
    const bridge = await createBridgeFromConfig({ ...defaultConfig, bridgeMode: 'real' }, { apiClient });

    const taskId = bridge.createTask({
      brief: 'Trigger real bridge error.',
      assigneeId: bridge.getSnapshot().activeProfileId,
      type: 'pet',
    });

    await wait(20);

    const snapshot = bridge.getSnapshot();
    const task = snapshot.tasks.find((item) => item.id === taskId);

    expect(task?.state).toBe('error');
    expect(task?.error).toContain('provider rejected the request');
    expect(task?.timeline.at(-1)?.type).toBe('error');
    expect(snapshot.agents.find((agent) => agent.id === snapshot.activeProfileId)?.status).toBe('error');
    expect(snapshot.systemStatus.gatewayStatus).toBe('error');
  });
});
