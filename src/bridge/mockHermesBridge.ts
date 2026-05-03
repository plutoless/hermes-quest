import type {
  Agent,
  Artifact,
  BridgeEvent,
  BridgeEventType,
  BridgeSnapshot,
  CreateTaskInput,
  PetPosition,
  ReportCard,
  Task,
  TaskState,
  TimelineEvent,
} from '../types';
import type { HermesBridgeApi, Listener } from './types';
type BridgeChannelMessage = {
  origin: string;
  event: BridgeEvent;
  snapshot: BridgeSnapshot;
};

interface MockHermesBridgeOptions {
  persist?: boolean;
}

const now = () => new Date().toISOString();

let nextId = 1;
const runtimeId = Math.random().toString(36).slice(2, 8);
const id = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${runtimeId}-${nextId++}`;
const bridgeStorageKey = 'hermes-guild.mock-bridge.snapshot';
const bridgeChannelName = 'hermes-guild.mock-bridge';

const makeEvent = (type: BridgeEventType, agentId?: string, taskId?: string, payload?: Record<string, unknown>): BridgeEvent => ({
  id: id('event'),
  type,
  agentId,
  taskId,
  payload,
  timestamp: now(),
});

const agentsSeed: Agent[] = [
  {
    id: 'researcher',
    name: 'Lyra',
    role: 'Researcher',
    status: 'idle',
    availability: 'available',
    activeInPet: false,
    traits: ['Research', 'Context Discipline', 'Judgement'],
    bestFor: 'competitive scans, synthesis, source-heavy briefs',
    avoid: 'fast code edits without context',
    health: 'Mock session ready',
    equipment: ['GPT mock adapter', 'Read-only workspace', 'Research skill preset'],
    skills: [
      {
        id: 'skill-research-map',
        name: 'Source Map',
        category: 'Research',
        description: 'Turns a question into a cited investigation plan.',
        trigger: 'research, compare, analyze',
        enabled: true,
      },
    ],
  },
  {
    id: 'builder',
    name: 'Brass',
    role: 'Builder',
    status: 'idle',
    availability: 'available',
    activeInPet: true,
    traits: ['Execution', 'Planning', 'Reliability'],
    bestFor: 'implementation plans, demos, runnable product slices',
    avoid: 'unbounded strategy memos',
    health: 'Mock session ready',
    equipment: ['GPT mock adapter', 'Workspace tools', 'Build skill preset'],
    skills: [
      {
        id: 'skill-build-brief',
        name: 'Demo Brief',
        category: 'Execution',
        description: 'Creates a concrete product/demo brief and handoff card.',
        trigger: 'build, prepare, implement',
        enabled: true,
      },
    ],
  },
  {
    id: 'reviewer',
    name: 'Sable',
    role: 'Reviewer',
    status: 'idle',
    availability: 'available',
    activeInPet: false,
    traits: ['Judgement', 'Communication', 'Reliability'],
    bestFor: 'risk checks, acceptance review, revision prompts',
    avoid: 'first-pass speculative ideation',
    health: 'Mock session ready',
    equipment: ['GPT mock adapter', 'Review checklist', 'Risk scan preset'],
    skills: [
      {
        id: 'skill-risk-pass',
        name: 'Risk Pass',
        category: 'Review',
        description: 'Separates facts, assumptions, risks, and open questions.',
        trigger: 'review, approve, revise',
        enabled: true,
      },
    ],
  },
];

const seedSnapshot = (): BridgeSnapshot => ({
  agents: agentsSeed.map((agent) => ({ ...agent, skills: agent.skills.map((skill) => ({ ...skill })) })),
  activeProfileId: 'builder',
  tasks: [],
  reports: [],
  systemStatus: {
    gatewayStatus: 'mocked',
    providerHealth: 'mocked',
    bridgeMode: 'mock',
    activeImplementation: 'mock',
    hermesAvailable: 'unchecked',
    logsSummary: 'Mock Hermes Bridge is driving lifecycle events locally.',
    warnings: ['Native pet window behavior is configured but not verified without Rust/Tauri runtime.'],
  },
  petPosition: { x: 32, y: 32 },
});

class MockHermesBridge {
  private snapshot = seedSnapshot();
  private listeners = new Set<Listener>();
  private timers = new Map<string, Array<ReturnType<typeof setTimeout>>>();
  private readonly instanceId = id('bridge');
  private readonly persistAcrossWebviews: boolean;
  private channel?: BroadcastChannel;
  private storageListener?: (event: StorageEvent) => void;

  constructor(options: MockHermesBridgeOptions = {}) {
    this.persistAcrossWebviews = options.persist ?? false;

    if (!this.persistAcrossWebviews) return;

    this.snapshot = this.sanitizeSnapshot(this.readStoredSnapshot() ?? this.snapshot);
    this.channel = this.createChannel();
    this.storageListener = this.createStorageListener();
  }

  getSnapshot(): BridgeSnapshot {
    return structuredClone(this.snapshot);
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  setActiveProfile(agentId: string) {
    if (!this.hasAgent(agentId)) return;
    this.snapshot.activeProfileId = agentId;
    this.snapshot.agents = this.snapshot.agents.map((agent) => ({
      ...agent,
      activeInPet: agent.id === agentId,
    }));
    this.emit(makeEvent('active_profile_changed', agentId));
  }

  createTask(input: CreateTaskInput) {
    if (!this.hasAgent(input.assigneeId)) {
      throw new Error(`Unknown assignee ${input.assigneeId}`);
    }

    const createdAt = now();
    const taskId = id('quest');
    const title = this.titleFromBrief(input.brief);
    const created = this.timeline(taskId, input.assigneeId, 'created', `Quest created from ${input.type === 'pet' ? 'Pet Mode' : 'Quest Board'}.`, 'guild');
    const assigned = this.timeline(taskId, input.assigneeId, 'assigned', `Assigned directly to ${this.agentName(input.assigneeId)}.`, 'guild');
    const task: Task = {
      id: taskId,
      title,
      assigneeId: input.assigneeId,
      brief: input.brief,
      goals: input.goals,
      nonGoals: input.nonGoals,
      context: input.context,
      definitionOfDone: input.definitionOfDone,
      type: input.type,
      state: 'assigned',
      progress: 8,
      artifacts: [],
      timeline: [created, assigned],
      reviewStatus: 'none',
      createdAt,
      updatedAt: createdAt,
    };
    this.snapshot.tasks = [task, ...this.snapshot.tasks];
    this.setAgentBusy(input.assigneeId, taskId, 'thinking');
    this.emit(makeEvent('task_started', input.assigneeId, taskId, { state: 'assigned' }));
    this.scheduleLifecycle(taskId);
    return taskId;
  }

  approveReport(reportId: string) {
    const report = this.snapshot.reports.find((item) => item.id === reportId);
    if (!report) return;
    const task = this.findTask(report.taskId);
    if (!this.isReviewActionable(task)) return;
    this.updateTask(report.taskId, {
      state: 'approved',
      reviewStatus: 'approved',
      progress: 100,
      timeline: [
        ...task.timeline,
        this.timeline(report.taskId, report.agentId, 'approved', 'Quest Report Card approved by the user.', 'guild'),
      ],
    });
    this.setAgentIdle(report.agentId);
    this.emit(makeEvent('review_approved', report.agentId, report.taskId));
    this.emit(makeEvent('agent_idle', report.agentId));
  }

  requestRevision(reportId: string, instructions: string) {
    const report = this.snapshot.reports.find((item) => item.id === reportId);
    if (!report) return;
    const original = this.findTask(report.taskId);
    if (!this.isReviewActionable(original)) return;
    this.updateTask(original.id, {
      reviewStatus: 'revision_requested',
      timeline: [
        ...original.timeline,
        this.timeline(original.id, report.agentId, 'revision_requested', `Revision requested: ${instructions}`, 'guild'),
      ],
    });
    this.emit(makeEvent('revision_requested', report.agentId, original.id, { instructions }));
    const revisionId = this.createTask({
      brief: `${original.brief}\n\nRevision instructions: ${instructions}`,
      goals: original.goals,
      nonGoals: original.nonGoals,
      context: original.context,
      definitionOfDone: original.definitionOfDone,
      assigneeId: report.agentId,
      type: original.type,
    });
    this.updateTask(revisionId, { revisionOfTaskId: original.id });
    this.emit(makeEvent('revision_requested', report.agentId, revisionId, { revisionOfTaskId: original.id }));
  }

  simulateBlocked(taskId?: string) {
    const task = taskId ? this.findTask(taskId) : this.snapshot.tasks[0];
    const agentId = task?.assigneeId ?? this.snapshot.activeProfileId;
    if (task) {
      this.clearTimers(task.id);
      this.updateTask(task.id, {
        state: 'blocked',
        reviewStatus: 'none',
        timeline: [
          ...task.timeline,
          this.timeline(task.id, agentId, 'blocked', 'Mock task blocked: waiting for user clarification or unavailable tool access.', 'bridge'),
        ],
      });
    }
    this.snapshot.agents = this.snapshot.agents.map((agent) =>
      agent.id === agentId
        ? { ...agent, status: 'blocked', availability: 'busy', currentTaskId: task?.id ?? agent.currentTaskId }
        : agent,
    );
    this.snapshot.systemStatus = {
      ...this.snapshot.systemStatus,
      logsSummary: 'Mock task is blocked and waiting for review input or tool access.',
      warnings: ['The visible blocked state is generated by the mock bridge.'],
    };
    this.emit(makeEvent('task_blocked', agentId, task?.id, { message: 'Mock task blocked: waiting for user clarification or unavailable tool access.' }));
  }

  simulateError(taskId?: string) {
    const task = taskId ? this.findTask(taskId) : this.snapshot.tasks[0];
    const agentId = task?.assigneeId ?? this.snapshot.activeProfileId;
    if (task) {
      this.clearTimers(task.id);
      this.updateTask(task.id, {
        state: 'error',
        reviewStatus: 'none',
        error: 'Mock gateway error: provider response timed out.',
        timeline: [
          ...task.timeline,
          this.timeline(task.id, agentId, 'error', 'Mock gateway error: provider response timed out.', 'bridge'),
        ],
      });
    }
    this.snapshot.agents = this.snapshot.agents.map((agent) =>
      agent.id === agentId
        ? { ...agent, status: 'error', availability: 'available', currentTaskId: task?.id ?? agent.currentTaskId }
        : agent,
    );
    this.snapshot.systemStatus = {
      ...this.snapshot.systemStatus,
      gatewayStatus: 'error',
      providerHealth: 'degraded',
      logsSummary: 'Mock gateway timeout emitted for error-state validation.',
      warnings: ['The visible error is generated by the mock bridge.'],
    };
    this.emit(makeEvent('gateway_error', agentId, task?.id, { message: 'Mock gateway error: provider response timed out.' }));
  }

  setPetPosition(position: PetPosition) {
    this.snapshot.petPosition = position;
    this.emit(makeEvent('active_profile_changed', this.snapshot.activeProfileId, undefined, { petPosition: position }));
  }

  async submitTask(input: CreateTaskInput) {
    return this.createTask(input);
  }

  private scheduleLifecycle(taskId: string) {
    this.clearTimers(taskId);
    const timers = [
      setTimeout(() => this.advanceTask(taskId, 'running', 25, 'Started mock execution and outlined the deliverable.'), 900),
      setTimeout(() => this.advanceTask(taskId, 'running', 58, 'Drafted the core answer and checked it against the definition of done.'), 2100),
      setTimeout(() => this.advanceTask(taskId, 'running', 82, 'Prepared artifacts and separated facts from assumptions.'), 3300),
      setTimeout(() => this.completeTask(taskId), 4500),
    ];
    this.timers.set(taskId, timers);
  }

  private advanceTask(taskId: string, state: TaskState, progress: number, message: string) {
    const task = this.findTask(taskId);
    this.updateTask(taskId, {
      state,
      progress,
      timeline: [...task.timeline, this.timeline(taskId, task.assigneeId, progress === 25 ? 'started' : 'progress', message, 'bridge')],
    });
    this.snapshot.agents = this.snapshot.agents.map((agent) =>
      agent.id === task.assigneeId ? { ...agent, status: 'running', availability: 'busy', currentTaskId: taskId } : agent,
    );
    this.emit(makeEvent('task_progress', task.assigneeId, taskId, { progress }));
  }

  private completeTask(taskId: string) {
    const task = this.findTask(taskId);
    const artifacts = this.artifactsForTask(task);
    const report = this.reportForTask(task, artifacts);
    this.updateTask(taskId, {
      state: 'needs_review',
      progress: 100,
      artifacts,
      reviewStatus: 'required',
      timeline: [
        ...task.timeline,
        this.timeline(taskId, task.assigneeId, 'artifact', `Produced ${artifacts.length} review artifacts.`, 'bridge'),
        this.timeline(taskId, task.assigneeId, 'completed', 'Mock execution completed.', 'bridge'),
        this.timeline(taskId, task.assigneeId, 'review_required', 'Quest Report Card is ready for review.', 'guild'),
      ],
    });
    this.snapshot.reports = [report, ...this.snapshot.reports.filter((item) => item.taskId !== taskId)];
    this.snapshot.agents = this.snapshot.agents.map((agent) =>
      agent.id === task.assigneeId
        ? { ...agent, status: 'needs_review', availability: 'available', currentTaskId: undefined, lastReportId: report.id }
        : agent,
    );
    this.emit(makeEvent('task_completed', task.assigneeId, taskId));
    this.emit(makeEvent('review_required', task.assigneeId, taskId, { reportId: report.id }));
  }

  private artifactsForTask(task: Task): Artifact[] {
    return [
      {
        id: id('artifact'),
        taskId: task.id,
        kind: 'summary',
        title: 'Summary Scroll',
        description: `A concise returned-work summary for "${task.title}".`,
      },
      {
        id: id('artifact'),
        taskId: task.id,
        kind: 'handoff',
        title: 'Handoff Card',
        description: 'Continuation context, next prompt, and review-sensitive notes.',
      },
      {
        id: id('artifact'),
        taskId: task.id,
        kind: 'risk',
        title: 'Risk Warning',
        description: 'Mock output should be replaced by Hermes-derived evidence before production use.',
      },
    ];
  }

  private reportForTask(task: Task, artifacts: Artifact[]): ReportCard {
    return {
      id: id('report'),
      taskId: task.id,
      agentId: task.assigneeId,
      title: `Quest Completed: ${task.title}`,
      summary: `${this.agentName(task.assigneeId)} completed a mock pass on the quest brief and returned a reviewable deliverable.`,
      artifacts,
      facts: [
        'The task was directly assigned to the active profile.',
        'The timeline records creation, assignment, progress, artifact, completion, and review events.',
      ],
      assumptions: [
        'Hermes runtime execution is mocked locally.',
        'Generated artifacts are placeholders until the real bridge writes files.',
      ],
      knownGaps: ['Native transparent pet behavior still needs verification in a Tauri runtime.'],
      recommendedNextAction: 'Approve the report or request a focused revision with concrete instructions.',
      reviewItems: ['Decision: accept mock output for demo flow.', 'Open question: which Hermes artifact path should production reports link to?'],
      createdAt: now(),
    };
  }

  private timeline(
    taskId: string,
    agentId: string | undefined,
    type: TimelineEvent['type'],
    message: string,
    source: TimelineEvent['source'],
  ): TimelineEvent {
    return {
      id: id('timeline'),
      taskId,
      agentId,
      type,
      message,
      timestamp: now(),
      source,
    };
  }

  private setAgentBusy(agentId: string, taskId: string, status: Agent['status']) {
    this.snapshot.agents = this.snapshot.agents.map((agent) =>
      agent.id === agentId ? { ...agent, status, availability: 'busy', currentTaskId: taskId } : agent,
    );
  }

  private setAgentIdle(agentId: string) {
    this.snapshot.agents = this.snapshot.agents.map((agent) =>
      agent.id === agentId ? { ...agent, status: 'idle', availability: 'available', currentTaskId: undefined } : agent,
    );
  }

  private updateTask(taskId: string, patch: Partial<Task>) {
    this.snapshot.tasks = this.snapshot.tasks.map((task) =>
      task.id === taskId ? { ...task, ...patch, updatedAt: now() } : task,
    );
  }

  private findTask(taskId: string) {
    const task = this.snapshot.tasks.find((item) => item.id === taskId);
    if (!task) {
      throw new Error(`Unknown task ${taskId}`);
    }
    return task;
  }

  private agentName(agentId: string) {
    return this.snapshot.agents.find((agent) => agent.id === agentId)?.name ?? 'Unknown agent';
  }

  private hasAgent(agentId: string) {
    return this.snapshot.agents.some((agent) => agent.id === agentId);
  }

  private titleFromBrief(brief: string) {
    const firstLine = brief.trim().split('\n')[0] || 'Untitled quest';
    return firstLine.length > 56 ? `${firstLine.slice(0, 53)}...` : firstLine;
  }

  private isReviewActionable(task: Task) {
    return task.state === 'needs_review' && task.reviewStatus === 'required';
  }

  private reconcileTimersWithSnapshot() {
    this.timers.forEach((_timers, taskId) => {
      const task = this.snapshot.tasks.find((item) => item.id === taskId);
      if (!task || !['assigned', 'running'].includes(task.state)) {
        this.clearTimers(taskId);
      }
    });
  }

  private clearTimers(taskId: string) {
    this.timers.get(taskId)?.forEach((timer) => clearTimeout(timer));
    this.timers.delete(taskId);
  }

  private emit(event: BridgeEvent) {
    const snapshot = this.getSnapshot();
    this.writeStoredSnapshot(event, snapshot);
    this.listeners.forEach((listener) => listener(snapshot, event));
    this.channel?.postMessage({
      origin: this.instanceId,
      event,
      snapshot,
    } satisfies BridgeChannelMessage);
  }

  private receiveRemoteUpdate(message: BridgeChannelMessage) {
    if (message.origin === this.instanceId) return;
    this.snapshot = this.sanitizeSnapshot(message.snapshot);
    this.reconcileTimersWithSnapshot();
    const snapshot = this.getSnapshot();
    this.listeners.forEach((listener) => listener(snapshot, message.event));
  }

  private createChannel() {
    if (typeof BroadcastChannel === 'undefined') return undefined;

    const channel = new BroadcastChannel(bridgeChannelName);
    channel.onmessage = (message: MessageEvent<BridgeChannelMessage>) => {
      if (!message.data?.snapshot || !message.data?.event) return;
      this.receiveRemoteUpdate(message.data);
    };
    return channel;
  }

  private createStorageListener() {
    if (typeof window === 'undefined') return undefined;

    const listener = (event: StorageEvent) => {
      if (event.key !== bridgeStorageKey || !event.newValue) return;

      try {
        const message = JSON.parse(event.newValue) as BridgeChannelMessage;
        if (!message.snapshot || !message.event) return;
        this.receiveRemoteUpdate(message);
      } catch {
        // Ignore malformed external storage writes.
      }
    };

    window.addEventListener('storage', listener);
    return listener;
  }

  private readStoredSnapshot() {
    if (typeof localStorage === 'undefined') return undefined;

    try {
      const stored = localStorage.getItem(bridgeStorageKey);
      if (!stored) return undefined;

      const parsed = JSON.parse(stored) as unknown;
      const snapshot = parsed && typeof parsed === 'object' && 'snapshot' in parsed ? (parsed as BridgeChannelMessage).snapshot : parsed;
      return this.sanitizeSnapshot(snapshot);
    } catch {
      return undefined;
    }
  }

  private sanitizeSnapshot(rawSnapshot: unknown) {
    const seed = seedSnapshot();
    const snapshot =
      rawSnapshot && typeof rawSnapshot === 'object' && !Array.isArray(rawSnapshot) ? (rawSnapshot as Partial<BridgeSnapshot>) : seed;
    const snapshotAgents: Agent[] = Array.isArray(snapshot.agents) ? snapshot.agents : [];
    const snapshotTasks: Task[] = Array.isArray(snapshot.tasks) ? snapshot.tasks : [];
    const snapshotReports: ReportCard[] = Array.isArray(snapshot.reports) ? snapshot.reports : [];
    const snapshotSystemStatus =
      snapshot.systemStatus && typeof snapshot.systemStatus === 'object' ? snapshot.systemStatus : seed.systemStatus;
    const snapshotPetPosition = snapshot.petPosition;
    let petPosition: PetPosition = seed.petPosition;
    if (snapshotPetPosition && Number.isFinite(snapshotPetPosition.x) && Number.isFinite(snapshotPetPosition.y)) {
      petPosition = { x: snapshotPetPosition.x, y: snapshotPetPosition.y };
    }
    const seedAgentIds = new Set(agentsSeed.map((agent) => agent.id));
    const snapshotAgentsById = new Map(snapshotAgents.map((agent) => [agent.id, agent]));
    const agents = agentsSeed.map((seedAgent) => ({
      ...seedAgent,
      ...(snapshotAgentsById.get(seedAgent.id) ?? {}),
      id: seedAgent.id,
      role: seedAgent.role,
      skills: snapshotAgentsById.get(seedAgent.id)?.skills ?? seedAgent.skills.map((skill) => ({ ...skill })),
    }));
    const validAgentIds = new Set(agents.map((agent) => agent.id));
    const activeProfileCandidate = typeof snapshot.activeProfileId === 'string' ? snapshot.activeProfileId : seed.activeProfileId;
    const activeProfileId = validAgentIds.has(activeProfileCandidate) ? activeProfileCandidate : seed.activeProfileId;

    return {
      ...snapshot,
      activeProfileId,
      agents: agents.map((agent) => ({
        ...agent,
        activeInPet: agent.id === activeProfileId,
      })),
      tasks: snapshotTasks.map((task) => ({
        ...task,
        assigneeId: seedAgentIds.has(task.assigneeId) ? task.assigneeId : activeProfileId,
      })),
      reports: snapshotReports.filter((report) => seedAgentIds.has(report.agentId)),
      systemStatus: {
        ...seed.systemStatus,
        ...snapshotSystemStatus,
        warnings: Array.isArray(snapshotSystemStatus.warnings) ? snapshotSystemStatus.warnings : seed.systemStatus.warnings,
      },
      petPosition,
    };
  }

  private writeStoredSnapshot(event: BridgeEvent, snapshot: BridgeSnapshot) {
    if (!this.persistAcrossWebviews || typeof localStorage === 'undefined') return;

    try {
      localStorage.setItem(
        bridgeStorageKey,
        JSON.stringify({
          origin: this.instanceId,
          event,
          snapshot,
        } satisfies BridgeChannelMessage),
      );
    } catch {
      // Storage is a convenience for mock cross-window state; ignore quota/privacy failures.
    }
  }
}

export const createMockHermesBridge = (options?: MockHermesBridgeOptions): HermesBridgeApi => new MockHermesBridge(options);

export const mockHermesBridge: HermesBridgeApi = createMockHermesBridge({ persist: true });
