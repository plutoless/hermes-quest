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
  TimelineEvent,
} from '../types';
import type {
  BridgeConfig,
  HermesApiClient,
  HermesApiRunEvent,
  HermesBridgeApi,
  HermesHealth,
  HermesProfileMetadata,
  Listener,
} from './types';

const now = () => new Date().toISOString();

let nextId = 1;
const runtimeId = Math.random().toString(36).slice(2, 8);
const id = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${runtimeId}-${nextId++}`;

const makeEvent = (type: BridgeEventType, agentId?: string, taskId?: string, payload?: Record<string, unknown>): BridgeEvent => ({
  id: id('event'),
  type,
  agentId,
  taskId,
  payload,
  timestamp: now(),
});

const realAgentsSeed: Agent[] = [
  {
    id: 'researcher',
    name: 'Hermes Researcher',
    role: 'Researcher',
    status: 'idle',
    availability: 'available',
    activeInPet: false,
    traits: ['Research', 'Context Discipline', 'Judgement'],
    bestFor: 'competitive scans, synthesis, source-heavy briefs',
    avoid: 'fast code edits without context',
    health: 'Mapped to Hermes profile',
    equipment: ['Hermes API server', 'Guild role routing', 'Workspace context'],
    skills: [],
  },
  {
    id: 'builder',
    name: 'Hermes Builder',
    role: 'Builder',
    status: 'idle',
    availability: 'available',
    activeInPet: true,
    traits: ['Execution', 'Planning', 'Reliability'],
    bestFor: 'implementation plans, demos, runnable product slices',
    avoid: 'unbounded strategy memos',
    health: 'Mapped to Hermes profile',
    equipment: ['Hermes API server', 'Guild role routing', 'Workspace tools'],
    skills: [],
  },
  {
    id: 'reviewer',
    name: 'Hermes Reviewer',
    role: 'Reviewer',
    status: 'idle',
    availability: 'available',
    activeInPet: false,
    traits: ['Judgement', 'Communication', 'Reliability'],
    bestFor: 'risk checks, acceptance review, revision prompts',
    avoid: 'first-pass speculative ideation',
    health: 'Mapped to Hermes profile',
    equipment: ['Hermes API server', 'Guild role routing', 'Review checklist'],
    skills: [],
  },
];

const seedSnapshot = (config: BridgeConfig): BridgeSnapshot => ({
  agents: realAgentsSeed.map((agent) => ({
    ...agent,
    health: `Hermes API role: ${agent.role}`,
    activeInPet: agent.id === 'builder',
  })),
  activeProfileId: 'builder',
  tasks: [],
  reports: [],
  systemStatus: {
    gatewayStatus: 'connected',
    providerHealth: 'healthy',
    bridgeMode: config.bridgeMode,
    activeImplementation: 'real',
    hermesAvailable: 'unchecked',
    hermesApiBaseUrl: config.hermesApiBaseUrl,
    logsSummary: `Bridge mode: real. Hermes API base URL: ${config.hermesApiBaseUrl}.`,
    warnings: ['Real bridge uses Hermes API /v1/runs. Profile mapping is not sent because the API does not expose a profile parameter.'],
  },
  petPosition: { x: 32, y: 32 },
});

export class RealHermesBridge implements HermesBridgeApi {
  private snapshot: BridgeSnapshot;
  private listeners = new Set<Listener>();

  constructor(
    private readonly config: BridgeConfig,
    private readonly apiClient: HermesApiClient,
  ) {
    this.snapshot = seedSnapshot(config);
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

  async getHealth(): Promise<HermesHealth> {
    return this.apiClient.checkHealth();
  }

  applyHermesProfile(profile: HermesProfileMetadata | undefined) {
    const realProfile = profile ?? { id: 'profile-unavailable', name: 'Profile unavailable' };
    const currentAgent = this.snapshot.agents.find((agent) => agent.id === this.snapshot.activeProfileId);
    const activeAgent: Agent = {
      id: realProfile.id,
      name: realProfile.name,
      role: 'Builder',
      status: currentAgent?.status ?? 'idle',
      availability: currentAgent?.availability ?? 'available',
      activeInPet: true,
      currentTaskId: currentAgent?.currentTaskId,
      traits: ['Execution', 'Planning', 'Reliability'],
      bestFor: 'real Hermes API execution',
      avoid: 'unsupported profile routing claims',
      health: profile ? 'Mapped from Hermes API metadata' : 'Hermes API profile metadata unavailable',
      equipment: ['Hermes API server', 'Workspace tools'],
      skills: [],
    };

    const previousActiveProfileId = this.snapshot.activeProfileId;
    this.snapshot.activeProfileId = activeAgent.id;
    this.snapshot.agents = [activeAgent];
    this.snapshot.tasks = this.snapshot.tasks.map((task) =>
      task.assigneeId === previousActiveProfileId ? { ...task, assigneeId: activeAgent.id } : task,
    );
    this.snapshot.reports = this.snapshot.reports.map((report) =>
      report.agentId === previousActiveProfileId ? { ...report, agentId: activeAgent.id } : report,
    );
    this.snapshot.systemStatus = {
      ...this.snapshot.systemStatus,
      logsSummary: `${this.snapshot.systemStatus.logsSummary} Active Hermes profile: ${activeAgent.name}.`,
      warnings: profile
        ? this.snapshot.systemStatus.warnings.filter((warning) => warning !== 'Hermes API /health did not provide active profile metadata.')
        : [
            'Hermes API /health did not provide active profile metadata.',
            ...this.snapshot.systemStatus.warnings.filter((warning) => warning !== 'Hermes API /health did not provide active profile metadata.'),
          ],
    };
  }

  setRuntimeStatus(patch: Partial<BridgeSnapshot['systemStatus']>) {
    this.snapshot.systemStatus = {
      ...this.snapshot.systemStatus,
      ...patch,
    };
  }

  markUnavailable(message: string) {
    this.snapshot.agents = this.snapshot.agents.map((agent) =>
      agent.id === this.snapshot.activeProfileId ? { ...agent, status: 'error', availability: 'offline' } : agent,
    );
    this.snapshot.systemStatus = {
      ...this.snapshot.systemStatus,
      gatewayStatus: 'error',
      providerHealth: 'degraded',
      activeImplementation: 'real',
      hermesAvailable: 'unavailable',
      fallbackReason: undefined,
      logsSummary: `Bridge mode: real. Active implementation: real. Hermes unavailable: ${message}`,
      warnings: [`Real mode did not fall back to mock: ${message}`],
    };
  }

  async listAgents() {
    return this.getSnapshot().agents;
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

  async setActiveAgent(agentId: string) {
    this.setActiveProfile(agentId);
  }

  async getActiveAgent() {
    return this.snapshot.agents.find((agent) => agent.id === this.snapshot.activeProfileId) ?? this.snapshot.agents[0];
  }

  createTask(input: CreateTaskInput) {
    const taskId = this.createLocalTask(input);
    void this.runHermesTask(taskId);
    return taskId;
  }

  async submitTask(input: CreateTaskInput) {
    return this.createTask(input);
  }

  async getTask(taskId: string) {
    return this.snapshot.tasks.find((task) => task.id === taskId);
  }

  approveReport(reportId: string) {
    const report = this.snapshot.reports.find((item) => item.id === reportId);
    if (!report) return;
    const task = this.findTask(report.taskId);
    if (task.state !== 'needs_review' || task.reviewStatus !== 'required') return;
    this.updateTask(task.id, {
      state: 'approved',
      reviewStatus: 'approved',
      timeline: [...task.timeline, this.timeline(task.id, report.agentId, 'approved', 'Quest Report Card approved by the user.', 'guild')],
    });
    this.setAgentIdle(report.agentId);
    this.emit(makeEvent('review_approved', report.agentId, task.id));
    this.emit(makeEvent('agent_idle', report.agentId));
  }

  async approveTask(reportId: string) {
    this.approveReport(reportId);
  }

  requestRevision(reportId: string, instructions: string) {
    const report = this.snapshot.reports.find((item) => item.id === reportId);
    if (!report) return;
    const original = this.findTask(report.taskId);
    if (original.state !== 'needs_review' || original.reviewStatus !== 'required') return;
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

  async reviseTask(reportId: string, instructions: string) {
    const before = new Set(this.snapshot.tasks.map((task) => task.id));
    this.requestRevision(reportId, instructions);
    return this.snapshot.tasks.find((task) => !before.has(task.id))?.id;
  }

  simulateBlocked(taskId?: string) {
    const task = taskId ? this.findTask(taskId) : this.snapshot.tasks[0];
    const agentId = task?.assigneeId ?? this.snapshot.activeProfileId;
    if (task) {
      this.updateTask(task.id, {
        state: 'blocked',
        reviewStatus: 'none',
        timeline: [
          ...task.timeline,
          this.timeline(task.id, agentId, 'blocked', 'Real Hermes task marked blocked by the Guild test control.', 'guild'),
        ],
      });
    }
    this.snapshot.agents = this.snapshot.agents.map((agent) =>
      agent.id === agentId ? { ...agent, status: 'blocked', availability: 'busy', currentTaskId: task?.id ?? agent.currentTaskId } : agent,
    );
    this.snapshot.systemStatus = {
      ...this.snapshot.systemStatus,
      logsSummary: 'Real bridge task is blocked by Guild control.',
      warnings: ['Blocked state is Guild-maintained; Hermes API run events do not expose a stable blocked signal yet.'],
    };
    this.emit(makeEvent('task_blocked', agentId, task?.id));
  }

  simulateError(taskId?: string) {
    const task = taskId ? this.findTask(taskId) : this.snapshot.tasks[0];
    this.failTask(task, 'Real Hermes error simulated by Guild control.');
  }

  setPetPosition(position: PetPosition) {
    this.snapshot.petPosition = position;
    this.emit(makeEvent('active_profile_changed', this.snapshot.activeProfileId, undefined, { petPosition: position }));
  }

  private createLocalTask(input: CreateTaskInput) {
    if (!this.hasAgent(input.assigneeId)) {
      throw new Error(`Unknown assignee ${input.assigneeId}`);
    }

    const createdAt = now();
    const taskId = id('quest');
    const task: Task = {
      id: taskId,
      title: this.titleFromBrief(input.brief),
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
      timeline: [
        this.timeline(taskId, input.assigneeId, 'created', `Quest created from ${input.type === 'pet' ? 'Pet Mode' : 'Quest Board'}.`, 'guild'),
        this.timeline(taskId, input.assigneeId, 'assigned', `Assigned to ${this.agentName(input.assigneeId)} through the Hermes API bridge.`, 'guild'),
      ],
      reviewStatus: 'none',
      createdAt,
      updatedAt: createdAt,
    };
    this.snapshot.tasks = [task, ...this.snapshot.tasks];
    this.setAgentBusy(input.assigneeId, taskId, 'thinking');
    this.emit(makeEvent('task_started', input.assigneeId, taskId, { state: 'assigned' }));
    return taskId;
  }

  private async runHermesTask(taskId: string) {
    const task = this.findTask(taskId);
    this.updateTask(task.id, {
      state: 'running',
      progress: 25,
      timeline: task.timeline,
    });
    this.setAgentBusy(task.assigneeId, task.id, 'running');
    this.emit(makeEvent('task_progress', task.assigneeId, task.id, { progress: 25 }));

    const result = await this.apiClient.runTask({
      input: this.promptForTask(task),
      instructions: 'Return a concise final answer suitable for a Quest Report Card.',
      sessionId: task.id,
    });

    if (!result.ok) {
      this.failTask(this.findTask(task.id), result.error || result.output || 'Hermes API run failed.');
      return;
    }

    this.recordRunEvents(task.id, result.events);
    this.completeTask(this.findTask(task.id), result.output.trim() || '(Hermes API returned no output.)');
  }

  private completeTask(task: Task, finalOutput: string) {
    const artifacts = this.artifactsForTask(task, finalOutput);
    const report = this.reportForTask(task, artifacts, finalOutput);
    this.updateTask(task.id, {
      state: 'needs_review',
      progress: 100,
      artifacts,
      reviewStatus: 'required',
      timeline: [
        ...task.timeline,
        this.timeline(task.id, task.assigneeId, 'completed', finalOutput, 'hermes'),
        this.timeline(task.id, task.assigneeId, 'review_required', 'Quest Report Card is ready for review.', 'guild'),
      ],
    });
    this.snapshot.reports = [report, ...this.snapshot.reports.filter((item) => item.taskId !== task.id)];
    this.snapshot.agents = this.snapshot.agents.map((agent) =>
      agent.id === task.assigneeId
        ? { ...agent, status: 'needs_review', availability: 'available', currentTaskId: undefined, lastReportId: report.id }
        : agent,
    );
    this.snapshot.systemStatus = {
      gatewayStatus: 'connected',
      providerHealth: 'healthy',
      bridgeMode: this.snapshot.systemStatus.bridgeMode,
      activeImplementation: 'real',
      hermesAvailable: this.snapshot.systemStatus.hermesAvailable,
      hermesApiBaseUrl: this.config.hermesApiBaseUrl,
      logsSummary: `Bridge mode: real. Hermes API output returned for ${this.agentName(task.assigneeId)}.`,
      warnings: this.snapshot.systemStatus.warnings,
    };
    this.emit(makeEvent('task_completed', task.assigneeId, task.id));
    this.emit(makeEvent('review_required', task.assigneeId, task.id, { reportId: report.id }));
  }

  private failTask(task: Task | undefined, message: string) {
    const agentId = task?.assigneeId ?? this.snapshot.activeProfileId;
    if (task) {
      this.updateTask(task.id, {
        state: 'error',
        reviewStatus: 'none',
        error: message,
        timeline: [...task.timeline, this.timeline(task.id, agentId, 'error', message, 'hermes')],
      });
    }
    this.snapshot.agents = this.snapshot.agents.map((agent) =>
      agent.id === agentId ? { ...agent, status: 'error', availability: 'available', currentTaskId: task?.id ?? agent.currentTaskId } : agent,
    );
    this.snapshot.systemStatus = {
      gatewayStatus: 'error',
      providerHealth: 'degraded',
      bridgeMode: this.snapshot.systemStatus.bridgeMode,
      activeImplementation: 'real',
      hermesAvailable: this.snapshot.systemStatus.hermesAvailable,
      hermesApiBaseUrl: this.config.hermesApiBaseUrl,
      logsSummary: `Bridge mode: real. Hermes failure: ${message}`,
      warnings: ['Real Hermes failure surfaced from the Hermes API response or event stream.'],
    };
    this.emit(makeEvent('gateway_error', agentId, task?.id, { message }));
  }

  private recordRunEvents(taskId: string, events: HermesApiRunEvent[]) {
    const task = this.findTask(taskId);
    const timelineEvents = events
      .map((event) => this.timelineForRunEvent(task, event))
      .filter((event): event is TimelineEvent => Boolean(event));
    if (timelineEvents.length === 0) return;
    this.updateTask(task.id, {
      timeline: [...task.timeline, ...timelineEvents],
      progress: Math.max(task.progress, 75),
    });
  }

  private timelineForRunEvent(task: Task, event: HermesApiRunEvent): TimelineEvent | undefined {
    const messageText = this.textFromRunEvent(event);
    if (!messageText) return undefined;
    return this.timeline(task.id, task.assigneeId, 'progress', messageText, 'hermes');
  }

  private textFromRunEvent(event: HermesApiRunEvent) {
    const text =
      typeof event.text === 'string' ? event.text :
        typeof event.preview === 'string' ? event.preview :
          typeof event.delta === 'string' ? event.delta :
            undefined;
    return text?.trim();
  }

  private artifactsForTask(task: Task, finalOutput: string): Artifact[] {
    return [
      {
        id: id('artifact'),
        taskId: task.id,
        kind: 'summary',
        title: 'Hermes Final Output',
        description: finalOutput.length > 180 ? `${finalOutput.slice(0, 177)}...` : finalOutput,
      },
    ];
  }

  private reportForTask(task: Task, artifacts: Artifact[], finalOutput: string): ReportCard {
    return {
      id: id('report'),
      taskId: task.id,
      agentId: task.assigneeId,
      title: `Quest Completed: ${task.title}`,
      summary: finalOutput,
      artifacts,
      facts: [
        'Hermes API returned final output for this Guild quest.',
        'Guild captured the API run result and converted it into this Quest Report Card.',
      ],
      assumptions: ['Hermes API run.completed output is treated as final output for this bridge.'],
      knownGaps: ['Guild role-to-Hermes profile mapping is not sent because /v1/runs does not expose a profile field.'],
      recommendedNextAction: 'Approve the report or request a focused revision with concrete instructions.',
      reviewItems: ['Check that Hermes output satisfies the brief.', 'Request revision if the output needs another Hermes pass.'],
      createdAt: now(),
    };
  }

  private promptForTask(task: Task) {
    return [
      'Hermes Guild quest brief:',
      task.brief,
      task.goals ? `Goals:\n${task.goals}` : undefined,
      task.nonGoals ? `Non-goals:\n${task.nonGoals}` : undefined,
      task.context ? `Context:\n${task.context}` : undefined,
      task.definitionOfDone ? `Definition of done:\n${task.definitionOfDone}` : undefined,
    ]
      .filter(Boolean)
      .join('\n\n');
  }

  private timeline(taskId: string, agentId: string | undefined, type: TimelineEvent['type'], message: string, source: TimelineEvent['source']) {
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

  private emit(event: BridgeEvent) {
    const snapshot = this.getSnapshot();
    this.listeners.forEach((listener) => listener(snapshot, event));
  }
}
