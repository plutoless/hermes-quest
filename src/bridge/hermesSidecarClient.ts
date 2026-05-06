import { endpointResultFromHttpResponse, normalizeBaseUrl, type HermesApiHttpMethod } from './hermesApiClient';
import type {
  HermesApiRunEvent,
  HermesApiRunTaskInput,
  HermesApiRunTaskResult,
  HermesEndpointResult,
  HermesSidecarClient,
  HermesSidecarStatus,
} from './types';

interface HermesSidecarHttpResponse {
  status: number;
  body: string;
}

type HermesSidecarInvoker = <T>(command: string, args?: Record<string, unknown>) => Promise<T>;

export class FetchHermesSidecarClient implements HermesSidecarClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = normalizeBaseUrl(baseUrl, 'http://127.0.0.1:8765');
  }

  async checkHealth(): Promise<HermesSidecarStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      const text = await response.text();
      return sidecarStatusFromHttpResponse({ status: response.status, body: text }, this.baseUrl);
    } catch (error) {
      return { ok: false, message: `Hermes Companion sidecar health request failed at ${this.baseUrl}: ${messageFromUnknown(error)}` };
    }
  }

  getCapabilities() {
    return this.requestJson('GET', '/capabilities');
  }

  getLocalStateSummary() {
    return this.requestJson('GET', '/local-state/summary');
  }

  async runTask(input: HermesApiRunTaskInput): Promise<HermesApiRunTaskResult> {
    const result = await this.requestJson('POST', '/runs', sidecarRunStartBody(input));
    return runResultFromSidecarEndpoint(result);
  }

  getRun(runId: string) {
    return this.requestJson('GET', `/runs/${encodeURIComponent(runId)}`);
  }

  stopRun(runId: string) {
    return this.requestJson('POST', `/runs/${encodeURIComponent(runId)}/stop`);
  }

  private async requestJson(method: HermesApiHttpMethod, path: string, body?: unknown): Promise<HermesEndpointResult<unknown>> {
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const text = await response.text();
      return endpointResultFromHttpResponse({ status: response.status, body: text });
    } catch (error) {
      return { ok: false, status: 0, error: `Hermes Companion sidecar request failed at ${this.baseUrl}${path}: ${messageFromUnknown(error)}` };
    }
  }
}

export class NativeHermesSidecarClient implements HermesSidecarClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string, private readonly invokeCommand: HermesSidecarInvoker) {
    this.baseUrl = normalizeBaseUrl(baseUrl, 'http://127.0.0.1:8765');
  }

  async checkHealth(): Promise<HermesSidecarStatus> {
    try {
      const response = await this.request('GET', `${this.baseUrl}/health`);
      return sidecarStatusFromHttpResponse(response, this.baseUrl);
    } catch (error) {
      return { ok: false, message: `Hermes Companion sidecar health request failed at ${this.baseUrl}: ${messageFromUnknown(error)}` };
    }
  }

  getCapabilities() {
    return this.requestJson('GET', '/capabilities');
  }

  getLocalStateSummary() {
    return this.requestJson('GET', '/local-state/summary');
  }

  async runTask(input: HermesApiRunTaskInput): Promise<HermesApiRunTaskResult> {
    const result = await this.requestJson('POST', '/runs', sidecarRunStartBody(input));
    return runResultFromSidecarEndpoint(result);
  }

  getRun(runId: string) {
    return this.requestJson('GET', `/runs/${encodeURIComponent(runId)}`);
  }

  stopRun(runId: string) {
    return this.requestJson('POST', `/runs/${encodeURIComponent(runId)}/stop`);
  }

  private async requestJson(method: HermesApiHttpMethod, path: string, body?: unknown) {
    try {
      const response = await this.request(method, `${this.baseUrl}${path}`, body);
      return endpointResultFromHttpResponse(response);
    } catch (error) {
      return { ok: false, status: 0, error: `Hermes Companion sidecar request failed at ${this.baseUrl}${path}: ${messageFromUnknown(error)}` };
    }
  }

  private request(method: HermesApiHttpMethod, url: string, body?: unknown) {
    return this.invokeCommand<HermesSidecarHttpResponse>('hermes_api_request', body === undefined ? { method, url } : { method, url, body });
  }
}

export async function createDefaultHermesSidecarClient(baseUrl: string): Promise<HermesSidecarClient> {
  if (isTauriRuntime()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return new NativeHermesSidecarClient(baseUrl, invoke);
  }

  return new FetchHermesSidecarClient(baseUrl);
}

function sidecarStatusFromHttpResponse(response: HermesSidecarHttpResponse, baseUrl: string): HermesSidecarStatus {
  const data = parseJson(response.body);
  if (response.status < 200 || response.status >= 300) {
    return { ok: false, message: `Hermes Companion sidecar health returned HTTP ${response.status}.`, data };
  }
  return { ok: true, message: `Hermes Companion sidecar available at ${baseUrl}`, data };
}

function parseJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function sidecarRunStartBody(input: HermesApiRunTaskInput) {
  return {
    input: input.input,
    instructions: input.instructions,
    session_id: input.sessionId,
    profile: input.profile?.name ? { id: input.profile.id, name: input.profile.name } : undefined,
  };
}

function runResultFromSidecarEndpoint(result: HermesEndpointResult<unknown>): HermesApiRunTaskResult {
  const data = result.data && typeof result.data === 'object' ? result.data as Record<string, unknown> : {};
  const events = Array.isArray(data.events) ? data.events as HermesApiRunEvent[] : [];
  const runId = stringField(data.run_id);
  if (!result.ok) {
    return {
      ok: false,
      output: stringField(data.output),
      error: stringField(data.error) || result.error || stringField(data.reason) || `Hermes Companion sidecar run returned HTTP ${result.status}.`,
      runId,
      events,
    };
  }
  return {
    ok: Boolean(data.ok ?? true),
    output: stringField(data.output) || events.map((event) => stringField(event.delta)).filter(Boolean).join(''),
    error: stringField(data.error),
    runId,
    events,
    profileContext: profileContextFromPayload(data.profile_context),
  };
}

function profileContextFromPayload(value: unknown) {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as Record<string, unknown>;
  const profileId = stringField(candidate.profile_id);
  const profileName = stringField(candidate.profile_name);
  const routingSource = stringField(candidate.routing_source);
  const routingMode = stringField(candidate.routing_mode);
  if (!profileId || !profileName || !routingSource || !routingMode) return undefined;
  return {
    profileId,
    profileName,
    source: stringField(candidate.source) || undefined,
    routingSource,
    routingMode,
    sessionId: stringField(candidate.session_id) || undefined,
    verified: candidate.verified === true,
    unavailableReason: stringField(candidate.unavailable_reason) || undefined,
  } as NonNullable<HermesApiRunTaskResult['profileContext']>;
}

function stringField(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function messageFromUnknown(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function isTauriRuntime() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}
