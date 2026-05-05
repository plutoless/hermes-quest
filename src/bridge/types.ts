import type { Agent, BridgeEvent, BridgeSnapshot, CreateTaskInput, PetPosition, ReportCard, Task } from '../types';

export type BridgeMode = 'mock' | 'real' | 'auto';
export type Listener = (snapshot: BridgeSnapshot, event: BridgeEvent) => void;

export interface BridgeConfig {
  bridgeMode: BridgeMode;
  hermesApiBaseUrl: string;
  hermesDashboardBaseUrl: string;
}

export interface HermesProfileMetadata {
  id: string;
  name: string;
}

export interface HermesHealth {
  ok: boolean;
  message: string;
  profile?: HermesProfileMetadata;
}

export interface HermesApiRunTaskInput {
  input: string;
  instructions?: string;
  sessionId?: string;
  onRunStarted?: (runId: string) => void;
}

export interface HermesApiRunEvent {
  event: string;
  run_id?: string;
  timestamp?: number;
  delta?: string;
  output?: string;
  error?: string;
  tool?: string;
  preview?: string;
  text?: string;
  profile?: { id?: unknown; name?: unknown } | string;
  active_profile?: { id?: unknown; name?: unknown } | string;
  profile_id?: string;
  profile_name?: string;
  [key: string]: unknown;
}

export interface HermesApiRunTaskResult {
  ok: boolean;
  output: string;
  error?: string;
  runId?: string;
  events: HermesApiRunEvent[];
}

export interface HermesApiClient {
  checkHealth(): Promise<HermesHealth>;
  checkDetailedHealth?(): Promise<HermesEndpointResult<unknown>>;
  listModels?(): Promise<HermesEndpointResult<unknown>>;
  getCapabilities?(): Promise<HermesEndpointResult<unknown>>;
  createChatCompletion?(body: unknown): Promise<HermesEndpointResult<unknown>>;
  createResponse?(body: unknown): Promise<HermesEndpointResult<unknown>>;
  getResponse?(responseId: string): Promise<HermesEndpointResult<unknown>>;
  deleteResponse?(responseId: string): Promise<HermesEndpointResult<unknown>>;
  getRun?(runId: string): Promise<HermesEndpointResult<unknown>>;
  stopRun?(runId: string): Promise<HermesEndpointResult<unknown>>;
  listJobs?(): Promise<HermesEndpointResult<unknown>>;
  createJob?(body: unknown): Promise<HermesEndpointResult<unknown>>;
  getJob?(jobId: string): Promise<HermesEndpointResult<unknown>>;
  updateJob?(jobId: string, body: unknown): Promise<HermesEndpointResult<unknown>>;
  deleteJob?(jobId: string): Promise<HermesEndpointResult<unknown>>;
  pauseJob?(jobId: string): Promise<HermesEndpointResult<unknown>>;
  resumeJob?(jobId: string): Promise<HermesEndpointResult<unknown>>;
  runJob?(jobId: string): Promise<HermesEndpointResult<unknown>>;
  runTask(input: HermesApiRunTaskInput): Promise<HermesApiRunTaskResult>;
}

export interface HermesEndpointResult<T> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

export interface HermesDashboardStatus {
  ok: boolean;
  message: string;
}

export interface HermesDashboardApiClient {
  hasProtectedAccess(): boolean;
  checkStatus(): Promise<HermesDashboardStatus>;
  listSessions(): Promise<HermesEndpointResult<unknown>>;
  getSession(sessionId: string): Promise<HermesEndpointResult<unknown>>;
  listSessionMessages(sessionId: string): Promise<HermesEndpointResult<unknown>>;
  searchSessions(query: string): Promise<HermesEndpointResult<unknown>>;
  deleteSession(sessionId: string): Promise<HermesEndpointResult<unknown>>;
  getConfig(): Promise<HermesEndpointResult<unknown>>;
  getConfigDefaults(): Promise<HermesEndpointResult<unknown>>;
  getConfigSchema(): Promise<HermesEndpointResult<unknown>>;
  updateConfig(body: unknown): Promise<HermesEndpointResult<unknown>>;
  getEnv(): Promise<HermesEndpointResult<unknown>>;
  updateEnv(body: unknown): Promise<HermesEndpointResult<unknown>>;
  deleteEnv(key: string): Promise<HermesEndpointResult<unknown>>;
  getLogs(): Promise<HermesEndpointResult<unknown>>;
  getAnalyticsUsage(): Promise<HermesEndpointResult<unknown>>;
  listCronJobs(): Promise<HermesEndpointResult<unknown>>;
  createCronJob(body: unknown): Promise<HermesEndpointResult<unknown>>;
  pauseCronJob(jobId: string): Promise<HermesEndpointResult<unknown>>;
  resumeCronJob(jobId: string): Promise<HermesEndpointResult<unknown>>;
  triggerCronJob(jobId: string): Promise<HermesEndpointResult<unknown>>;
  deleteCronJob(jobId: string): Promise<HermesEndpointResult<unknown>>;
  listSkills(): Promise<HermesEndpointResult<unknown>>;
  toggleSkill(body: unknown): Promise<HermesEndpointResult<unknown>>;
  listToolsets(): Promise<HermesEndpointResult<unknown>>;
}

export interface HermesBridgeApi {
  getSnapshot(): BridgeSnapshot;
  subscribe(listener: Listener): () => void;
  setActiveProfile(agentId: string): void;
  createTask(input: CreateTaskInput): string;
  approveReport(reportId: string): void;
  requestRevision(reportId: string, instructions: string): void;
  simulateBlocked(taskId?: string): void;
  simulateError(taskId?: string): void;
  setPetPosition(position: PetPosition): void;
  getHealth?(): Promise<HermesHealth>;
  listAgents?(): Promise<Agent[]>;
  setActiveAgent?(agentId: string): Promise<void>;
  getActiveAgent?(): Promise<Agent>;
  submitTask?(input: CreateTaskInput): Promise<string>;
  getTask?(taskId: string): Promise<Task | undefined>;
  reviseTask?(reportId: string, instructions: string): Promise<string | undefined>;
  approveTask?(reportId: string): Promise<void>;
  stopTask?(taskId: string): Promise<boolean>;
}

export type { ReportCard, Task };
