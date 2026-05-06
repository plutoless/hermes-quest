export type AgentStatus = 'idle' | 'thinking' | 'running' | 'blocked' | 'needs_review' | 'error';
export type AgentAvailability = 'available' | 'busy' | 'offline';
export type TaskState = 'created' | 'assigned' | 'running' | 'blocked' | 'completed' | 'needs_review' | 'approved' | 'error';
export type ReviewStatus = 'none' | 'required' | 'approved' | 'revision_requested';
export type TimelineSource = 'guild' | 'bridge' | 'hermes';

export interface Skill {
  id: string;
  name: string;
  category: string;
  description: string;
  trigger: string;
  enabled: boolean;
}

export interface ProfileTextSection {
  source: SystemDataSource;
  path?: string;
  text: string;
  truncated?: boolean;
  unavailableReason?: string;
}

export interface ProfileSkillSummary {
  id: string;
  name: string;
  category?: string;
  description?: string;
  trigger?: string;
  enabled?: boolean;
  source: SystemDataSource;
  path?: string;
  unavailableReason?: string;
}

export interface ProfileSessionSummary {
  id: string;
  title: string;
  source: SystemDataSource;
  path?: string;
  updatedAt?: string;
  messageCount?: number;
  unavailableReason?: string;
}

export interface ProfileDetailsSection<T> {
  source: SystemDataSource;
  path?: string;
  items: T[];
  unavailableReason?: string;
}

export interface ProfileDetails {
  ok: boolean;
  profileId: string;
  profileName: string;
  source: SystemDataSource;
  path?: string;
  soulMd: ProfileTextSection;
  skills: ProfileDetailsSection<ProfileSkillSummary>;
  sessions: ProfileDetailsSection<ProfileSessionSummary>;
  loadedAt: string;
  unavailableReason?: string;
}

export interface Agent {
  id: string;
  name: string;
  role: 'Researcher' | 'Builder' | 'Reviewer';
  source?: SystemDataSource;
  executionRouting?: 'supported' | 'unsupported' | 'unknown';
  unavailableReason?: string;
  status: AgentStatus;
  availability: AgentAvailability;
  activeInPet: boolean;
  currentTaskId?: string;
  skills: Skill[];
  traits: string[];
  bestFor: string;
  avoid: string;
  health: string;
  equipment: string[];
  lastReportId?: string;
}

export interface Artifact {
  id: string;
  taskId: string;
  kind: 'summary' | 'handoff' | 'decision' | 'risk' | 'open_question' | 'file';
  title: string;
  description: string;
  path?: string;
}

export interface TimelineEvent {
  id: string;
  taskId: string;
  agentId?: string;
  type:
    | 'created'
    | 'assigned'
    | 'started'
    | 'progress'
    | 'blocked'
    | 'artifact'
    | 'completed'
    | 'review_required'
    | 'approved'
    | 'revision_requested'
    | 'error';
  message: string;
  timestamp: string;
  source: TimelineSource;
}

export interface ProfileContext {
  profileId: string;
  profileName: string;
  source?: SystemDataSource;
  routingSource: SystemDataSource;
  routingMode: 'request' | 'session' | 'cli' | 'sidecar' | 'unavailable';
  sessionId?: string;
  verified: boolean;
  unavailableReason?: string;
}

export interface Task {
  id: string;
  title: string;
  assigneeId: string;
  brief: string;
  goals?: string;
  nonGoals?: string;
  context?: string;
  definitionOfDone?: string;
  type: 'pet' | 'quest_board';
  state: TaskState;
  progress: number;
  artifacts: Artifact[];
  timeline: TimelineEvent[];
  reviewStatus: ReviewStatus;
  error?: string;
  revisionOfTaskId?: string;
  hermesRunId?: string;
  profileContext?: ProfileContext;
  createdAt: string;
  updatedAt: string;
}

export interface ReportCard {
  id: string;
  taskId: string;
  agentId: string;
  title: string;
  summary: string;
  artifacts: Artifact[];
  facts: string[];
  assumptions: string[];
  knownGaps: string[];
  recommendedNextAction: string;
  reviewItems: string[];
  createdAt: string;
}

export interface SystemStatus {
  gatewayStatus: 'mocked' | 'connected' | 'error';
  providerHealth: 'mocked' | 'healthy' | 'degraded';
  dashboardAvailable?: 'available' | 'unavailable' | 'unchecked';
  sidecarAvailable?: 'available' | 'unavailable' | 'unchecked';
  bridgeMode: 'mock' | 'real' | 'auto';
  activeImplementation: 'mock' | 'real' | 'loading';
  hermesAvailable: 'available' | 'unavailable' | 'unchecked';
  fallbackReason?: string;
  hermesApiBaseUrl?: string;
  hermesDashboardBaseUrl?: string;
  hermesSidecarBaseUrl?: string;
  logsSummary: string;
  warnings: string[];
  dataSources?: Record<
    string,
    SystemDataSource
  >;
  operationalData?: {
    sessionsSummary?: string;
    sessionMessagesSummary?: string;
    logsSummary?: string;
    analyticsSummary?: string;
    cronSummary?: string;
    configSummary?: string;
    envSummary?: string;
    gatewayJobsSummary?: string;
    sidecarSummary?: string;
    profileSummary?: string;
    activeProfileSummary?: string;
    profileRoutingSummary?: string;
  };
}

export type SystemDataSource =
  | 'public-rest'
  | 'gateway-rest'
  | 'cli'
  | 'local-state'
  | 'local-hermes-state'
  | 'sidecar'
  | 'dashboard-compatibility'
  | 'guild-owned'
  | 'mock-fallback'
  | 'unavailable'
  | 'cli-pty';

export interface PetPosition {
  x: number;
  y: number;
}

export interface BridgeSnapshot {
  agents: Agent[];
  activeProfileId: string;
  tasks: Task[];
  reports: ReportCard[];
  systemStatus: SystemStatus;
  petPosition: PetPosition;
}

export type BridgeEventType =
  | 'active_profile_changed'
  | 'agent_idle'
  | 'task_started'
  | 'task_progress'
  | 'task_blocked'
  | 'task_completed'
  | 'review_required'
  | 'review_approved'
  | 'revision_requested'
  | 'gateway_error';

export interface BridgeEvent {
  id: string;
  type: BridgeEventType;
  agentId?: string;
  taskId?: string;
  payload?: Record<string, unknown>;
  timestamp: string;
}

export interface CreateTaskInput {
  brief: string;
  assigneeId: string;
  type: 'pet' | 'quest_board';
  goals?: string;
  nonGoals?: string;
  context?: string;
  definitionOfDone?: string;
}

export type CompanionStatus = 'idle' | 'thinking' | 'talking' | 'away' | 'hidden';
export type AnimationState = 'idle' | 'talk' | 'think' | 'wave';
export type AppearanceSource = 'preset' | 'generated' | 'uploaded';

export interface Companion {
  id: string;
  name: string;
  description?: string;
  visible: boolean;
  status: CompanionStatus;
  appearanceId: string;
  position: {
    x: number;
    y: number;
  };
  scale: number;
  behavior: {
    allowDrag: boolean;
    showSpeechBubbles: boolean;
    idleAtScreenEdge?: boolean;
    clickThrough?: boolean;
  };
  agent?: {
    agentId?: string;
    provider?: string;
    model?: string;
    source?: SystemDataSource;
    executionRouting?: Agent['executionRouting'];
    unavailableReason?: string;
  };
}

export interface CompanionAppearance {
  id: string;
  name: string;
  source: AppearanceSource;
  thumbnailUrl: string;
  spriteSheetUrl: string;
  frameUrls?: string[];
  frameWidth: number;
  frameHeight: number;
  rows: {
    idle: number;
    talk: number;
    think: number;
    wave: number;
  };
  framesPerRow: number;
  fps: {
    idle: number;
    talk: number;
    think: number;
    wave: number;
  };
  background?: {
    type: 'transparent' | 'chroma';
    chromaKey?: string;
  };
}

export interface AppSettings {
  launchAtStartup: boolean;
  alwaysOnTop: boolean;
  rememberPositions: boolean;
  allowDragging: boolean;
  showSpeechBubbles: boolean;
  quietMode: boolean;
  clickThrough: boolean;
  lowResourceMode: boolean;
  theme: 'light' | 'dark' | 'system';
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface ChatProvider {
  sendMessage(input: {
    companionId: string;
    messages: ChatMessage[];
  }): Promise<ChatMessage>;
}
