import type {
  Agent,
  Artifact,
  BridgeEvent,
  BridgeEventType,
  BridgeSnapshot,
  CreateTaskInput,
  PetPosition,
  ReportCard,
  Skill,
  Task,
  TimelineEvent,
  ProfileDetails,
} from '../types';
import type {
  BridgeConfig,
  HermesApiClient,
  HermesApiRunEvent,
  HermesBridgeApi,
  HermesHealth,
  HermesProfileListResult,
  HermesProfileMetadata,
  HermesProfileRunClient,
  HermesProfileDetailsClient,
  HermesSidecarClient,
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
    equipment: ['Hermes API server', 'Companion routing', 'Workspace context'],
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
    equipment: ['Hermes API server', 'Companion routing', 'Workspace tools'],
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
    equipment: ['Hermes API server', 'Companion routing', 'Review checklist'],
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
      hermesConnectionTarget: config.hermesConnectionTarget,
      hermesConnectionStatus: config.hermesConnectionTarget === 'local' ? 'local' : 'unavailable',
      hermesApiBaseUrl: config.hermesApiBaseUrl,
      localHermesApiBaseUrl: config.localHermesApiBaseUrl,
      managedHermesApiBaseUrl: config.managedHermesApiBaseUrl,
      hermesDashboardBaseUrl: config.hermesDashboardBaseUrl,
      hermesSidecarBaseUrl: config.hermesSidecarBaseUrl,
      dashboardAvailable: 'unchecked',
      sidecarAvailable: 'unchecked',
      dataSources: {
        gateway: 'gateway-rest',
        gatewayJobs: 'unavailable',
        profiles: 'gateway-rest',
        tasks: 'gateway-rest',
        detailedHealth: 'unavailable',
        models: 'unavailable',
        capabilities: 'unavailable',
        review: 'companion-owned',
        sessions: 'unavailable',
        logs: 'unavailable',
        analytics: 'unavailable',
        skills: 'unavailable',
        toolsets: 'unavailable',
        config: 'unavailable',
        env: 'unavailable',
        cronJobs: 'unavailable',
        sidecar: 'unavailable',
        localStateSummary: 'unavailable',
      },
      logsSummary: `Bridge mode: real. Hermes API base URL: ${config.hermesApiBaseUrl}. Dashboard compatibility base URL: ${config.hermesDashboardBaseUrl}. Sidecar base URL: ${config.hermesSidecarBaseUrl}.`,
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
    private readonly sidecarClient?: HermesSidecarClient,
    private readonly profileRunClient?: HermesProfileRunClient,
    private readonly profileDetailsClient?: HermesProfileDetailsClient,
  ) {
    this.snapshot = seedSnapshot(config);
  }

  private readonly profileDetailsCache = new Map<string, ProfileDetails>();

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
    const source = profile?.source ?? (profile ? 'public-rest' : 'unavailable');
    const realProfile = profile ?? {
      id: 'profile-unavailable',
      name: 'Profile unavailable',
      source: 'unavailable' as const,
      unavailableReason: 'Hermes API /health did not provide active profile metadata.',
    };
    const currentAgent = this.snapshot.agents.find((agent) => agent.id === this.snapshot.activeProfileId);
    const activeAgent = this.agentFromProfile(realProfile, 0, true, {
      status: currentAgent?.status ?? 'idle',
      availability: currentAgent?.availability ?? 'available',
      currentTaskId: currentAgent?.currentTaskId,
    });

    this.snapshot.activeProfileId = activeAgent.id;
    this.snapshot.agents = [activeAgent];
    this.snapshot.systemStatus = {
      ...this.snapshot.systemStatus,
      dataSources: {
        ...this.snapshot.systemStatus.dataSources,
        profiles: source,
        activeProfile: source,
        profileRouting: 'unavailable',
      },
      operationalData: {
        ...this.snapshot.systemStatus.operationalData,
        profileSummary: profile ? `1 profile from ${source}` : 'Profile metadata unavailable',
        activeProfileSummary: `${activeAgent.name} from ${source}`,
        profileRoutingSummary: this.profileRoutingSummary('unsupported'),
      },
      logsSummary: `${this.snapshot.systemStatus.logsSummary} Active Hermes profile: ${activeAgent.name}.`,
      warnings: profile
        ? this.snapshot.systemStatus.warnings.filter((warning) => warning !== 'Hermes API /health did not provide active profile metadata.')
        : [
            'Hermes API /health did not provide active profile metadata.',
            ...this.snapshot.systemStatus.warnings.filter((warning) => warning !== 'Hermes API /health did not provide active profile metadata.'),
          ],
    };
  }

  applyHermesProfiles(result: HermesProfileListResult) {
    const activeProfileId = result.activeProfileId && result.profiles.some((profile) => profile.id === result.activeProfileId)
      ? result.activeProfileId
      : result.profiles[0]?.id;
    if (!activeProfileId) {
      this.applyHermesProfile(undefined);
      return;
    }

    const currentById = new Map(this.snapshot.agents.map((agent) => [agent.id, agent]));
    this.snapshot.activeProfileId = activeProfileId;
    const activeProfileSource = result.activeProfileSource ?? result.source;
    this.snapshot.agents = result.profiles.map((profile, index) => {
      const currentAgent = currentById.get(profile.id);
      return this.agentFromProfile(
        {
          ...profile,
          source: profile.source ?? result.source,
          executionRouting: profile.executionRouting ?? result.executionRouting ?? 'unsupported',
          unavailableReason: profile.unavailableReason ?? result.executionRoutingReason,
        },
        index,
        profile.id === activeProfileId,
        currentAgent,
      );
    });
    this.snapshot.systemStatus = {
      ...this.snapshot.systemStatus,
      dataSources: {
        ...this.snapshot.systemStatus.dataSources,
        profiles: result.source,
        activeProfile: activeProfileSource,
        profileRouting: result.executionRouting === 'supported' ? result.executionRoutingSource ?? result.source : 'unavailable',
      },
      operationalData: {
        ...this.snapshot.systemStatus.operationalData,
        profileSummary: `${result.profiles.length} profiles from ${result.source}`,
        activeProfileSummary: `${this.agentName(activeProfileId)} from ${activeProfileSource}`,
        profileRoutingSummary: this.profileRoutingSummary(
          result.executionRouting ?? 'unsupported',
          result.executionRoutingReason,
          result.executionRoutingSource ?? result.source,
          result.executionRoutingMode,
        ),
      },
      warnings: [
        ...(result.executionRouting === 'supported' ? [] : [this.profileRoutingWarning(result.executionRoutingReason)]),
        ...this.snapshot.systemStatus.warnings.filter((warning) => !warning.startsWith('Profile routing ')),
      ],
    };
  }

  setRuntimeStatus(patch: Partial<BridgeSnapshot['systemStatus']>) {
    this.snapshot.systemStatus = {
      ...this.snapshot.systemStatus,
      ...patch,
    };
  }

  applyDashboardInventory(input: { skills?: unknown; toolsets?: unknown }) {
    const skills = skillsFromDashboard(input.skills);
    const toolsets = toolsetsFromDashboard(input.toolsets);
    this.snapshot.agents = this.snapshot.agents.map((agent) =>
      agent.id === this.snapshot.activeProfileId
        ? {
            ...agent,
            skills,
            equipment: [...agent.equipment.filter((item) => !item.startsWith('Toolset: ')), ...toolsets],
          }
        : agent,
    );
  }

  applyGatewayMetadata(input: { detailedHealth?: unknown; models?: unknown; capabilities?: unknown }) {
    const models = modelsFromGateway(input.models);
    const capabilities = capabilitiesFromGateway(input.capabilities);
    const extraEquipment = [
      ...models.map((model) => `Model: ${model}`),
      ...capabilities.map((capability) => `Capability: ${capability}`),
    ];
    this.snapshot.agents = this.snapshot.agents.map((agent) =>
      agent.id === this.snapshot.activeProfileId
        ? {
            ...agent,
            equipment: [
              ...agent.equipment.filter((item) => !item.startsWith('Model: ') && !item.startsWith('Capability: ')),
              ...extraEquipment,
            ],
          }
        : agent,
    );
    this.snapshot.systemStatus = {
      ...this.snapshot.systemStatus,
      providerHealth: input.detailedHealth ? 'healthy' : this.snapshot.systemStatus.providerHealth,
      dataSources: {
        ...this.snapshot.systemStatus.dataSources,
        detailedHealth: input.detailedHealth ? 'gateway-rest' : 'unavailable',
        models: input.models ? 'gateway-rest' : 'unavailable',
        capabilities: input.capabilities ? 'gateway-rest' : 'unavailable',
      },
    };
  }

  applyOperationalData(input: {
    sessions?: unknown;
    session?: unknown;
    sessionMessages?: unknown;
    sessionMessagesSessionId?: string;
    logs?: unknown;
    analytics?: unknown;
    cronJobs?: unknown;
    config?: unknown;
    configDefaults?: unknown;
    configSchema?: unknown;
    env?: unknown;
    gatewayJobs?: unknown;
  }) {
    const operationalData = {
      ...this.snapshot.systemStatus.operationalData,
      sessionsSummary: input.sessions
        ? countSummary(collectionFromPayload(input.sessions, ['sessions', 'items', 'data']), 'dashboard compatibility session')
        : this.snapshot.systemStatus.operationalData?.sessionsSummary,
      sessionMessagesSummary: input.sessionMessages
        ? `${collectionFromPayload(input.sessionMessages, ['messages', 'items', 'data']).length} messages in session ${input.sessionMessagesSessionId ?? 'unknown'}`
        : this.snapshot.systemStatus.operationalData?.sessionMessagesSummary,
      logsSummary: input.logs ? logsSummary(input.logs) : this.snapshot.systemStatus.operationalData?.logsSummary,
      analyticsSummary: input.analytics ? analyticsSummary(input.analytics) : this.snapshot.systemStatus.operationalData?.analyticsSummary,
      cronSummary: input.cronJobs
        ? countSummary(collectionFromPayload(input.cronJobs, ['jobs', 'cron_jobs', 'items', 'data']), 'cron job')
        : this.snapshot.systemStatus.operationalData?.cronSummary,
      configSummary: configSummary(input.config, input.configDefaults, input.configSchema) ?? this.snapshot.systemStatus.operationalData?.configSummary,
      envSummary: input.env ? envSummary(input.env) : this.snapshot.systemStatus.operationalData?.envSummary,
      gatewayJobsSummary: input.gatewayJobs
        ? countSummary(collectionFromPayload(input.gatewayJobs, ['jobs', 'items', 'data']), 'gateway job')
        : this.snapshot.systemStatus.operationalData?.gatewayJobsSummary,
    };
    this.snapshot.systemStatus = {
      ...this.snapshot.systemStatus,
      operationalData,
      dataSources: {
        ...this.snapshot.systemStatus.dataSources,
        sessions: input.sessions ? 'dashboard-compatibility' : this.snapshot.systemStatus.dataSources?.sessions ?? 'unavailable',
        sessionMessages: input.session || input.sessionMessages
          ? 'dashboard-compatibility'
          : this.snapshot.systemStatus.dataSources?.sessionMessages ?? 'unavailable',
        logs: input.logs ? 'dashboard-compatibility' : this.snapshot.systemStatus.dataSources?.logs ?? 'unavailable',
        analytics: input.analytics ? 'dashboard-compatibility' : this.snapshot.systemStatus.dataSources?.analytics ?? 'unavailable',
        cronJobs: input.cronJobs ? 'dashboard-compatibility' : this.snapshot.systemStatus.dataSources?.cronJobs ?? 'unavailable',
        config: input.config || input.configDefaults || input.configSchema
          ? 'dashboard-compatibility'
          : this.snapshot.systemStatus.dataSources?.config ?? 'unavailable',
        env: input.env ? 'dashboard-compatibility' : this.snapshot.systemStatus.dataSources?.env ?? 'unavailable',
        gatewayJobs: input.gatewayJobs ? 'gateway-rest' : this.snapshot.systemStatus.dataSources?.gatewayJobs ?? 'unavailable',
      },
    };
  }

  applySidecarCompatibility(input: { capabilities?: unknown; localStateSummary?: unknown }) {
    const sidecarSummary = sidecarSummaryFromPayload(input.localStateSummary, input.capabilities);
    this.snapshot.systemStatus = {
      ...this.snapshot.systemStatus,
      operationalData: {
        ...this.snapshot.systemStatus.operationalData,
        sidecarSummary,
      },
      dataSources: {
        ...this.snapshot.systemStatus.dataSources,
        sidecar: input.capabilities || input.localStateSummary ? 'sidecar' : this.snapshot.systemStatus.dataSources?.sidecar ?? 'unavailable',
        localStateSummary: input.localStateSummary ? 'sidecar' : this.snapshot.systemStatus.dataSources?.localStateSummary ?? 'unavailable',
      },
    };
  }

  markDashboardCompatibilityProtected() {
    this.snapshot.systemStatus = {
      ...this.snapshot.systemStatus,
      dataSources: {
        ...this.snapshot.systemStatus.dataSources,
        sessions: 'unavailable',
        sessionMessages: 'unavailable',
        logs: 'unavailable',
        analytics: 'unavailable',
        skills: 'unavailable',
        toolsets: 'unavailable',
        config: 'unavailable',
        env: 'unavailable',
        cronJobs: 'unavailable',
      },
      warnings: [
        'Hermes dashboard protected REST skipped: session token unavailable.',
        ...this.snapshot.systemStatus.warnings.filter(
          (warning) => warning !== 'Hermes dashboard protected REST skipped: session token unavailable.',
        ),
      ],
    };
  }

  markUnavailable(message: string) {
    const unavailableAgent = this.agentFromProfile(
      {
        id: 'profile-unavailable',
        name: 'Profile unavailable',
        source: 'unavailable',
        executionRouting: 'unsupported',
        unavailableReason: message,
      },
      0,
      true,
      { status: 'error', availability: 'offline' },
    );
    this.snapshot.activeProfileId = unavailableAgent.id;
    this.snapshot.agents = [unavailableAgent];
    this.snapshot.systemStatus = {
      ...this.snapshot.systemStatus,
      gatewayStatus: 'error',
      providerHealth: 'degraded',
      activeImplementation: 'real',
      hermesAvailable: 'unavailable',
      fallbackReason: undefined,
      logsSummary: `Bridge mode: ${this.snapshot.systemStatus.bridgeMode}. Active implementation: real. Hermes unavailable: ${message}`,
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

  async getProfileDetails(profileId: string) {
    const agent = this.snapshot.agents.find((item) => item.id === profileId);
    if (!agent) return unavailableProfileDetails(profileId, profileId, 'Unknown Hermes profile.');
    const cached = this.profileDetailsCache.get(profileId);
    if (cached) return structuredClone(cached);
    if (!this.profileDetailsClient) {
      return unavailableProfileDetails(agent.id, agent.name, 'Profile detail reader is unavailable in this runtime.');
    }
    const details = await this.profileDetailsClient.getProfileDetails({
      id: agent.id,
      name: agent.name,
      source: agent.source,
      role: agent.role,
      active: agent.activeInPet,
      model: agent.equipment.find((item) => item.startsWith('Model: '))?.replace(/^Model:\s*/, ''),
      executionRouting: agent.executionRouting,
      unavailableReason: agent.unavailableReason,
    });
    this.profileDetailsCache.set(profileId, structuredClone(details));
    return details;
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
      timeline: [...task.timeline, this.timeline(task.id, report.agentId, 'approved', 'Companion response approved by the user.', 'companion')],
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
        this.timeline(original.id, report.agentId, 'revision_requested', `Revision requested: ${instructions}`, 'companion'),
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

  async stopTask(taskId: string) {
    const task = this.snapshot.tasks.find((item) => item.id === taskId);
    if (!task || task.state !== 'running') return false;
    if (!task.hermesRunId) {
      this.snapshot.systemStatus = {
        ...this.snapshot.systemStatus,
        warnings: [
          'Stop unavailable: Hermes run id is not known for this task.',
          ...this.snapshot.systemStatus.warnings.filter((warning) => warning !== 'Stop unavailable: Hermes run id is not known for this task.'),
        ],
      };
      return false;
    }
    const stopClient = task.profileContext?.routingSource === 'sidecar' && this.sidecarClient?.stopRun ? this.sidecarClient : this.apiClient;
    if (!stopClient.stopRun) {
      this.snapshot.systemStatus = {
        ...this.snapshot.systemStatus,
        warnings: [
          'Stop unavailable: Hermes gateway client does not expose stopRun.',
          ...this.snapshot.systemStatus.warnings.filter((warning) => warning !== 'Stop unavailable: Hermes gateway client does not expose stopRun.'),
        ],
      };
      return false;
    }
    const result = await stopClient.stopRun(task.hermesRunId);
    if (!result.ok) {
      this.snapshot.systemStatus = {
        ...this.snapshot.systemStatus,
        warnings: [`Stop unavailable: ${result.error ?? `Hermes gateway returned HTTP ${result.status}`}`],
      };
      return false;
    }
    const stopped = this.findTask(taskId);
    this.updateTask(taskId, {
      state: 'blocked',
      reviewStatus: 'none',
      timeline: [...stopped.timeline, this.timeline(taskId, task.assigneeId, 'blocked', 'Hermes gateway run stopped by the user.', 'companion')],
    });
    this.snapshot.agents = this.snapshot.agents.map((agent) =>
      agent.id === task.assigneeId ? { ...agent, status: 'blocked', availability: 'available', currentTaskId: undefined } : agent,
    );
    this.snapshot.systemStatus = {
      ...this.snapshot.systemStatus,
      logsSummary: `Hermes gateway run ${task.hermesRunId} stopped by user action.`,
      dataSources: {
        ...this.snapshot.systemStatus.dataSources,
        runStop: 'gateway-rest',
      },
    };
    this.emit(makeEvent('task_blocked', task.assigneeId, task.id, { hermesRunId: task.hermesRunId }));
    return true;
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
          this.timeline(task.id, agentId, 'blocked', 'Real Hermes task marked blocked by the companion test control.', 'companion'),
        ],
      });
    }
    this.snapshot.agents = this.snapshot.agents.map((agent) =>
      agent.id === agentId ? { ...agent, status: 'blocked', availability: 'busy', currentTaskId: task?.id ?? agent.currentTaskId } : agent,
    );
    this.snapshot.systemStatus = {
      ...this.snapshot.systemStatus,
      logsSummary: 'Real bridge task is blocked by companion control.',
      warnings: ['Blocked state is Companion-maintained; Hermes API run events do not expose a stable blocked signal yet.'],
    };
    this.emit(makeEvent('task_blocked', agentId, task?.id));
  }

  simulateError(taskId?: string) {
    const task = taskId ? this.findTask(taskId) : this.snapshot.tasks[0];
    this.failTask(task, 'Real Hermes error simulated by companion control.');
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
    const taskId = id('message');
    const profileContext = this.profileContextForTask(input.assigneeId, taskId);
    const routingEvent = this.profileRoutingEvent(taskId, input.assigneeId, profileContext);
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
        this.timeline(taskId, input.assigneeId, 'created', `Message created from ${input.type === 'pet' ? 'Pet Mode' : 'Companion chat'}.`, 'companion'),
        this.timeline(taskId, input.assigneeId, 'assigned', `Assigned to selected Hermes profile ${this.agentName(input.assigneeId)}.`, 'companion'),
        ...(routingEvent ? [routingEvent] : []),
      ],
      reviewStatus: 'none',
      profileContext,
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

    const profile = this.profileForTask(task.assigneeId);
    const profileContext: NonNullable<Task['profileContext']> = task.profileContext ?? this.profileContextForTask(task.assigneeId, task.id);
    const runClient =
      profileContext.routingSource === 'sidecar' && this.sidecarClient?.runTask ? this.sidecarClient :
        profileContext.routingSource === 'cli' && this.profileRunClient?.runTask ? this.profileRunClient :
          this.apiClient;
    if (!runClient.runTask) {
      this.failTask(task, `Profile route ${profileContext.routingSource} does not expose task execution.`);
      return;
    }
    const result = await runClient.runTask({
      input: this.promptForTask(task),
      instructions: this.instructionsForTask(task),
      sessionId: task.id,
      profile,
      profileRoutingSupported: profileContext.routingSource === 'public-rest' || profileContext.routingSource === 'gateway-rest',
      onRunStarted: (runId) => {
        this.updateTask(task.id, { hermesRunId: runId });
      },
    });

    if (this.findTask(task.id).state === 'blocked') return;

    if (!result.ok) {
      this.failTask(this.findTask(task.id), result.error || result.output || 'Hermes API run failed.');
      return;
    }

    if (result.runId) {
      this.updateTask(task.id, { hermesRunId: result.runId });
    }
    this.recordRunEvents(task.id, result.events);
    await this.recordRunStatus(task.id, result.runId ?? this.findTask(task.id).hermesRunId);
    if (result.profileContext) {
      this.updateTask(task.id, { profileContext: result.profileContext });
    }
    this.completeTask(this.findTask(task.id), result.output.trim() || '(Hermes API returned no output.)');
  }

  private async recordRunStatus(taskId: string, runId: string | undefined) {
    if (!runId) return;
    const task = this.findTask(taskId);
    const statusClient = task.profileContext?.routingSource === 'sidecar' && this.sidecarClient?.getRun ? this.sidecarClient : this.apiClient;
    if (!statusClient.getRun) return;
    const result = await statusClient.getRun(runId);
    if (!result.ok) {
      this.snapshot.systemStatus = {
        ...this.snapshot.systemStatus,
        dataSources: {
          ...this.snapshot.systemStatus.dataSources,
          runStatus: 'unavailable',
        },
      };
      return;
    }
    const status = runStatusFromPayload(result.data);
    if (!status) return;
    const updatedTask = this.findTask(taskId);
    const statusSource = updatedTask.profileContext?.routingSource === 'sidecar' ? 'sidecar' : 'gateway-rest';
    const statusLabel = statusSource === 'sidecar' ? 'Sidecar run' : 'Gateway run';
    this.updateTask(taskId, {
      timeline: [...updatedTask.timeline, this.timeline(taskId, updatedTask.assigneeId, 'progress', `${statusLabel} status: ${status}.`, 'bridge')],
    });
    this.snapshot.systemStatus = {
      ...this.snapshot.systemStatus,
      dataSources: {
        ...this.snapshot.systemStatus.dataSources,
        runStatus: statusSource,
      },
    };
  }

  private completeTask(task: Task, finalOutput: string) {
    if (task.type === 'pet') {
      this.completePetMessage(task, finalOutput);
      return;
    }

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
        this.timeline(task.id, task.assigneeId, 'review_required', 'Companion response is ready for review.', 'companion'),
      ],
    });
    this.snapshot.reports = [report, ...this.snapshot.reports.filter((item) => item.taskId !== task.id)];
    this.snapshot.agents = this.snapshot.agents.map((agent) =>
      agent.id === task.assigneeId
        ? { ...agent, status: 'needs_review', availability: 'available', currentTaskId: undefined, lastReportId: report.id }
        : agent,
    );
    this.snapshot.systemStatus = {
      ...this.snapshot.systemStatus,
      gatewayStatus: 'connected',
      providerHealth: 'healthy',
      bridgeMode: this.snapshot.systemStatus.bridgeMode,
      activeImplementation: 'real',
      hermesAvailable: this.snapshot.systemStatus.hermesAvailable,
      hermesApiBaseUrl: this.config.hermesApiBaseUrl,
      hermesDashboardBaseUrl: this.config.hermesDashboardBaseUrl,
      logsSummary: `Bridge mode: real. Hermes API output returned for ${this.agentName(task.assigneeId)}.`,
      warnings: this.snapshot.systemStatus.warnings,
    };
    this.emit(makeEvent('task_completed', task.assigneeId, task.id));
    this.emit(makeEvent('review_required', task.assigneeId, task.id, { reportId: report.id }));
  }

  private completePetMessage(task: Task, finalOutput: string) {
    this.updateTask(task.id, {
      state: 'completed',
      progress: 100,
      artifacts: [],
      reviewStatus: 'none',
      timeline: [
        ...task.timeline,
        this.timeline(task.id, task.assigneeId, 'completed', finalOutput, 'hermes'),
      ],
    });
    this.snapshot.reports = this.snapshot.reports.filter((item) => item.taskId !== task.id);
    this.snapshot.agents = this.snapshot.agents.map((agent) =>
      agent.id === task.assigneeId
        ? { ...agent, status: 'idle', availability: 'available', currentTaskId: undefined, lastReportId: undefined }
        : agent,
    );
    this.snapshot.systemStatus = {
      ...this.snapshot.systemStatus,
      gatewayStatus: 'connected',
      providerHealth: 'healthy',
      bridgeMode: this.snapshot.systemStatus.bridgeMode,
      activeImplementation: 'real',
      hermesAvailable: this.snapshot.systemStatus.hermesAvailable,
      hermesApiBaseUrl: this.config.hermesApiBaseUrl,
      hermesDashboardBaseUrl: this.config.hermesDashboardBaseUrl,
      logsSummary: `Bridge mode: real. Hermes chat output returned for ${this.agentName(task.assigneeId)}.`,
      warnings: this.snapshot.systemStatus.warnings,
    };
    this.emit(makeEvent('task_completed', task.assigneeId, task.id));
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
      ...this.snapshot.systemStatus,
      gatewayStatus: 'error',
      providerHealth: 'degraded',
      bridgeMode: this.snapshot.systemStatus.bridgeMode,
      activeImplementation: 'real',
      hermesAvailable: this.snapshot.systemStatus.hermesAvailable,
      hermesApiBaseUrl: this.config.hermesApiBaseUrl,
      hermesDashboardBaseUrl: this.config.hermesDashboardBaseUrl,
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
    const agent = this.snapshot.agents.find((item) => item.id === task.assigneeId);
    const profileGap = task.profileContext?.verified === false || agent?.executionRouting === 'unsupported'
      ? `Selected profile ${agent?.name ?? task.profileContext?.profileName ?? task.assigneeId} was assigned in Companion, but Hermes execution routing is unavailable: ${task.profileContext?.unavailableReason ?? agent?.unavailableReason ?? this.profileRoutingReason()}.`
      : undefined;
    const profileFact = task.profileContext?.verified
      ? `Companion routed this message to profile ${task.profileContext.profileName} through ${task.profileContext.routingSource} (${task.profileContext.routingMode}).`
      : `Companion assigned this message to profile ${this.agentName(task.assigneeId)}.`;
    return {
      id: id('report'),
      taskId: task.id,
      agentId: task.assigneeId,
      title: `Companion Response: ${task.title}`,
      summary: finalOutput,
      artifacts,
      facts: [
        'Hermes API returned final output for this companion message.',
        'Companion captured the API run result and converted it into this response.',
        profileFact,
      ],
      assumptions: ['Hermes API run.completed output is treated as final output for this bridge.'],
      knownGaps: profileGap ? [profileGap] : [],
      recommendedNextAction: 'Approve the report or request a focused revision with concrete instructions.',
      reviewItems: ['Check that Hermes output satisfies the brief.', 'Request revision if the output needs another Hermes pass.'],
      createdAt: now(),
    };
  }

  private promptForTask(task: Task) {
    if (task.type === 'pet') {
      return [
        'Hermes Companion Pet Mode message:',
        task.brief,
        task.context ? `Context:\n${task.context}` : undefined,
      ]
        .filter(Boolean)
        .join('\n\n');
    }

    return [
      'Hermes Companion message brief:',
      task.brief,
      task.goals ? `Goals:\n${task.goals}` : undefined,
      task.nonGoals ? `Non-goals:\n${task.nonGoals}` : undefined,
      task.context ? `Context:\n${task.context}` : undefined,
      task.definitionOfDone ? `Definition of done:\n${task.definitionOfDone}` : undefined,
    ]
      .filter(Boolean)
      .join('\n\n');
  }

  private instructionsForTask(task: Task) {
    if (task.type === 'pet') {
      return [
        'You are replying inside Hermes Companion Pet Mode.',
        'Answer the user directly and conversationally.',
        'Do not format the response as a report.',
        'Do not reject short casual messages for lacking a task objective.',
        'If the user greets you, greet them back briefly and ask how you can help.',
      ].join(' ');
    }

    return 'Return a concise final answer suitable for a Companion response.';
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

  private profileForTask(agentId: string): HermesProfileMetadata | undefined {
    const agent = this.snapshot.agents.find((item) => item.id === agentId);
    if (!agent || agent.executionRouting !== 'supported') return undefined;
    return {
      id: agent.id,
      name: agent.name,
      source: agent.source,
      role: agent.role,
      executionRouting: agent.executionRouting,
    };
  }

  private profileContextForTask(agentId: string, sessionId: string): NonNullable<Task['profileContext']> {
    const agent = this.snapshot.agents.find((item) => item.id === agentId);
    const routingSource = this.snapshot.systemStatus.dataSources?.profileRouting ?? 'unavailable';
    if (!agent) {
      return {
        profileId: agentId,
        profileName: 'Unknown profile',
        routingSource: 'unavailable',
        routingMode: 'unavailable',
        sessionId,
        verified: false,
        unavailableReason: `Unknown assignee ${agentId}`,
      };
    }
    const supported = agent.executionRouting === 'supported' && routingSource !== 'unavailable';
    return {
      profileId: agent.id,
      profileName: agent.name,
      source: agent.source,
      routingSource: supported ? routingSource : 'unavailable',
      routingMode: supported ? this.routingModeForSource(routingSource) : 'unavailable',
      sessionId,
      verified: supported,
      unavailableReason: supported ? undefined : agent.unavailableReason ?? this.profileRoutingReason(),
    };
  }

  private routingModeForSource(source: NonNullable<Task['profileContext']>['routingSource']): NonNullable<Task['profileContext']>['routingMode'] {
    if (source === 'public-rest' || source === 'gateway-rest') return 'request';
    if (source === 'sidecar') return 'sidecar';
    if (source === 'cli' || source === 'cli-pty') return 'cli';
    return 'unavailable';
  }

  private hasAgent(agentId: string) {
    return this.snapshot.agents.some((agent) => agent.id === agentId);
  }

  private agentFromProfile(
    profile: HermesProfileMetadata,
    index: number,
    activeInPet: boolean,
    current?: Partial<Agent>,
  ): Agent {
    const role = profile.role ?? roleForIndex(index);
    const routing = profile.executionRouting ?? 'unsupported';
    const unavailableReason = profile.unavailableReason ?? (routing === 'unsupported' ? this.profileRoutingReason() : undefined);
    return {
      id: profile.id,
      name: profile.name,
      role,
      source: profile.source,
      executionRouting: routing,
      unavailableReason,
      status: current?.status ?? 'idle',
      availability: current?.availability ?? 'available',
      activeInPet,
      currentTaskId: current?.currentTaskId,
      traits: traitsForRole(role),
      bestFor: role === 'Researcher' ? 'research, synthesis, source-heavy briefs' : role === 'Reviewer' ? 'risk checks, review, revision prompts' : 'real Hermes API execution',
      avoid: routing === 'unsupported' ? 'claims that Gateway REST routed execution to this profile' : 'unsupported profile claims',
      health: profile.source === 'unavailable'
        ? profile.unavailableReason ?? 'Hermes profile metadata unavailable'
        : `Mapped from verified Hermes ${profile.source} profile metadata`,
      equipment: [
        'Hermes API server',
        'Workspace tools',
        profile.model ? `Model: ${profile.model}` : undefined,
        profile.alias ? `Alias: ${profile.alias}` : undefined,
        profile.gatewayStatus ? `Gateway: ${profile.gatewayStatus}` : undefined,
      ].filter((item): item is string => Boolean(item)),
      skills: current?.skills ?? [],
      lastReportId: current?.lastReportId,
    };
  }

  private profileRoutingEvent(taskId: string, agentId: string, profileContext?: Task['profileContext']) {
    const agent = this.snapshot.agents.find((item) => item.id === agentId);
    if (profileContext?.verified) {
      return this.timeline(
        taskId,
        agentId,
        'progress',
        `Profile context verified: ${profileContext.profileName} routed through ${profileContext.routingSource} (${profileContext.routingMode}).`,
        'bridge',
      );
    }
    if (agent?.executionRouting !== 'unsupported') return undefined;
    return this.timeline(
      taskId,
      agentId,
      'progress',
      `Profile routing unavailable: ${profileContext?.unavailableReason ?? agent.unavailableReason ?? this.profileRoutingReason()}`,
      'bridge',
    );
  }

  private profileRoutingSummary(
    status: Agent['executionRouting'] = 'unsupported',
    reason?: string,
    source?: string,
    mode?: string,
  ) {
    if (status === 'supported') return `Profile routing supported by ${source ?? 'public REST'}${mode ? ` (${mode})` : ''}.`;
    return `Profile routing unavailable: ${reason ?? this.profileRoutingReason()}`;
  }

  private profileRoutingWarning(reason?: string) {
    return this.profileRoutingSummary('unsupported', reason);
  }

  private profileRoutingReason() {
    return '/v1/runs does not expose a verified selected-profile parameter.';
  }

  private titleFromBrief(brief: string) {
    const firstLine = brief.trim().split('\n')[0] || 'Untitled message';
    return firstLine.length > 56 ? `${firstLine.slice(0, 53)}...` : firstLine;
  }

  private emit(event: BridgeEvent) {
    const snapshot = this.getSnapshot();
    this.listeners.forEach((listener) => listener(snapshot, event));
  }
}

function skillsFromDashboard(payload: unknown): Skill[] {
  return collectionFromPayload(payload, ['skills', 'items', 'data'])
    .map((item) => {
      if (!item || typeof item !== 'object') return undefined;
      const candidate = item as Record<string, unknown>;
      const name = stringField(candidate.name) || stringField(candidate.id);
      if (!name) return undefined;
      return {
        id: stringField(candidate.id) || slugFromName(name),
        name,
        category: stringField(candidate.category) || stringField(candidate.type) || 'dashboard',
        description: stringField(candidate.description) || stringField(candidate.summary) || 'Hermes dashboard skill.',
        trigger: stringField(candidate.trigger) || stringField(candidate.command) || name,
        enabled: typeof candidate.enabled === 'boolean' ? candidate.enabled : true,
      };
    })
    .filter((skill): skill is Skill => Boolean(skill));
}

function roleForIndex(index: number): Agent['role'] {
  const roles: Agent['role'][] = ['Builder', 'Researcher', 'Reviewer'];
  return roles[index % roles.length];
}

function traitsForRole(role: Agent['role']) {
  if (role === 'Researcher') return ['Research', 'Context Discipline', 'Judgement'];
  if (role === 'Reviewer') return ['Judgement', 'Communication', 'Reliability'];
  return ['Execution', 'Planning', 'Reliability'];
}

function toolsetsFromDashboard(payload: unknown): string[] {
  return collectionFromPayload(payload, ['toolsets', 'items', 'data'])
    .map((item) => {
      if (typeof item === 'string') return `Toolset: ${item}`;
      if (!item || typeof item !== 'object') return undefined;
      const candidate = item as Record<string, unknown>;
      if (candidate.enabled === false) return undefined;
      const name = stringField(candidate.name) || stringField(candidate.id);
      return name ? `Toolset: ${name}` : undefined;
    })
    .filter((item): item is string => Boolean(item));
}

function modelsFromGateway(payload: unknown): string[] {
  return collectionFromPayload(payload, ['data', 'models', 'items'])
    .map((item) => {
      if (typeof item === 'string') return item;
      if (!item || typeof item !== 'object') return undefined;
      const candidate = item as Record<string, unknown>;
      return stringField(candidate.id) || stringField(candidate.name);
    })
    .filter((item): item is string => Boolean(item))
    .slice(0, 4);
}

function capabilitiesFromGateway(payload: unknown): string[] {
  if (Array.isArray(payload)) {
    return payload.map(stringField).filter(Boolean).slice(0, 6);
  }
  if (!payload || typeof payload !== 'object') return [];
  const candidate = payload as Record<string, unknown>;
  const collection = collectionFromPayload(payload, ['capabilities', 'data', 'items']);
  if (collection.length > 0) {
    return collection
      .map((item) => {
        if (typeof item === 'string') return item;
        if (!item || typeof item !== 'object') return undefined;
        const capability = item as Record<string, unknown>;
        return stringField(capability.id) || stringField(capability.name);
      })
      .filter((item): item is string => Boolean(item))
      .slice(0, 6);
  }
  return Object.entries(candidate)
    .filter(([, value]) => value === true)
    .map(([key]) => key)
    .slice(0, 6);
}

function countSummary(items: unknown[], singular: string) {
  const count = items.length;
  return `${count} ${singular}${count === 1 ? '' : 's'}`;
}

function logsSummary(payload: unknown) {
  const logs = collectionFromPayload(payload, ['logs', 'items', 'data']);
  const warningCount = logs.filter((item) => {
    if (!item || typeof item !== 'object') return false;
    const level = stringField((item as Record<string, unknown>).level).toLowerCase();
    return level === 'warning' || level === 'warn' || level === 'error';
  }).length;
  return `${logs.length} log entries, ${warningCount} warning/error${warningCount === 1 ? '' : 's'}`;
}

function analyticsSummary(payload: unknown) {
  if (!payload || typeof payload !== 'object') return 'analytics available';
  const candidate = payload as Record<string, unknown>;
  const requests = numberField(candidate.requests) ?? numberField(candidate.request_count) ?? numberField(candidate.total_requests);
  const tokens = numberField(candidate.tokens) ?? numberField(candidate.total_tokens);
  if (requests !== undefined && tokens !== undefined) return `${requests} requests, ${tokens} tokens`;
  if (requests !== undefined) return `${requests} requests`;
  if (tokens !== undefined) return `${tokens} tokens`;
  return 'analytics available';
}

function configSummary(config: unknown, defaults: unknown, schema: unknown) {
  const parts = [
    config ? 'config' : undefined,
    defaults ? 'defaults' : undefined,
    schema ? 'schema' : undefined,
  ].filter(Boolean);
  return parts.length > 0 ? `${parts.join(', ')} available` : undefined;
}

function envSummary(payload: unknown) {
  if (!payload || typeof payload !== 'object') return 'env status available';
  const candidate = payload as Record<string, unknown>;
  const configured = Object.entries(candidate).filter(([, value]) => {
    if (typeof value === 'string') return value.trim().length > 0;
    if (!value || typeof value !== 'object') return Boolean(value);
    const metadata = value as Record<string, unknown>;
    if (typeof metadata.set === 'boolean') return metadata.set;
    if (typeof metadata.configured === 'boolean') return metadata.configured;
    if (typeof metadata.exists === 'boolean') return metadata.exists;
    return Boolean(metadata.redacted || metadata.value);
  }).length;
  return `${configured} env key${configured === 1 ? '' : 's'} configured`;
}

function sidecarSummaryFromPayload(localStateSummary: unknown, capabilities: unknown) {
  const hasCapabilities = Boolean(capabilities);
  if (!localStateSummary || typeof localStateSummary !== 'object') {
    return hasCapabilities ? 'sidecar capabilities available; local state unavailable' : 'sidecar compatibility unavailable';
  }
  const candidate = localStateSummary as Record<string, unknown>;
  const source = (stringField(candidate.source) || 'local-state').replace(/-/g, ' ');
  const profiles = objectField(candidate.profiles);
  const logs = objectField(candidate.logs);
  const env = objectField(candidate.env);
  const profileCount = numberField(profiles?.count);
  const logCount = numberField(logs?.count);
  const envKeys = Array.isArray(env?.configured_keys) ? env.configured_keys.length : undefined;
  const parts = [
    `${source} summary available`,
    profileCount !== undefined ? `${profileCount} profiles` : undefined,
    logCount !== undefined ? `${logCount} log files` : undefined,
    envKeys !== undefined ? `${envKeys} env keys configured` : undefined,
  ].filter(Boolean);
  return parts.join('; ');
}

function objectField(value: unknown) {
  return value && typeof value === 'object' ? value as Record<string, unknown> : undefined;
}

function numberField(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function runStatusFromPayload(payload: unknown) {
  if (!payload || typeof payload !== 'object') return undefined;
  const candidate = payload as Record<string, unknown>;
  return stringField(candidate.status) || stringField(candidate.state);
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

function stringField(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function unavailableProfileDetails(profileId: string, profileName: string, reason: string): ProfileDetails {
  return {
    ok: false,
    profileId,
    profileName,
    source: 'unavailable',
    soulMd: { source: 'unavailable', text: '', unavailableReason: reason },
    skills: { source: 'unavailable', items: [], unavailableReason: reason },
    sessions: { source: 'unavailable', items: [], unavailableReason: reason },
    loadedAt: new Date().toISOString(),
    unavailableReason: reason,
  };
}

function slugFromName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'dashboard-skill';
}
