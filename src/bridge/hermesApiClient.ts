import type {
  HermesApiClient,
  HermesApiRunEvent,
  HermesApiRunTaskInput,
  HermesApiRunTaskResult,
  HermesEndpointResult,
  HermesHealth,
  HermesProfileListResult,
  HermesProfileMetadata,
} from './types';

interface HermesApiHttpResponse {
  status: number;
  body: string;
}

export type HermesApiRequestHeaders = Record<string, string>;
type HermesApiInvoker = <T>(command: string, args?: Record<string, unknown>) => Promise<T>;

export class FetchHermesApiClient implements HermesApiClient {
  private readonly baseUrl: string;
  private readonly requestHeaders: HermesApiRequestHeaders;

  constructor(baseUrl: string, requestHeaders: HermesApiRequestHeaders = {}) {
    this.baseUrl = normalizeBaseUrl(baseUrl);
    this.requestHeaders = requestHeaders;
  }

  async checkHealth(): Promise<HermesHealth> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, { headers: this.headers() });
      const text = await response.text();
      return healthFromHttpResponse({ status: response.status, body: text }, this.baseUrl);
    } catch (error) {
      return { ok: false, message: `Hermes API health request failed at ${this.baseUrl}: ${messageFromUnknown(error)}` };
    }
  }

  async checkDetailedHealth() {
    return this.getJson('/health/detailed');
  }

  async listModels() {
    return this.getJson('/v1/models');
  }

  async getCapabilities() {
    return this.getJson('/v1/capabilities');
  }

  async listProfiles(): Promise<HermesProfileListResult> {
    const result = await this.getJson('/v1/profiles');
    return profileListResultFromEndpoint(result);
  }

  async getActiveProfile() {
    return this.getJson('/v1/profile/active');
  }

  async createChatCompletion(body: unknown) {
    return this.requestJson('POST', '/v1/chat/completions', body);
  }

  async createResponse(body: unknown) {
    return this.requestJson('POST', '/v1/responses', body);
  }

  async getResponse(responseId: string) {
    return this.getJson(`/v1/responses/${encodeURIComponent(responseId)}`);
  }

  async deleteResponse(responseId: string) {
    return this.requestJson('DELETE', `/v1/responses/${encodeURIComponent(responseId)}`);
  }

  async getRun(runId: string) {
    return this.getJson(`/v1/runs/${encodeURIComponent(runId)}`);
  }

  async stopRun(runId: string) {
    return this.requestJson('POST', `/v1/runs/${encodeURIComponent(runId)}/stop`);
  }

  async listJobs() {
    return this.getJson('/api/jobs');
  }

  async createJob(body: unknown) {
    return this.requestJson('POST', '/api/jobs', body);
  }

  async getJob(jobId: string) {
    return this.getJson(`/api/jobs/${encodeURIComponent(jobId)}`);
  }

  async updateJob(jobId: string, body: unknown) {
    return this.requestJson('PATCH', `/api/jobs/${encodeURIComponent(jobId)}`, body);
  }

  async deleteJob(jobId: string) {
    return this.requestJson('DELETE', `/api/jobs/${encodeURIComponent(jobId)}`);
  }

  async pauseJob(jobId: string) {
    return this.requestJson('POST', `/api/jobs/${encodeURIComponent(jobId)}/pause`);
  }

  async resumeJob(jobId: string) {
    return this.requestJson('POST', `/api/jobs/${encodeURIComponent(jobId)}/resume`);
  }

  async runJob(jobId: string) {
    return this.requestJson('POST', `/api/jobs/${encodeURIComponent(jobId)}/run`);
  }

  async runTask(input: HermesApiRunTaskInput): Promise<HermesApiRunTaskResult> {
    const start = await fetch(`${this.baseUrl}/v1/runs`, {
      method: 'POST',
      headers: this.headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(runStartBody(input)),
    });
    const startBody = await start.json().catch(() => ({}));
    if (!start.ok) {
      return {
        ok: false,
        output: '',
        error: errorMessageFromBody(startBody, `Hermes API run start returned HTTP ${start.status}.`),
        events: [],
      };
    }

    const runId = typeof startBody.run_id === 'string' ? startBody.run_id : undefined;
    if (!runId) {
      return { ok: false, output: '', error: 'Hermes API run response did not include run_id.', events: [] };
    }
    input.onRunStarted?.(runId);

    return this.readRunEvents(runId);
  }

  private async readRunEvents(runId: string): Promise<HermesApiRunTaskResult> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/runs/${encodeURIComponent(runId)}/events`, { headers: this.headers() });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        return {
          ok: false,
          output: '',
          error: errorMessageFromBody(body, `Hermes API run events returned HTTP ${response.status}.`),
          events: [],
        };
      }
      const text = await response.text();
      return { ...resultFromEvents(parseSseEvents(text)), runId };
    } catch (error) {
      return {
        ok: false,
        output: '',
        error: `Hermes API event stream failed at ${this.baseUrl}: ${messageFromUnknown(error)}`,
        events: [],
      };
    }
  }

  private getJson(path: string) {
    return this.requestJson('GET', path);
  }

  private async requestJson(method: HermesApiHttpMethod, path: string, body?: unknown): Promise<HermesEndpointResult<unknown>> {
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: this.headers(body === undefined ? undefined : { 'Content-Type': 'application/json' }),
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const text = await response.text();
      return endpointResultFromHttpResponse({ status: response.status, body: text });
    } catch (error) {
      return { ok: false, status: 0, error: `Hermes API request failed at ${this.baseUrl}${path}: ${messageFromUnknown(error)}` };
    }
  }

  private headers(extra: HermesApiRequestHeaders = {}) {
    const headers = { ...this.requestHeaders, ...extra };
    return Object.keys(headers).length ? headers : undefined;
  }
}

export class NativeHermesApiClient implements HermesApiClient {
  private readonly baseUrl: string;
  private readonly requestHeaders: HermesApiRequestHeaders;

  constructor(baseUrl: string, private readonly invokeCommand: HermesApiInvoker, requestHeaders: HermesApiRequestHeaders = {}) {
    this.baseUrl = normalizeBaseUrl(baseUrl);
    this.requestHeaders = requestHeaders;
  }

  async checkHealth(): Promise<HermesHealth> {
    try {
      const response = await this.request('GET', `${this.baseUrl}/health`);
      return healthFromHttpResponse(response, this.baseUrl);
    } catch (error) {
      return { ok: false, message: `Hermes API health request failed at ${this.baseUrl}: ${messageFromUnknown(error)}` };
    }
  }

  async checkDetailedHealth() {
    return this.getJson('/health/detailed');
  }

  async listModels() {
    return this.getJson('/v1/models');
  }

  async getCapabilities() {
    return this.getJson('/v1/capabilities');
  }

  async listProfiles(): Promise<HermesProfileListResult> {
    const result = await this.getJson('/v1/profiles');
    return profileListResultFromEndpoint(result);
  }

  async getActiveProfile() {
    return this.getJson('/v1/profile/active');
  }

  async createChatCompletion(body: unknown) {
    return this.requestJson('POST', '/v1/chat/completions', body);
  }

  async createResponse(body: unknown) {
    return this.requestJson('POST', '/v1/responses', body);
  }

  async getResponse(responseId: string) {
    return this.getJson(`/v1/responses/${encodeURIComponent(responseId)}`);
  }

  async deleteResponse(responseId: string) {
    return this.requestJson('DELETE', `/v1/responses/${encodeURIComponent(responseId)}`);
  }

  async getRun(runId: string) {
    return this.getJson(`/v1/runs/${encodeURIComponent(runId)}`);
  }

  async stopRun(runId: string) {
    return this.requestJson('POST', `/v1/runs/${encodeURIComponent(runId)}/stop`);
  }

  async listJobs() {
    return this.getJson('/api/jobs');
  }

  async createJob(body: unknown) {
    return this.requestJson('POST', '/api/jobs', body);
  }

  async getJob(jobId: string) {
    return this.getJson(`/api/jobs/${encodeURIComponent(jobId)}`);
  }

  async updateJob(jobId: string, body: unknown) {
    return this.requestJson('PATCH', `/api/jobs/${encodeURIComponent(jobId)}`, body);
  }

  async deleteJob(jobId: string) {
    return this.requestJson('DELETE', `/api/jobs/${encodeURIComponent(jobId)}`);
  }

  async pauseJob(jobId: string) {
    return this.requestJson('POST', `/api/jobs/${encodeURIComponent(jobId)}/pause`);
  }

  async resumeJob(jobId: string) {
    return this.requestJson('POST', `/api/jobs/${encodeURIComponent(jobId)}/resume`);
  }

  async runJob(jobId: string) {
    return this.requestJson('POST', `/api/jobs/${encodeURIComponent(jobId)}/run`);
  }

  async runTask(input: HermesApiRunTaskInput): Promise<HermesApiRunTaskResult> {
    const start = await this.request('POST', `${this.baseUrl}/v1/runs`, runStartBody(input));
    const startBody = parseJson(start.body);
    if (start.status < 200 || start.status >= 300) {
      return {
        ok: false,
        output: '',
        error: errorMessageFromBody(startBody, `Hermes API run start returned HTTP ${start.status}.`),
        events: [],
      };
    }

    const runId = typeof startBody.run_id === 'string' ? startBody.run_id : undefined;
    if (!runId) {
      return { ok: false, output: '', error: 'Hermes API run response did not include run_id.', events: [] };
    }
    input.onRunStarted?.(runId);

    return this.readRunEvents(runId);
  }

  private async readRunEvents(runId: string): Promise<HermesApiRunTaskResult> {
    try {
      const response = await this.request('GET', `${this.baseUrl}/v1/runs/${encodeURIComponent(runId)}/events`);
      if (response.status < 200 || response.status >= 300) {
        return {
          ok: false,
          output: '',
          error: errorMessageFromBody(parseJson(response.body), `Hermes API run events returned HTTP ${response.status}.`),
          events: [],
        };
      }
      return { ...resultFromEvents(parseSseEvents(response.body)), runId };
    } catch (error) {
      return {
        ok: false,
        output: '',
        error: `Hermes API event stream failed at ${this.baseUrl}: ${messageFromUnknown(error)}`,
        events: [],
      };
    }
  }

  private getJson(path: string) {
    return this.requestJson('GET', path);
  }

  private async requestJson(method: HermesApiHttpMethod, path: string, body?: unknown) {
    try {
      const response = await this.request(method, `${this.baseUrl}${path}`, body);
      return endpointResultFromHttpResponse(response);
    } catch (error) {
      return { ok: false, status: 0, error: `Hermes API request failed at ${this.baseUrl}${path}: ${messageFromUnknown(error)}` };
    }
  }

  private request(method: HermesApiHttpMethod, url: string, body?: unknown) {
    const headers = Object.keys(this.requestHeaders).length ? this.requestHeaders : undefined;
    const args: Record<string, unknown> = { method, url };
    if (body !== undefined) args.body = body;
    if (headers) args.headers = headers;
    return this.invokeCommand<HermesApiHttpResponse>(
      'hermes_api_request',
      args,
    );
  }
}

export async function createDefaultHermesApiClient(baseUrl: string, requestHeaders: HermesApiRequestHeaders = {}): Promise<HermesApiClient> {
  if (isTauriRuntime()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return new NativeHermesApiClient(baseUrl, invoke, requestHeaders);
  }

  return new FetchHermesApiClient(baseUrl, requestHeaders);
}

export type HermesApiHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export function normalizeBaseUrl(baseUrl: string, fallback = 'http://127.0.0.1:8642') {
  return baseUrl.trim().replace(/\/+$/, '') || fallback;
}

export function parseSseEvents(text: string): HermesApiRunEvent[] {
  return text
    .split(/\n\n+/)
    .map((block) =>
      block
        .split('\n')
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trim())
        .join('\n'),
    )
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as HermesApiRunEvent;
      } catch {
        return { event: 'parse.error', error: `Could not parse SSE data: ${line}` };
      }
    });
}

function resultFromEvents(events: HermesApiRunEvent[]): HermesApiRunTaskResult {
  const failure = [...events].reverse().find((event) => event.event === 'run.failed');
  if (failure) {
    return { ok: false, output: '', error: stringField(failure.error) || 'Hermes API run failed.', events };
  }

  const completed = [...events].reverse().find((event) => event.event === 'run.completed');
  const output = stringField(completed?.output) || events.map((event) => stringField(event.delta)).filter(Boolean).join('');
  return { ok: true, output: output || '(Hermes API returned no output.)', events };
}

function errorMessageFromBody(body: unknown, fallback: string) {
  if (body && typeof body === 'object') {
    const error = (body as { error?: unknown }).error;
    if (error && typeof error === 'object') {
      const message = (error as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim()) return message;
    }
  }
  return fallback;
}

function stringField(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function messageFromUnknown(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function parseJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

export function endpointResultFromHttpResponse(response: HermesApiHttpResponse): HermesEndpointResult<unknown> {
  const data = parseJson(response.body);
  if (response.status < 200 || response.status >= 300) {
    return {
      ok: false,
      status: response.status,
      data,
      error: errorMessageFromBody(data, `Hermes API returned HTTP ${response.status}.`),
    };
  }
  return { ok: true, status: response.status, data };
}

function healthFromHttpResponse(response: HermesApiHttpResponse, baseUrl: string): HermesHealth {
  if (response.status < 200 || response.status >= 300) {
    return { ok: false, message: `Hermes API health returned HTTP ${response.status}.` };
  }
  const body = parseJson(response.body);
  const status = typeof body.status === 'string' ? body.status : 'unknown';
  const platform = typeof body.platform === 'string' ? body.platform : 'Hermes API';
  const profile = profileFromBody(body);
  return status === 'ok'
    ? healthResult(true, `${platform} health ok at ${baseUrl}`, profile)
    : healthResult(false, `${platform} health status: ${status}`, profile);
}

function healthResult(ok: boolean, message: string, profile?: HermesProfileMetadata): HermesHealth {
  return profile ? { ok, message, profile } : { ok, message };
}

function runStartBody(input: HermesApiRunTaskInput) {
  const body: Record<string, unknown> = { input: input.input };
  if (input.instructions !== undefined) body.instructions = input.instructions;
  if (input.sessionId !== undefined) body.session_id = input.sessionId;
  if (input.profileRoutingSupported && input.profile?.name) {
    body.profile = input.profile.name;
  }
  return body;
}

function profileFromBody(body: unknown): HermesProfileMetadata | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const candidate = body as Record<string, unknown>;
  return (
    profileFromUnknown(candidate.profile, 'profile') ??
    profileFromUnknown(candidate.active_profile, 'active-profile') ??
    profileFromPair(candidate.profile_id, candidate.profile_name) ??
    profileFromPair(candidate.active_profile_id, candidate.active_profile_name)
  );
}

function profileFromUnknown(value: unknown, fallbackId: string): HermesProfileMetadata | undefined {
  if (typeof value === 'string' && value.trim()) {
    return { id: fallbackId, name: value.trim() };
  }
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as Record<string, unknown>;
  return profileFromPair(candidate.id, candidate.name) ?? profileFromPair(candidate.slug, candidate.display_name);
}

function profileFromPair(idValue: unknown, nameValue: unknown): HermesProfileMetadata | undefined {
  const name = typeof nameValue === 'string' ? nameValue.trim() : '';
  if (!name) return undefined;
  const id = typeof idValue === 'string' && idValue.trim() ? idValue.trim() : slugFromName(name);
  return { id, name };
}

function profileListResultFromEndpoint(result: HermesEndpointResult<unknown>): HermesProfileListResult {
  if (!result.ok) {
    return {
      ok: false,
      profiles: [],
      source: 'unavailable',
      message: result.error ?? `Gateway /v1/profiles returned HTTP ${result.status}.`,
      executionRouting: 'unsupported',
      executionRoutingReason: '/v1/profiles is unavailable or does not advertise selected-profile routing.',
    };
  }

  const payload = result.data;
  const rawProfiles = profilesArrayFromPayload(payload);
  const activeProfile = activeProfileFromPayload(payload);
  const activeId = activeProfileIdFromPayload(payload) ?? activeProfile?.id;
  const routing = profileRoutingFromPayload(payload);
  const profiles = rawProfiles
    .map((item) => profileFromUnknown(item, 'profile'))
    .filter((profile): profile is HermesProfileMetadata => Boolean(profile))
    .map((profile) => {
      const mapped: HermesProfileMetadata = {
        ...profile,
        source: 'public-rest',
        active: activeId ? profile.id === activeId || profile.name === activeId : profile.active === true,
        executionRouting: routing.supported ? 'supported' : 'unsupported',
      };
      if (!routing.supported) mapped.unavailableReason = routing.reason;
      return mapped;
    });

  if (profiles.length === 0 && activeProfile) {
    profiles.push({
      ...activeProfile,
      source: 'public-rest',
      active: true,
      executionRouting: routing.supported ? 'supported' : 'unsupported',
    });
    if (!routing.supported) profiles[0].unavailableReason = routing.reason;
  }

  if (profiles.length === 0) {
    return {
      ok: false,
      profiles: [],
      source: 'unavailable',
      message: 'Gateway /v1/profiles returned no profile metadata.',
      executionRouting: 'unsupported',
      executionRoutingReason: routing.reason,
    };
  }

  const resolvedActiveId = profiles.find((profile) => profile.active)?.id ?? activeId ?? profiles[0]?.id;
  return {
    ok: true,
    profiles,
    activeProfileId: resolvedActiveId,
    activeProfileSource: resolvedActiveId ? 'public-rest' : undefined,
    source: 'public-rest',
    message: `${profiles.length} profiles discovered from public REST.`,
    executionRouting: routing.supported ? 'supported' : 'unsupported',
    executionRoutingReason: routing.supported ? undefined : routing.reason,
  };
}

function profilesArrayFromPayload(payload: unknown) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  const candidate = payload as Record<string, unknown>;
  for (const key of ['profiles', 'items', 'data']) {
    if (Array.isArray(candidate[key])) return candidate[key] as unknown[];
  }
  return [];
}

function activeProfileFromPayload(payload: unknown) {
  if (!payload || typeof payload !== 'object') return undefined;
  const candidate = payload as Record<string, unknown>;
  return (
    profileFromUnknown(candidate.active_profile, 'active-profile') ??
    profileFromUnknown(candidate.profile, 'active-profile') ??
    profileFromPair(candidate.active_profile_id, candidate.active_profile_name) ??
    profileFromPair(candidate.profile_id, candidate.profile_name)
  );
}

function activeProfileIdFromPayload(payload: unknown) {
  if (!payload || typeof payload !== 'object') return undefined;
  const candidate = payload as Record<string, unknown>;
  for (const key of ['active_profile_id', 'active_profile', 'active', 'profile_id']) {
    const value = candidate[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function profileRoutingFromPayload(payload: unknown) {
  const capabilityContainers = capabilityContainersFromPayload(payload);
  for (const container of capabilityContainers) {
    const profiles = objectField(container.profiles);
    const routingValue =
      profiles?.run_routing ??
      profiles?.profile_routing ??
      profiles?.selected_profile_routing ??
      profiles?.request_context ??
      container.profile_routing ??
      container.run_profile_routing;
    const requestContext = profiles?.request_context ?? container.profile_request_context;
    const sessionContext = profiles?.session_context ?? container.profile_session_context;
    if (routingValue === true && requestContext !== false && sessionContext !== false) {
      return { supported: true, reason: undefined };
    }
  }
  return {
    supported: false,
    reason: 'Gateway profile capability metadata does not advertise request/session run routing.',
  };
}

function capabilityContainersFromPayload(payload: unknown): Array<Record<string, unknown>> {
  if (!payload || typeof payload !== 'object') return [];
  const candidate = payload as Record<string, unknown>;
  const containers: Array<Record<string, unknown>> = [candidate];
  for (const key of ['capabilities', 'features']) {
    const nested = objectField(candidate[key]);
    if (nested) containers.push(nested);
  }
  return containers;
}

function objectField(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function slugFromName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'profile';
}

function isTauriRuntime() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}
