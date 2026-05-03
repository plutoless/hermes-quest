import type { HermesApiClient, HermesApiRunEvent, HermesApiRunTaskInput, HermesApiRunTaskResult, HermesHealth } from './types';

export class FetchHermesApiClient implements HermesApiClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = normalizeBaseUrl(baseUrl);
  }

  async checkHealth(): Promise<HermesHealth> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      if (!response.ok) {
        return { ok: false, message: `Hermes API health returned HTTP ${response.status}.` };
      }
      const body = await response.json().catch(() => ({}));
      const status = typeof body.status === 'string' ? body.status : 'unknown';
      const platform = typeof body.platform === 'string' ? body.platform : 'Hermes API';
      return status === 'ok'
        ? { ok: true, message: `${platform} health ok at ${this.baseUrl}` }
        : { ok: false, message: `${platform} health status: ${status}` };
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
