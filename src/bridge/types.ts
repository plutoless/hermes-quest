import type { Agent, BridgeEvent, BridgeSnapshot, CreateTaskInput, PetPosition, ReportCard, Task } from '../types';

export type BridgeMode = 'mock' | 'real' | 'auto';
export type Listener = (snapshot: BridgeSnapshot, event: BridgeEvent) => void;

export interface BridgeConfig {
  bridgeMode: BridgeMode;
  hermesApiBaseUrl: string;
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
  events: HermesApiRunEvent[];
}

export interface HermesApiClient {
  checkHealth(): Promise<HermesHealth>;
  runTask(input: HermesApiRunTaskInput): Promise<HermesApiRunTaskResult>;
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
}

export type { ReportCard, Task };
