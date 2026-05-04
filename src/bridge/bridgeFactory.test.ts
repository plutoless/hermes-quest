import { beforeEach, describe, expect, test } from 'bun:test';
import { createBridgeFromConfig, loadBridgeConfig, saveBridgeConfig } from './bridgeFactory';
import type { BridgeConfig, HermesApiClient } from './types';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const defaultConfig: BridgeConfig = {
  bridgeMode: 'auto',
  hermesApiBaseUrl: 'http://127.0.0.1:8642',
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
  return { bridgeMode: 'real', hermesApiBaseUrl: 'http://127.0.0.1:8642', realProfileName: name };
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
    });

    expect(loadBridgeConfig()).toEqual({
      bridgeMode: 'real',
      hermesApiBaseUrl: 'http://127.0.0.1:9999',
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
    });
  });

  test('creates mock bridge directly in mock mode', async () => {
    const bridge = await createBridgeFromConfig({ ...defaultConfig, bridgeMode: 'mock' });
    const status = bridge.getSnapshot().systemStatus;

    expect(status.bridgeMode).toBe('mock');
    expect(status.activeImplementation).toBe('mock');
    expect(status.hermesAvailable).toBe('unchecked');
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

    const bridge = await createBridgeFromConfig(defaultConfig, { apiClient });
    const status = bridge.getSnapshot().systemStatus;

    expect(status.bridgeMode).toBe('auto');
    expect(status.activeImplementation).toBe('mock');
    expect(status.hermesAvailable).toBe('unavailable');
    expect(status.fallbackReason).toBe('Hermes API refused connection');
    expect(status.gatewayStatus).toBe('mocked');
    expect(status.logsSummary).toContain('fallback to mock');
    expect(status.warnings).toContain('Auto mode fallback: Hermes API refused connection');
  });

  test('auto mode uses real bridge when Hermes health passes', async () => {
    const apiClient: HermesApiClient = {
      checkHealth: async () => ({ ok: true, message: 'Hermes API healthy' }),
      runTask: async () => ({ ok: true, output: 'auto real output', events: [] }),
    };

    const bridge = await createBridgeFromConfig(defaultConfig, { apiClient });
    const status = bridge.getSnapshot().systemStatus;

    expect(status.bridgeMode).toBe('auto');
    expect(status.activeImplementation).toBe('real');
    expect(status.hermesAvailable).toBe('available');
    expect(status.gatewayStatus).toBe('connected');
    expect(status.logsSummary).toContain('Bridge mode: auto');
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
