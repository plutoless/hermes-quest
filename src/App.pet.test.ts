import { describe, expect, test } from 'bun:test';
import { getPetAgentResponse } from './App';
import type { Agent, ReportCard, Task } from './types';

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
