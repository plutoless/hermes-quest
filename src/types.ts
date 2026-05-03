export type AgentStatus = 'idle' | 'thinking' | 'running' | 'blocked' | 'needs_review' | 'error';
export type AgentAvailability = 'available' | 'busy' | 'offline';
export type TaskState = 'created' | 'assigned' | 'running' | 'blocked' | 'needs_review' | 'approved' | 'error';
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

export interface Agent {
  id: string;
  name: string;
  role: 'Researcher' | 'Builder' | 'Reviewer';
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
  logsSummary: string;
  warnings: string[];
}

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
