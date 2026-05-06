import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { createMockHermesBridge } from './mockHermesBridge';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const originalLocalStorage = globalThis.localStorage;
const originalBroadcastChannel = globalThis.BroadcastChannel;
const originalWindow = globalThis.window;

type FakeStorageListener = (event: { key: string; newValue: string | null }) => void;
let storageListeners: FakeStorageListener[] = [];

function installFakeStorage() {
  const storage = new Map<string, string>();
  storageListeners = [];
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
  Object.defineProperty(globalThis, 'BroadcastChannel', {
    configurable: true,
    value: undefined,
  });
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      addEventListener: (eventName: string, listener: FakeStorageListener) => {
        if (eventName === 'storage') storageListeners.push(listener);
      },
      removeEventListener: (eventName: string, listener: FakeStorageListener) => {
        if (eventName !== 'storage') return;
        storageListeners = storageListeners.filter((item) => item !== listener);
      },
    },
  });
}

function installFakeBroadcastChannel() {
  const channels = new Map<string, Array<{ onmessage: ((message: { data: unknown }) => void) | null }>>();

  class FakeBroadcastChannel {
    onmessage: ((message: { data: unknown }) => void) | null = null;
    private readonly name: string;

    constructor(name: string) {
      this.name = name;
      channels.set(name, [...(channels.get(name) ?? []), this]);
    }

    postMessage(data: unknown) {
      channels.get(this.name)?.forEach((channel) => {
        if (channel === this) return;
        channel.onmessage?.({ data });
      });
    }

    close() {
      channels.set(
        this.name,
        (channels.get(this.name) ?? []).filter((channel) => channel !== this),
      );
    }
  }

  Object.defineProperty(globalThis, 'BroadcastChannel', {
    configurable: true,
    value: FakeBroadcastChannel,
  });
}

beforeEach(() => {
  installFakeStorage();
});

afterEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: originalLocalStorage,
  });
  Object.defineProperty(globalThis, 'BroadcastChannel', {
    configurable: true,
    value: originalBroadcastChannel,
  });
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: originalWindow,
  });
});

describe('mockHermesBridge', () => {
  test('starts with one active Builder pet and three configured agents', () => {
    const bridge = createMockHermesBridge();
    const snapshot = bridge.getSnapshot();

    expect(snapshot.activeProfileId).toBe('builder');
    expect(snapshot.agents).toHaveLength(3);
    expect(snapshot.agents.find((agent) => agent.activeInPet)?.id).toBe('builder');
  });

  test('creates directly assigned pet tasks for the active profile', () => {
    const bridge = createMockHermesBridge();
    const taskId = bridge.createTask({
      brief: 'Prepare a test companion response.',
      assigneeId: 'builder',
      type: 'pet',
    });
    const snapshot = bridge.getSnapshot();
    const task = snapshot.tasks.find((item) => item.id === taskId);

    expect(task?.assigneeId).toBe('builder');
    expect(task?.state).toBe('assigned');
    expect(task?.timeline.map((event) => event.type)).toEqual(['created', 'assigned']);
    expect(snapshot.agents.find((agent) => agent.id === 'builder')?.status).toBe('thinking');
  });

  test('ignores unknown active profiles and rejects unknown assignees', () => {
    const bridge = createMockHermesBridge();

    bridge.setActiveProfile('missing-agent');

    expect(bridge.getSnapshot().activeProfileId).toBe('builder');
    expect(() =>
      bridge.createTask({
        brief: 'Try to assign nowhere.',
        assigneeId: 'missing-agent',
        type: 'companion_chat',
      }),
    ).toThrow('Unknown assignee missing-agent');
  });

  test('keeps advanced companion intake fields with the task', () => {
    const bridge = createMockHermesBridge();
    const taskId = bridge.createTask({
      brief: 'Prepare a scoped implementation pass.',
      goals: 'Ship the narrow vertical loop.',
      nonGoals: 'Keep the companion surface focused.',
      context: 'Use the current mock bridge only.',
      definitionOfDone: 'Task detail shows timeline and review artifacts.',
      assigneeId: 'builder',
      type: 'companion_chat',
    });
    const task = bridge.getSnapshot().tasks.find((item) => item.id === taskId);

    expect(task?.goals).toBe('Ship the narrow vertical loop.');
    expect(task?.nonGoals).toBe('Keep the companion surface focused.');
    expect(task?.context).toBe('Use the current mock bridge only.');
    expect(task?.definitionOfDone).toBe('Task detail shows timeline and review artifacts.');
  });

  test('completes mock execution with a reviewable companion response', async () => {
    const bridge = createMockHermesBridge();
    const taskId = bridge.createTask({
      brief: 'Prepare a test companion response.',
      assigneeId: 'builder',
      type: 'pet',
    });

    await wait(4700);

    const snapshot = bridge.getSnapshot();
    const task = snapshot.tasks.find((item) => item.id === taskId);
    const report = snapshot.reports.find((item) => item.taskId === taskId);

    expect(task?.state).toBe('needs_review');
    expect(task?.reviewStatus).toBe('required');
    expect(task?.artifacts.length).toBeGreaterThan(0);
    expect(task?.timeline.some((event) => event.type === 'review_required')).toBe(true);
    expect(report?.facts.length).toBeGreaterThan(0);
    expect(report?.assumptions.length).toBeGreaterThan(0);
    expect(report?.knownGaps.length).toBeGreaterThan(0);
  });

  test('approve and revise update review state through bridge actions', async () => {
    const bridge = createMockHermesBridge();
    const events: string[] = [];
    bridge.subscribe((_snapshot, event) => {
      if (event.type === 'revision_requested') events.push(`${event.taskId}:${String(event.payload?.revisionOfTaskId ?? '')}`);
      if (event.type === 'agent_idle') events.push(`idle:${event.agentId ?? ''}`);
    });
    const taskId = bridge.createTask({
      brief: 'Prepare a test companion response.',
      assigneeId: 'builder',
      type: 'pet',
    });

    await wait(4700);
    const report = bridge.getSnapshot().reports.find((item) => item.taskId === taskId);
    expect(report).toBeDefined();

    bridge.requestRevision(report!.id, 'Make the result shorter.');
    const revisionSnapshot = bridge.getSnapshot();
    const original = revisionSnapshot.tasks.find((item) => item.id === taskId);
    const revision = revisionSnapshot.tasks.find((item) => item.revisionOfTaskId === taskId);

    expect(original?.reviewStatus).toBe('revision_requested');
    expect(revision?.assigneeId).toBe('builder');
    expect(events).toContain(`${revision?.id}:${taskId}`);

    await wait(4700);
    const revisedReport = bridge.getSnapshot().reports.find((item) => item.taskId === revision?.id);
    expect(revisedReport).toBeDefined();
    bridge.approveReport(revisedReport!.id);

    const approved = bridge.getSnapshot().tasks.find((item) => item.id === revision?.id);
    expect(approved?.state).toBe('approved');
    expect(approved?.reviewStatus).toBe('approved');
    expect(events).toContain('idle:builder');
  }, 12000);

  test('simulateError surfaces gateway errors on task, agent, and system status', () => {
    const bridge = createMockHermesBridge();
    const taskId = bridge.createTask({
      brief: 'Trigger the error state.',
      assigneeId: 'builder',
      type: 'companion_chat',
    });

    bridge.simulateError(taskId);
    const snapshot = bridge.getSnapshot();
    const task = snapshot.tasks.find((item) => item.id === taskId);

    expect(task?.state).toBe('error');
    expect(task?.reviewStatus).toBe('none');
    expect(task?.error).toContain('Mock gateway error');
    expect(snapshot.agents.find((agent) => agent.id === 'builder')?.status).toBe('error');
    expect(snapshot.systemStatus.gatewayStatus).toBe('error');
  });

  test('simulateBlocked surfaces blocked state on task, agent, timeline, and event stream', () => {
    const bridge = createMockHermesBridge();
    const events: string[] = [];
    bridge.subscribe((_snapshot, event) => {
      events.push(event.type);
    });
    const taskId = bridge.createTask({
      brief: 'Trigger the blocked state.',
      assigneeId: 'builder',
      type: 'companion_chat',
    });

    bridge.simulateBlocked(taskId);
    const snapshot = bridge.getSnapshot();
    const task = snapshot.tasks.find((item) => item.id === taskId);

    expect(task?.state).toBe('blocked');
    expect(task?.reviewStatus).toBe('none');
    expect(task?.timeline.at(-1)?.type).toBe('blocked');
    expect(snapshot.agents.find((agent) => agent.id === 'builder')?.status).toBe('blocked');
    expect(snapshot.systemStatus.logsSummary).toContain('blocked');
    expect(events).toContain('task_blocked');
  });

  test('review actions ignore reports whose task is no longer actionable', async () => {
    const bridge = createMockHermesBridge();
    const taskId = bridge.createTask({
      brief: 'Complete then block before review.',
      assigneeId: 'builder',
      type: 'companion_chat',
    });

    await wait(4700);
    const report = bridge.getSnapshot().reports.find((item) => item.taskId === taskId);
    expect(report).toBeDefined();

    bridge.simulateBlocked(taskId);
    bridge.approveReport(report!.id);
    bridge.requestRevision(report!.id, 'Try to revise a blocked report.');

    const snapshot = bridge.getSnapshot();
    const task = snapshot.tasks.find((item) => item.id === taskId);
    expect(task?.state).toBe('blocked');
    expect(task?.reviewStatus).toBe('none');
    expect(snapshot.tasks.some((item) => item.revisionOfTaskId === taskId)).toBe(false);
  });

  test('revision tasks retain original advanced intake fields', async () => {
    const bridge = createMockHermesBridge();
    const taskId = bridge.createTask({
      brief: 'Complete a scoped companion message.',
      goals: 'Keep revision grounded.',
      nonGoals: 'Do not widen scope.',
      context: 'Original context survives review.',
      definitionOfDone: 'Revision preserves acceptance criteria.',
      assigneeId: 'builder',
      type: 'companion_chat',
    });

    await wait(4700);
    const report = bridge.getSnapshot().reports.find((item) => item.taskId === taskId);
    expect(report).toBeDefined();

    bridge.requestRevision(report!.id, 'Clarify the handoff.');
    const revision = bridge.getSnapshot().tasks.find((item) => item.revisionOfTaskId === taskId);

    expect(revision?.goals).toBe('Keep revision grounded.');
    expect(revision?.nonGoals).toBe('Do not widen scope.');
    expect(revision?.context).toBe('Original context survives review.');
    expect(revision?.definitionOfDone).toBe('Revision preserves acceptance criteria.');
  });

  test('persistent bridge mode stores and restores a snapshot envelope', () => {
    const bridge = createMockHermesBridge({ persist: true });
    const taskId = bridge.createTask({
      brief: 'Persist this mock companion message.',
      assigneeId: 'builder',
      type: 'pet',
    });

    bridge.simulateError(taskId);

    const stored = globalThis.localStorage.getItem('hermes-companion.mock-bridge.snapshot');
    expect(stored).toBeString();

    const parsed = JSON.parse(stored!);
    expect(parsed.event.type).toBe('gateway_error');
    expect(parsed.snapshot.tasks[0].state).toBe('error');

    const restoredBridge = createMockHermesBridge({ persist: true });
    const restored = restoredBridge.getSnapshot();
    expect(restored.tasks[0].id).toBe(taskId);
    expect(restored.tasks[0].state).toBe('error');
  });

  test('persistent bridge mode sanitizes invalid restored profile references', () => {
    const seed = createMockHermesBridge();
    const snapshot = seed.getSnapshot();
    globalThis.localStorage.setItem(
      'hermes-companion.mock-bridge.snapshot',
      JSON.stringify({
        origin: 'external',
        event: { id: 'event-external', type: 'active_profile_changed', timestamp: new Date().toISOString() },
        snapshot: {
          ...snapshot,
          activeProfileId: 'missing-agent',
          agents: snapshot.agents.map((agent) => ({ ...agent, activeInPet: agent.id === 'missing-agent' })),
          tasks: [
            {
              id: 'message-invalid',
              title: 'Invalid assignee task',
              assigneeId: 'missing-agent',
              brief: 'Should be sanitized.',
              type: 'companion_chat',
              state: 'assigned',
              progress: 0,
              artifacts: [],
              timeline: [],
              reviewStatus: 'none',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        },
      }),
    );

    const restored = createMockHermesBridge({ persist: true }).getSnapshot();
    expect(restored.activeProfileId).toBe('builder');
    expect(restored.agents.find((agent) => agent.id === 'builder')?.activeInPet).toBe(true);
    expect(restored.tasks[0].assigneeId).toBe('builder');
  });

  test('persistent bridge mode restores missing seeded agents from sanitized snapshots', () => {
    const seed = createMockHermesBridge();
    const snapshot = seed.getSnapshot();
    globalThis.localStorage.setItem(
      'hermes-companion.mock-bridge.snapshot',
      JSON.stringify({
        origin: 'external',
        event: { id: 'event-external', type: 'active_profile_changed', timestamp: new Date().toISOString() },
        snapshot: {
          ...snapshot,
          activeProfileId: 'missing-agent',
          agents: [],
          tasks: [],
          reports: [
            {
              id: 'report-invalid-agent',
              taskId: 'message-missing',
              agentId: 'missing-agent',
              title: 'Invalid report',
              summary: 'Should be dropped.',
              artifacts: [],
              facts: [],
              assumptions: [],
              knownGaps: [],
              recommendedNextAction: 'Drop it.',
              reviewItems: [],
              createdAt: new Date().toISOString(),
            },
          ],
        },
      }),
    );

    const restored = createMockHermesBridge({ persist: true }).getSnapshot();
    expect(restored.agents.map((agent) => agent.id)).toEqual(['researcher', 'builder', 'reviewer']);
    expect(restored.activeProfileId).toBe('builder');
    expect(restored.agents.find((agent) => agent.id === 'builder')?.activeInPet).toBe(true);
    expect(restored.reports).toHaveLength(0);
  });

  test('persistent bridge mode tolerates malformed snapshot collections', () => {
    const seed = createMockHermesBridge();
    const snapshot = seed.getSnapshot();
    globalThis.localStorage.setItem(
      'hermes-companion.mock-bridge.snapshot',
      JSON.stringify({
        origin: 'external',
        event: { id: 'event-external', type: 'active_profile_changed', timestamp: new Date().toISOString() },
        snapshot: {
          ...snapshot,
          activeProfileId: 'missing-agent',
          agents: undefined,
          tasks: undefined,
          reports: undefined,
        },
      }),
    );

    const restored = createMockHermesBridge({ persist: true }).getSnapshot();
    expect(restored.activeProfileId).toBe('builder');
    expect(restored.agents).toHaveLength(3);
    expect(restored.tasks).toEqual([]);
    expect(restored.reports).toEqual([]);
  });

  test('persistent bridge mode tolerates non-object stored snapshots', () => {
    globalThis.localStorage.setItem(
      'hermes-companion.mock-bridge.snapshot',
      JSON.stringify({
        origin: 'external',
        event: { id: 'event-external', type: 'active_profile_changed', timestamp: new Date().toISOString() },
        snapshot: null,
      }),
    );

    const restored = createMockHermesBridge({ persist: true }).getSnapshot();
    expect(restored.activeProfileId).toBe('builder');
    expect(restored.agents.map((agent) => agent.id)).toEqual(['researcher', 'builder', 'reviewer']);
    expect(restored.tasks).toEqual([]);
    expect(restored.reports).toEqual([]);
  });

  test('persistent bridge mode tolerates malformed system status and pet position', () => {
    const seed = createMockHermesBridge();
    const snapshot = seed.getSnapshot();
    globalThis.localStorage.setItem(
      'hermes-companion.mock-bridge.snapshot',
      JSON.stringify({
        origin: 'external',
        event: { id: 'event-external', type: 'active_profile_changed', timestamp: new Date().toISOString() },
        snapshot: {
          ...snapshot,
          systemStatus: { gatewayStatus: 'error', warnings: 'not-an-array' },
          petPosition: { x: Number.NaN, y: 'bad' },
        },
      }),
    );

    const restored = createMockHermesBridge({ persist: true }).getSnapshot();
    expect(restored.systemStatus.gatewayStatus).toBe('error');
    expect(restored.systemStatus.providerHealth).toBe('mocked');
    expect(restored.systemStatus.logsSummary).toBe('Mock Hermes Bridge is driving lifecycle events locally.');
    expect(restored.systemStatus.warnings).toEqual(['Native pet window behavior is configured but not verified without Rust/Tauri runtime.']);
    expect(restored.petPosition).toEqual({ x: 32, y: 32 });
  });

  test('persistent bridge mode receives storage event fallback updates', () => {
    const receivingBridge = createMockHermesBridge({ persist: true });
    const sendingBridge = createMockHermesBridge({ persist: true });
    const taskId = sendingBridge.createTask({
      brief: 'Sync this mock companion message.',
      assigneeId: 'builder',
      type: 'pet',
    });
    sendingBridge.simulateError(taskId);

    const stored = globalThis.localStorage.getItem('hermes-companion.mock-bridge.snapshot');
    expect(stored).toBeString();
    storageListeners.forEach((listener) => listener({ key: 'hermes-companion.mock-bridge.snapshot', newValue: stored }));

    const received = receivingBridge.getSnapshot();
    expect(received.tasks[0].id).toBe(taskId);
    expect(received.tasks[0].state).toBe('error');
    expect(received.systemStatus.gatewayStatus).toBe('error');
  });

  test('persistent bridge mode receives BroadcastChannel updates', () => {
    installFakeBroadcastChannel();
    const receivingBridge = createMockHermesBridge({ persist: true });
    const sendingBridge = createMockHermesBridge({ persist: true });
    const taskId = sendingBridge.createTask({
      brief: 'Broadcast this mock companion message.',
      assigneeId: 'builder',
      type: 'pet',
    });

    const received = receivingBridge.getSnapshot();
    expect(received.tasks[0].id).toBe(taskId);
    expect(received.tasks[0].state).toBe('assigned');
    expect(received.agents.find((agent) => agent.id === 'builder')?.status).toBe('thinking');
  });

  test('persistent bridge mode stops local timers when a remote update blocks the task', async () => {
    installFakeBroadcastChannel();
    const timerOwnerBridge = createMockHermesBridge({ persist: true });
    const remoteControlBridge = createMockHermesBridge({ persist: true });
    const taskId = timerOwnerBridge.createTask({
      brief: 'Block this task from another webview.',
      assigneeId: 'builder',
      type: 'pet',
    });

    remoteControlBridge.simulateBlocked(taskId);
    await wait(4700);

    const task = timerOwnerBridge.getSnapshot().tasks.find((item) => item.id === taskId);
    expect(task?.state).toBe('blocked');
    expect(task?.reviewStatus).toBe('none');
    expect(timerOwnerBridge.getSnapshot().reports.some((item) => item.taskId === taskId)).toBe(false);
  });

  test('persistent bridge storage fallback stops local timers when a remote update blocks the task', async () => {
    const timerOwnerBridge = createMockHermesBridge({ persist: true });
    const remoteControlBridge = createMockHermesBridge({ persist: true });
    const taskId = timerOwnerBridge.createTask({
      brief: 'Block this task through storage fallback.',
      assigneeId: 'builder',
      type: 'pet',
    });
    const createdEnvelope = globalThis.localStorage.getItem('hermes-companion.mock-bridge.snapshot');
    expect(createdEnvelope).toBeString();
    storageListeners.forEach((listener) => listener({ key: 'hermes-companion.mock-bridge.snapshot', newValue: createdEnvelope }));

    remoteControlBridge.simulateBlocked(taskId);
    const blockedEnvelope = globalThis.localStorage.getItem('hermes-companion.mock-bridge.snapshot');
    expect(blockedEnvelope).toBeString();
    storageListeners.forEach((listener) => listener({ key: 'hermes-companion.mock-bridge.snapshot', newValue: blockedEnvelope }));
    await wait(4700);

    const task = timerOwnerBridge.getSnapshot().tasks.find((item) => item.id === taskId);
    expect(task?.state).toBe('blocked');
    expect(timerOwnerBridge.getSnapshot().reports.some((item) => item.taskId === taskId)).toBe(false);
  });

  test('persistent bridge mode syncs active profile changes across BroadcastChannel', () => {
    installFakeBroadcastChannel();
    const receivingBridge = createMockHermesBridge({ persist: true });
    const sendingBridge = createMockHermesBridge({ persist: true });

    sendingBridge.setActiveProfile('researcher');

    const received = receivingBridge.getSnapshot();
    expect(received.activeProfileId).toBe('researcher');
    expect(received.agents.find((agent) => agent.id === 'researcher')?.activeInPet).toBe(true);
    expect(received.agents.find((agent) => agent.id === 'builder')?.activeInPet).toBe(false);
  });

  test('persistent bridge mode sanitizes invalid remote profile references', () => {
    const receivingBridge = createMockHermesBridge({ persist: true });
    const seed = createMockHermesBridge();
    const snapshot = seed.getSnapshot();
    const stored = JSON.stringify({
      origin: 'external',
      event: { id: 'event-external', type: 'active_profile_changed', timestamp: new Date().toISOString() },
      snapshot: {
        ...snapshot,
        activeProfileId: 'missing-agent',
        agents: snapshot.agents.map((agent) => ({ ...agent, activeInPet: false })),
        tasks: [
          {
            id: 'message-invalid-remote',
            title: 'Invalid remote assignee task',
            assigneeId: 'missing-agent',
            brief: 'Should be sanitized remotely.',
            type: 'companion_chat',
            state: 'assigned',
            progress: 0,
            artifacts: [],
            timeline: [],
            reviewStatus: 'none',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      },
    });

    storageListeners.forEach((listener) => listener({ key: 'hermes-companion.mock-bridge.snapshot', newValue: stored }));

    const received = receivingBridge.getSnapshot();
    expect(received.activeProfileId).toBe('builder');
    expect(received.agents.find((agent) => agent.id === 'builder')?.activeInPet).toBe(true);
    expect(received.tasks[0].assigneeId).toBe('builder');
  });

  test('persistent bridge mode syncs mocked pet position across BroadcastChannel', () => {
    installFakeBroadcastChannel();
    const receivingBridge = createMockHermesBridge({ persist: true });
    const sendingBridge = createMockHermesBridge({ persist: true });

    sendingBridge.setPetPosition({ x: 144, y: 96 });

    expect(receivingBridge.getSnapshot().petPosition).toEqual({ x: 144, y: 96 });
  });

  test('persistent bridge storage fallback syncs mocked pet position', () => {
    const receivingBridge = createMockHermesBridge({ persist: true });
    const sendingBridge = createMockHermesBridge({ persist: true });

    sendingBridge.setPetPosition({ x: 72, y: 180 });
    const stored = globalThis.localStorage.getItem('hermes-companion.mock-bridge.snapshot');
    expect(stored).toBeString();
    storageListeners.forEach((listener) => listener({ key: 'hermes-companion.mock-bridge.snapshot', newValue: stored }));

    expect(receivingBridge.getSnapshot().petPosition).toEqual({ x: 72, y: 180 });
  });
});
