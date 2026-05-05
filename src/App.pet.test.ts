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
} from './App';
import type { HermesBridgeApi } from './bridge/types';

describe('Hermes companion runtime', () => {
  test('default render is companion-first and not a dashboard', () => {
    const html = renderToStaticMarkup(React.createElement(App));

    expect(html).toContain('desktop-companion-shell');
    expect(html).not.toContain('Ask Hermes anything...');
    expect(html).not.toContain('Good morning!');
    expect(html).not.toContain('floating-toolbar');
    expect(html).not.toContain('Companion menu');
    expect(html).not.toContain('Sprite Sheet Preview');
    expect(html).not.toContain('Show on desktop');

    expect(html).not.toContain('Guild Hall');
    expect(html).not.toContain('Quest Board');
    expect(html).not.toContain('Review Chamber');
    expect(html).not.toContain('pixel-ui-showcase');
  });

  test('panel routes render isolated control windows', () => {
    const originalWindow = globalThis.window;

    try {
      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: { location: { search: '?panel=appearance' } },
      });
      const appearanceHtml = renderToStaticMarkup(React.createElement(App));
      expect(appearanceHtml).toContain('panel-window-appearance');
      expect(appearanceHtml).toContain('Sprite Sheet Preview');
      expect(appearanceHtml).not.toContain('desktop-companion-shell');

      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: { location: { search: '?panel=settings' } },
      });
      const settingsHtml = renderToStaticMarkup(React.createElement(App));
      expect(settingsHtml).toContain('panel-window-settings');
      expect(settingsHtml).toContain('Show speech bubbles');
      expect(settingsHtml).not.toContain('companion-stage');
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
      frameWidth: 512,
      frameHeight: 512,
      framesPerRow: 4,
      rows: { idle: 0, talk: 1, think: 2, wave: 3 },
    });
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
      waitTimeoutMs: 200,
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
          state: snapshotReads > 2 ? 'needs_review' : 'running',
          progress: snapshotReads > 2 ? 100 : 25,
          artifacts: [],
          timeline: [],
          reviewStatus: snapshotReads > 2 ? 'required' : 'none',
          createdAt: '2026-05-06T00:00:00.000Z',
          updatedAt: '2026-05-06T00:00:00.000Z',
        }],
        reports: snapshotReads > 2 ? [{
          id: 'report-1',
          taskId: 'task-1',
          agentId: 'agent-1',
          title: 'Report',
          summary: 'Finished Hermes output.',
          artifacts: [],
          facts: [],
          assumptions: [],
          knownGaps: [],
          recommendedNextAction: '',
          reviewItems: [],
          createdAt: '2026-05-06T00:00:00.000Z',
        }] : [],
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
