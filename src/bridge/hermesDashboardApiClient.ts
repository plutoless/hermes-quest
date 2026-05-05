import { endpointResultFromHttpResponse, normalizeBaseUrl, type HermesApiHttpMethod } from './hermesApiClient';
import type { HermesDashboardApiClient, HermesDashboardStatus, HermesEndpointResult } from './types';

interface HermesDashboardHttpResponse {
  status: number;
  body: string;
}

type HermesDashboardInvoker = <T>(command: string, args?: Record<string, unknown>) => Promise<T>;

interface HermesDashboardClientOptions {
  sessionToken?: string;
}

const protectedEndpointError: HermesEndpointResult<unknown> = {
  ok: false,
  status: 401,
  error: 'Hermes dashboard protected endpoint requires an explicit session token.',
};

const publicPaths = new Set(['/api/status', '/api/config/defaults', '/api/config/schema', '/api/model/info']);

export class FetchHermesDashboardApiClient implements HermesDashboardApiClient {
  private readonly baseUrl: string;
  private readonly sessionToken?: string;

  constructor(baseUrl: string, options: HermesDashboardClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(baseUrl, 'http://127.0.0.1:9119');
    this.sessionToken = normalizeToken(options.sessionToken);
  }

  hasProtectedAccess() {
    return Boolean(this.sessionToken);
  }

  async checkStatus(): Promise<HermesDashboardStatus> {
    const result = await this.getJson('/api/status');
    return result.ok
      ? { ok: true, message: `Hermes dashboard compatibility ok at ${this.baseUrl}` }
      : { ok: false, message: result.error ?? `Hermes dashboard compatibility unavailable at ${this.baseUrl}` };
  }

  listSessions() {
    return this.getJson('/api/sessions');
  }

  getSession(sessionId: string) {
    return this.getJson(`/api/sessions/${encodeURIComponent(sessionId)}`);
  }

  listSessionMessages(sessionId: string) {
    return this.getJson(`/api/sessions/${encodeURIComponent(sessionId)}/messages`);
  }

  searchSessions(query: string) {
    const params = new URLSearchParams({ q: query });
    return this.getJson(`/api/sessions/search?${params.toString()}`);
  }

  deleteSession(sessionId: string) {
    return this.requestJson('DELETE', `/api/sessions/${encodeURIComponent(sessionId)}`);
  }

  getConfig() {
    return this.getJson('/api/config');
  }

  getConfigDefaults() {
    return this.getJson('/api/config/defaults');
  }

  getConfigSchema() {
    return this.getJson('/api/config/schema');
  }

  updateConfig(body: unknown) {
    return this.requestJson('PUT', '/api/config', body);
  }

  getEnv() {
    return this.getJson('/api/env');
  }

  updateEnv(body: unknown) {
    return this.requestJson('PUT', '/api/env', body);
  }

  deleteEnv(key: string) {
    return this.requestJson('DELETE', '/api/env', { key });
  }

  getLogs() {
    return this.getJson('/api/logs');
  }

  getAnalyticsUsage() {
    return this.getJson('/api/analytics/usage');
  }

  listCronJobs() {
    return this.getJson('/api/cron/jobs');
  }

  createCronJob(body: unknown) {
    return this.requestJson('POST', '/api/cron/jobs', body);
  }

  pauseCronJob(jobId: string) {
    return this.requestJson('POST', `/api/cron/jobs/${encodeURIComponent(jobId)}/pause`);
  }

  resumeCronJob(jobId: string) {
    return this.requestJson('POST', `/api/cron/jobs/${encodeURIComponent(jobId)}/resume`);
  }

  triggerCronJob(jobId: string) {
    return this.requestJson('POST', `/api/cron/jobs/${encodeURIComponent(jobId)}/trigger`);
  }

  deleteCronJob(jobId: string) {
    return this.requestJson('DELETE', `/api/cron/jobs/${encodeURIComponent(jobId)}`);
  }

  listSkills() {
    return this.getJson('/api/skills');
  }

  toggleSkill(body: unknown) {
    return this.requestJson('PUT', '/api/skills/toggle', body);
  }

  listToolsets() {
    return this.getJson('/api/tools/toolsets');
  }

  private getJson(path: string) {
    return this.requestJson('GET', path);
  }

  private async requestJson(method: HermesApiHttpMethod, path: string, body?: unknown): Promise<HermesEndpointResult<unknown>> {
    if (isProtectedPath(path) && !this.sessionToken) {
      return protectedEndpointError;
    }
    try {
      const headers = requestHeaders(body, isProtectedPath(path) ? this.sessionToken : undefined);
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const text = await response.text();
      return endpointResultFromHttpResponse({ status: response.status, body: text });
    } catch (error) {
      return { ok: false, status: 0, error: `Hermes dashboard request failed at ${this.baseUrl}${path}: ${messageFromUnknown(error)}` };
    }
  }
}

export class NativeHermesDashboardApiClient implements HermesDashboardApiClient {
  private readonly baseUrl: string;
  private readonly sessionToken?: string;

  constructor(baseUrl: string, private readonly invokeCommand: HermesDashboardInvoker, options: HermesDashboardClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(baseUrl, 'http://127.0.0.1:9119');
    this.sessionToken = normalizeToken(options.sessionToken);
  }

  hasProtectedAccess() {
    return Boolean(this.sessionToken);
  }

  async checkStatus(): Promise<HermesDashboardStatus> {
    const result = await this.getJson('/api/status');
    return result.ok
      ? { ok: true, message: `Hermes dashboard compatibility ok at ${this.baseUrl}` }
      : { ok: false, message: result.error ?? `Hermes dashboard compatibility unavailable at ${this.baseUrl}` };
  }

  listSessions() {
    return this.getJson('/api/sessions');
  }

  getSession(sessionId: string) {
    return this.getJson(`/api/sessions/${encodeURIComponent(sessionId)}`);
  }

  listSessionMessages(sessionId: string) {
    return this.getJson(`/api/sessions/${encodeURIComponent(sessionId)}/messages`);
  }

  searchSessions(query: string) {
    const params = new URLSearchParams({ q: query });
    return this.getJson(`/api/sessions/search?${params.toString()}`);
  }

  deleteSession(sessionId: string) {
    return this.requestJson('DELETE', `/api/sessions/${encodeURIComponent(sessionId)}`);
  }

  getConfig() {
    return this.getJson('/api/config');
  }

  getConfigDefaults() {
    return this.getJson('/api/config/defaults');
  }

  getConfigSchema() {
    return this.getJson('/api/config/schema');
  }

  updateConfig(body: unknown) {
    return this.requestJson('PUT', '/api/config', body);
  }

  getEnv() {
    return this.getJson('/api/env');
  }

  updateEnv(body: unknown) {
    return this.requestJson('PUT', '/api/env', body);
  }

  deleteEnv(key: string) {
    return this.requestJson('DELETE', '/api/env', { key });
  }

  getLogs() {
    return this.getJson('/api/logs');
  }

  getAnalyticsUsage() {
    return this.getJson('/api/analytics/usage');
  }

  listCronJobs() {
    return this.getJson('/api/cron/jobs');
  }

  createCronJob(body: unknown) {
    return this.requestJson('POST', '/api/cron/jobs', body);
  }

  pauseCronJob(jobId: string) {
    return this.requestJson('POST', `/api/cron/jobs/${encodeURIComponent(jobId)}/pause`);
  }

  resumeCronJob(jobId: string) {
    return this.requestJson('POST', `/api/cron/jobs/${encodeURIComponent(jobId)}/resume`);
  }

  triggerCronJob(jobId: string) {
    return this.requestJson('POST', `/api/cron/jobs/${encodeURIComponent(jobId)}/trigger`);
  }

  deleteCronJob(jobId: string) {
    return this.requestJson('DELETE', `/api/cron/jobs/${encodeURIComponent(jobId)}`);
  }

  listSkills() {
    return this.getJson('/api/skills');
  }

  toggleSkill(body: unknown) {
    return this.requestJson('PUT', '/api/skills/toggle', body);
  }

  listToolsets() {
    return this.getJson('/api/tools/toolsets');
  }

  private getJson(path: string) {
    return this.requestJson('GET', path);
  }

  private async requestJson(method: HermesApiHttpMethod, path: string, body?: unknown): Promise<HermesEndpointResult<unknown>> {
    if (isProtectedPath(path) && !this.sessionToken) {
      return protectedEndpointError;
    }
    try {
      const headers = requestHeaders(body, isProtectedPath(path) ? this.sessionToken : undefined);
      const response = await this.invokeCommand<HermesDashboardHttpResponse>(
        'hermes_api_request',
        {
          method,
          url: `${this.baseUrl}${path}`,
          ...(body === undefined ? {} : { body }),
          ...(headers === undefined ? {} : { headers }),
        },
      );
      return endpointResultFromHttpResponse(response);
    } catch (error) {
      return { ok: false, status: 0, error: `Hermes dashboard request failed at ${this.baseUrl}${path}: ${messageFromUnknown(error)}` };
    }
  }
}

export async function createDefaultHermesDashboardApiClient(baseUrl: string): Promise<HermesDashboardApiClient> {
  if (isTauriRuntime()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return new NativeHermesDashboardApiClient(baseUrl, invoke);
  }

  return new FetchHermesDashboardApiClient(baseUrl);
}

function isTauriRuntime() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

function isProtectedPath(path: string) {
  const pathname = path.split('?', 1)[0];
  return pathname.startsWith('/api/') && !publicPaths.has(pathname);
}

function requestHeaders(body: unknown, sessionToken: string | undefined) {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (sessionToken) headers['X-Hermes-Session-Token'] = sessionToken;
  return Object.keys(headers).length > 0 ? headers : undefined;
}

function normalizeToken(token: string | undefined) {
  return typeof token === 'string' && token.trim() ? token.trim() : undefined;
}

function messageFromUnknown(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
