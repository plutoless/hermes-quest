import { describe, expect, test } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import App, {
  addCompanion,
  createCompanionChatProvider,
  createInitialCompanionState,
  getAppearanceSourceMessage,
  getCompanionProviderMode,
  getNextAnimationState,
  syncCompanionsWithBridgeProfiles,
} from './App';
import type { HermesBridgeApi } from './bridge/types';
import type { BridgeSnapshot, CreateTaskInput } from './types';

describe('Hermes companion runtime', () => {
  test('default render is companion-first and not a dashboard', () => {
    const html = renderToStaticMarkup(React.createElement(App));

    expect(html).toContain('desktop-companion-shell');
    expect(html).not.toContain('Ask Hermes anything...');
    expect(html).not.toContain('Good morning!');
    expect(html).not.toContain('floating-toolbar');
    expect(html).not.toContain('Companion menu');
    expect(html).not.toContain('Sprite Animation Preview');
    expect(html).not.toContain('Show on desktop');

    expect(html).not.toContain('Companion Home');
    expect(html).not.toContain('Companion chat');
    expect(html).not.toContain('Review Chamber');
  });

  test('panel routes render isolated control windows', () => {
    const originalWindow = globalThis.window;
    const originalLocalStorage = globalThis.localStorage;

    try {
      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: { location: { search: '?panel=appearance' } },
      });
      const appearanceHtml = renderToStaticMarkup(React.createElement(App));
      expect(appearanceHtml).toContain('panel-window-appearance');
      expect(appearanceHtml).toContain('Sprite Animation Preview');
      expect(appearanceHtml).not.toContain('desktop-companion-shell');

      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: { location: { search: '?panel=settings' } },
      });
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: {
          getItem: (key: string) => key === 'hermes-companion.bridge-config'
            ? JSON.stringify({
              bridgeMode: 'real',
              hermesConnectionTarget: 'managed',
              managedHermesApiBaseUrl: 'https://managed.example.com/hermes',
              managedHermesBearerToken: '',
            })
            : null,
          setItem: () => undefined,
          removeItem: () => undefined,
          clear: () => undefined,
        },
      });
      const settingsHtml = renderToStaticMarkup(React.createElement(App));
      expect(settingsHtml).toContain('panel-window-settings');
      expect(settingsHtml).toContain('Show speech bubbles');
      expect(settingsHtml).toContain('Hermes connection');
      expect(settingsHtml).toContain('Local');
      expect(settingsHtml).toContain('Managed');
      expect(settingsHtml).toContain('Bearer token');
      expect(settingsHtml).not.toContain('companion-stage');
    } finally {
      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: originalWindow,
      });
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: originalLocalStorage,
      });
    }
  });

  test('profile-specific pet routes keep window companion identity', () => {
    const originalWindow = globalThis.window;

    try {
      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: { location: { search: '?mode=pet&companion=astra' } },
      });
      const astraHtml = renderToStaticMarkup(React.createElement(App));
      expect(astraHtml).toContain('aria-label="Chat with Astra"');
      expect(astraHtml).not.toContain('aria-label="Chat with Hermes"');

      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: { location: { search: '?mode=pet&companion=orion' } },
      });
      const orionHtml = renderToStaticMarkup(React.createElement(App));
      expect(orionHtml).toContain('aria-label="Chat with Orion"');
      expect(orionHtml).not.toContain('aria-label="Chat with Astra"');
    } finally {
      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: originalWindow,
      });
    }
  });

  test('initial companion state follows the PRD data model', () => {
    const state = createInitialCompanionState();

    expect(state.companions[0]).toMatchObject({
      id: 'hermes',
      name: 'Hermes',
      visible: true,
      status: 'idle',
      appearanceId: 'hermes-default',
      position: { x: 50, y: 54 },
      scale: 1,
    });
    expect(state.appearances[0]).toMatchObject({
      id: 'hermes-default',
      source: 'preset',
      frameWidth: 1254,
      frameHeight: 1254,
      framesPerRow: 10,
      rows: { idle: 0, talk: 1, think: 2, wave: 3 },
    });
    expect(state.appearances[0].frameUrls).toHaveLength(10);
    expect(state.settings).toMatchObject({
      alwaysOnTop: true,
      rememberPositions: true,
      allowDragging: true,
      showSpeechBubbles: true,
    });
  });

  test('message lifecycle maps to companion animation states', () => {
    expect(getNextAnimationState('click')).toBe('wave');
    expect(getNextAnimationState('send')).toBe('think');
    expect(getNextAnimationState('response')).toBe('talk');
    expect(getNextAnimationState('timeout')).toBe('idle');
    expect(getNextAnimationState('error')).toBe('think');
  });

  test('mock chat provider is explicit and real mode does not silently mock fallback', async () => {
    const mockProvider = createCompanionChatProvider({ mode: 'mock' });
    await expect(mockProvider.sendMessage({
      companionId: 'hermes',
      messages: [{ role: 'user', content: 'hello', timestamp: 1 }],
    })).resolves.toMatchObject({ role: 'assistant' });

    const realProvider = createCompanionChatProvider({ mode: 'hermes' });
    await expect(realProvider.sendMessage({
      companionId: 'hermes',
      messages: [{ role: 'user', content: 'hello', timestamp: 1 }],
    })).rejects.toThrow('Hermes bridge is unavailable');
  });

  test('provider mode keeps real strict and lets auto finish locally when Hermes is unavailable', () => {
    expect(getCompanionProviderMode('real', 'unavailable')).toBe('hermes');
    expect(getCompanionProviderMode('auto', 'unavailable')).toBe('mock');
    expect(getCompanionProviderMode('auto', 'available')).toBe('hermes');
    expect(getCompanionProviderMode('mock', 'available')).toBe('mock');
  });

  test('real chat provider resolves with finished bridge output', async () => {
    const bridge = bridgeThatFinishesAfterPolling();
    const provider = createCompanionChatProvider({
      mode: 'hermes',
      bridge,
      pollIntervalMs: 1,
    });

    await expect(provider.sendMessage({
      companionId: 'hermes',
      messages: [{ role: 'user', content: 'finish this', timestamp: 1 }],
    })).resolves.toMatchObject({
      role: 'assistant',
      content: 'Finished Hermes output.',
    });
  });

  test('real chat provider routes by selected companion profile id', async () => {
    const submitted: CreateTaskInput[] = [];
    const bridge = bridgeThatRecordsAssignees(submitted);
    const provider = createCompanionChatProvider({
      mode: 'hermes',
      bridge,
      pollIntervalMs: 1,
    });

    await provider.sendMessage({
      companionId: 'reviewer-profile',
      messages: [{ role: 'user', content: 'check this', timestamp: 1 }],
    });
    await provider.sendMessage({
      companionId: 'builder-profile',
      messages: [{ role: 'user', content: 'build this', timestamp: 2 }],
    });

    expect(submitted.map((input) => input.assigneeId)).toEqual(['reviewer-profile', 'builder-profile']);
    expect(submitted.map((input) => input.type)).toEqual(['pet', 'pet']);
  });

  test('real bridge profiles hydrate companion rows without mock fallback', () => {
    const state = createInitialCompanionState();
    const snapshot = bridgeSnapshotWithProfiles();
    const next = syncCompanionsWithBridgeProfiles(state, snapshot, 'hermes');

    expect(next.companions.map((companion) => companion.id)).toEqual(['builder-profile', 'reviewer-profile', 'profile-unavailable']);
    expect(next.companions[0]).toMatchObject({
      id: 'builder-profile',
      name: 'Builder Profile',
      visible: true,
      agent: {
        agentId: 'builder-profile',
        source: 'cli',
        executionRouting: 'supported',
      },
    });
    expect(next.companions[2].description).toContain('hermes profile list failed');
    expect(next.companions[2].agent?.source).toBe('unavailable');
    expect(next.selectedCompanionId).toBe('builder-profile');
  });

  test('dialog actions have concrete state and honest placeholder copy', () => {
    const initialState = createInitialCompanionState();
    const nextState = addCompanion(initialState);

    expect(nextState.companions).toHaveLength(initialState.companions.length + 1);
    expect(nextState.selectedCompanionId).toBe(nextState.companions.at(-1)?.id);
    expect(nextState.companions.at(-1)).toMatchObject({
      visible: true,
      status: 'idle',
      appearanceId: 'hermes-default',
    });

    expect(getAppearanceSourceMessage('preset')).toContain('bundled Hermes preset');
    expect(getAppearanceSourceMessage('generated')).toContain('not connected yet');
    expect(getAppearanceSourceMessage('uploaded')).toContain('not connected yet');
  });
});

function bridgeSnapshotWithProfiles(): BridgeSnapshot {
  return {
    agents: [
      {
        id: 'builder-profile',
        name: 'Builder Profile',
        role: 'Builder',
        source: 'cli',
        executionRouting: 'supported',
        status: 'idle',
        availability: 'available',
        activeInPet: true,
        skills: [],
        traits: [],
        bestFor: '',
        avoid: '',
        health: 'Mapped from profile list',
        equipment: [],
      },
      {
        id: 'reviewer-profile',
        name: 'Reviewer Profile',
        role: 'Reviewer',
        source: 'local-state',
        executionRouting: 'supported',
        status: 'idle',
        availability: 'available',
        activeInPet: false,
        skills: [],
        traits: [],
        bestFor: '',
        avoid: '',
        health: 'Mapped from profile list',
        equipment: [],
      },
      {
        id: 'profile-unavailable',
        name: 'Profile unavailable',
        role: 'Builder',
        source: 'unavailable',
        executionRouting: 'unsupported',
        unavailableReason: 'hermes profile list failed',
        status: 'error',
        availability: 'offline',
        activeInPet: false,
        skills: [],
        traits: [],
        bestFor: '',
        avoid: '',
        health: 'hermes profile list failed',
        equipment: [],
      },
    ],
    activeProfileId: 'builder-profile',
    tasks: [],
    reports: [],
    systemStatus: {
      gatewayStatus: 'connected',
      providerHealth: 'healthy',
      bridgeMode: 'real',
      activeImplementation: 'real',
      hermesAvailable: 'available',
      logsSummary: 'Hermes available',
      warnings: [],
    },
    petPosition: { x: 0, y: 0 },
  };
}

function bridgeThatFinishesAfterPolling(): HermesBridgeApi {
  let snapshotReads = 0;
  const bridge = {
    getSnapshot: () => {
      snapshotReads += 1;
      return {
        agents: [{
          id: 'agent-1',
          name: 'Hermes Profile',
          role: 'Builder',
          status: 'idle',
          availability: 'available',
          activeInPet: true,
          skills: [],
          traits: [],
          bestFor: '',
          avoid: '',
          health: '',
          equipment: [],
        }],
        activeProfileId: 'agent-1',
        tasks: [{
          id: 'task-1',
          title: 'finish this',
          assigneeId: 'agent-1',
          brief: 'finish this',
          type: 'pet',
          state: snapshotReads > 2 ? 'completed' : 'running',
          progress: snapshotReads > 2 ? 100 : 25,
          artifacts: [],
          timeline: snapshotReads > 2 ? [{
            id: 'timeline-1',
            taskId: 'task-1',
            agentId: 'agent-1',
            type: 'completed',
            message: 'Finished Hermes output.',
            timestamp: '2026-05-06T00:00:00.000Z',
            source: 'hermes',
          }] : [],
          reviewStatus: 'none',
          createdAt: '2026-05-06T00:00:00.000Z',
          updatedAt: '2026-05-06T00:00:00.000Z',
        }],
        reports: [],
        systemStatus: {
          gatewayStatus: 'connected',
          providerHealth: 'healthy',
          bridgeMode: 'real',
          activeImplementation: 'real',
          hermesAvailable: 'available',
          logsSummary: 'Hermes available',
          warnings: [],
        },
        petPosition: { x: 0, y: 0 },
      };
    },
    subscribe: () => () => undefined,
    setActiveProfile: () => undefined,
    createTask: () => 'task-1',
    approveReport: () => undefined,
    requestRevision: () => undefined,
    simulateBlocked: () => undefined,
    simulateError: () => undefined,
    setPetPosition: () => undefined,
  } satisfies HermesBridgeApi;

  return bridge;
}

function bridgeThatRecordsAssignees(submitted: CreateTaskInput[]): HermesBridgeApi {
  let reportTaskId = '';
  const snapshot = bridgeSnapshotWithProfiles();
  const bridge = {
    getSnapshot: () => ({
      ...snapshot,
      tasks: reportTaskId ? [{
        id: reportTaskId,
        title: 'Task',
        assigneeId: submitted.at(-1)?.assigneeId ?? 'builder-profile',
        brief: submitted.at(-1)?.brief ?? 'Task',
        type: 'pet',
        state: 'completed',
        progress: 100,
        artifacts: [],
        timeline: [{
          id: `timeline-${reportTaskId}`,
          taskId: reportTaskId,
          agentId: submitted.at(-1)?.assigneeId ?? 'builder-profile',
          type: 'completed',
          message: `Finished ${submitted.at(-1)?.assigneeId}.`,
          timestamp: '2026-05-06T00:00:00.000Z',
          source: 'hermes',
        }],
        reviewStatus: 'none',
        createdAt: '2026-05-06T00:00:00.000Z',
        updatedAt: '2026-05-06T00:00:00.000Z',
      }] : [],
      reports: [],
    }),
    subscribe: () => () => undefined,
    setActiveProfile: () => undefined,
    createTask: (input: CreateTaskInput) => {
      submitted.push(input);
      reportTaskId = `task-${submitted.length}`;
      return reportTaskId;
    },
    approveReport: () => undefined,
    requestRevision: () => undefined,
    simulateBlocked: () => undefined,
    simulateError: () => undefined,
    setPetPosition: () => undefined,
  } satisfies HermesBridgeApi;

  return bridge;
}
