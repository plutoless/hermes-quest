import { describe, expect, test } from 'bun:test';
import { getOperationalStatusRows, getPetAgentResponse } from './App';
import type { Agent, ReportCard, SystemStatus, Task } from './types';

const now = '2026-05-05T00:00:00.000Z';

const activeAgent: Agent = {
  id: 'api-profile',
  name: 'API Profile',
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
};

function task(patch: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Test quest',
    assigneeId: activeAgent.id,
    brief: 'Test quest',
    type: 'pet',
    state: 'needs_review',
    progress: 100,
    artifacts: [],
    timeline: [],
    reviewStatus: 'required',
    createdAt: now,
    updatedAt: now,
    ...patch,
  };
}

function report(patch: Partial<ReportCard> = {}): ReportCard {
  return {
    id: 'report-1',
    taskId: 'task-1',
    agentId: activeAgent.id,
    title: 'Report',
    summary: 'Manual Hermes output.',
    artifacts: [],
    facts: [],
    assumptions: [],
    knownGaps: [],
    recommendedNextAction: '',
    reviewItems: [],
    createdAt: now,
    ...patch,
  };
}

describe('Pet chat response text', () => {
  test('completed report displays raw Hermes output without report wrapper text', () => {
    const response = getPetAgentResponse({
      activeAgent,
      activeQuest: undefined,
      pendingReports: [report()],
      tasks: [task()],
      lastSubmittedTaskId: 'task-1',
    });

    expect(response?.message.text).toBe('Manual Hermes output.');
    expect(response?.message.text).not.toContain('Returned output:');
  });

  test('running task with no Hermes text does not create an agent bubble', () => {
    const response = getPetAgentResponse({
      activeAgent,
      activeQuest: task({
        state: 'running',
        progress: 25,
        reviewStatus: 'none',
        timeline: [
          {
            id: 'event-1',
            taskId: 'task-1',
            agentId: activeAgent.id,
            type: 'assigned',
            message: 'Assigned to API Profile through the Hermes API bridge.',
            timestamp: now,
            source: 'guild',
          },
        ],
      }),
      pendingReports: [],
      tasks: [],
      lastSubmittedTaskId: 'task-1',
    });

    expect(response).toBeUndefined();
  });
});

describe('Operational status rows', () => {
  test('renders only real operational summaries with their source labels', () => {
    const status: SystemStatus = {
      gatewayStatus: 'connected',
      providerHealth: 'healthy',
      dashboardAvailable: 'available',
      bridgeMode: 'real',
      activeImplementation: 'real',
      hermesAvailable: 'available',
      logsSummary: 'real mode',
      warnings: [],
      dataSources: {
        sessions: 'dashboard-compatibility',
        sessionMessages: 'dashboard-compatibility',
        logs: 'dashboard-compatibility',
        analytics: 'dashboard-compatibility',
        cronJobs: 'unavailable',
        gatewayJobs: 'gateway-rest',
      },
      operationalData: {
        sessionsSummary: '2 dashboard sessions',
        sessionMessagesSummary: '2 messages in session s1',
        logsSummary: '2 log entries, 1 warning/error',
        analyticsSummary: '12 requests, 3456 tokens',
        gatewayJobsSummary: '3 gateway jobs',
      },
    };

    expect(getOperationalStatusRows(status)).toEqual([
      { label: 'Sessions', value: '2 dashboard sessions', source: 'dashboard-compatibility' },
      { label: 'Session messages', value: '2 messages in session s1', source: 'dashboard-compatibility' },
      { label: 'Logs', value: '2 log entries, 1 warning/error', source: 'dashboard-compatibility' },
      { label: 'Analytics', value: '12 requests, 3456 tokens', source: 'dashboard-compatibility' },
      { label: 'Gateway jobs', value: '3 gateway jobs', source: 'gateway-rest' },
    ]);
  });
});
