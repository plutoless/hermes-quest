import type { HermesApiClient, HermesApiRunEvent, HermesApiRunTaskInput, HermesApiRunTaskResult, HermesHealth } from './types';

interface HermesApiHttpResponse {
  status: number;
  body: string;
}

type HermesApiInvoker = <T>(command: string, args?: Record<string, unknown>) => Promise<T>;

export class FetchHermesApiClient implements HermesApiClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = normalizeBaseUrl(baseUrl);
  }

  async checkHealth(): Promise<HermesHealth> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      const text = await response.text();
      return healthFromHttpResponse({ status: response.status, body: text }, this.baseUrl);
    } catch (error) {
      return { ok: false, message: `Hermes API health request failed at ${this.baseUrl}: ${messageFromUnknown(error)}` };
    }
  }

  async runTask(input: HermesApiRunTaskInput): Promise<HermesApiRunTaskResult> {
    const start = await fetch(`${this.baseUrl}/v1/runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: input.input,
        instructions: input.instructions,
        session_id: input.sessionId,
      }),
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

    return this.readRunEvents(runId);
  }

  private async readRunEvents(runId: string): Promise<HermesApiRunTaskResult> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/runs/${encodeURIComponent(runId)}/events`);
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
      return resultFromEvents(parseSseEvents(text));
    } catch (error) {
      return {
        ok: false,
        output: '',
        error: `Hermes API event stream failed at ${this.baseUrl}: ${messageFromUnknown(error)}`,
        events: [],
      };
    }
  }
}

export class NativeHermesApiClient implements HermesApiClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string, private readonly invokeCommand: HermesApiInvoker) {
    this.baseUrl = normalizeBaseUrl(baseUrl);
  }

  async checkHealth(): Promise<HermesHealth> {
    try {
      const response = await this.request('GET', `${this.baseUrl}/health`);
      return healthFromHttpResponse(response, this.baseUrl);
    } catch (error) {
      return { ok: false, message: `Hermes API health request failed at ${this.baseUrl}: ${messageFromUnknown(error)}` };
    }
  }

  async runTask(input: HermesApiRunTaskInput): Promise<HermesApiRunTaskResult> {
    const start = await this.request('POST', `${this.baseUrl}/v1/runs`, {
      input: input.input,
      instructions: input.instructions,
      session_id: input.sessionId,
    });
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
      return resultFromEvents(parseSseEvents(response.body));
    } catch (error) {
      return {
        ok: false,
        output: '',
        error: `Hermes API event stream failed at ${this.baseUrl}: ${messageFromUnknown(error)}`,
        events: [],
      };
    }
  }

  private request(method: 'GET' | 'POST', url: string, body?: unknown) {
    return this.invokeCommand<HermesApiHttpResponse>('hermes_api_request', body === undefined ? { method, url } : { method, url, body });
  }
}

export async function createDefaultHermesApiClient(baseUrl: string): Promise<HermesApiClient> {
  if (isTauriRuntime()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return new NativeHermesApiClient(baseUrl, invoke);
  }

  return new FetchHermesApiClient(baseUrl);
}

export function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.trim().replace(/\/+$/, '') || 'http://127.0.0.1:8642';
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

function healthFromHttpResponse(response: HermesApiHttpResponse, baseUrl: string): HermesHealth {
  if (response.status < 200 || response.status >= 300) {
    return { ok: false, message: `Hermes API health returned HTTP ${response.status}.` };
  }
  const body = parseJson(response.body);
  const status = typeof body.status === 'string' ? body.status : 'unknown';
  const platform = typeof body.platform === 'string' ? body.platform : 'Hermes API';
  return status === 'ok'
    ? { ok: true, message: `${platform} health ok at ${baseUrl}` }
    : { ok: false, message: `${platform} health status: ${status}` };
}

function isTauriRuntime() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}
