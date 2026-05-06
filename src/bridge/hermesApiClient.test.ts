import { describe, expect, test } from 'bun:test';
import { FetchHermesApiClient, NativeHermesApiClient, parseSseEvents } from './hermesApiClient';

describe('hermesApiClient', () => {
  test('native client checks health through the Tauri command instead of browser fetch', async () => {
    const calls: Array<{ command: string; args?: Record<string, unknown> }> = [];
    const client = new NativeHermesApiClient('http://127.0.0.1:8642/', async (command, args) => {
      calls.push({ command, args });
      return {
        status: 200,
        body: JSON.stringify({ status: 'ok', platform: 'hermes-agent' }),
      };
    });

    const health = await client.checkHealth();

    expect(health).toEqual({ ok: true, message: 'hermes-agent health ok at http://127.0.0.1:8642' });
    expect(calls).toEqual([
      {
        command: 'hermes_api_request',
        args: {
          method: 'GET',
          url: 'http://127.0.0.1:8642/health',
        },
      },
    ]);
  });

  test('native health extracts Hermes profile metadata from top-level fields', async () => {
    const client = new NativeHermesApiClient('http://127.0.0.1:8642', async () => ({
      status: 200,
      body: JSON.stringify({
        status: 'ok',
        platform: 'hermes-agent',
        profile: { id: 'codex-work', name: 'Codex Work' },
      }),
    }));

    const health = await client.checkHealth();

    expect(health).toEqual({
      ok: true,
      message: 'hermes-agent health ok at http://127.0.0.1:8642',
      profile: { id: 'codex-work', name: 'Codex Work' },
    });
  });

  test('native client submits runs and reads SSE events through the Tauri command', async () => {
    const calls: Array<{ command: string; args?: Record<string, unknown> }> = [];
    const client = new NativeHermesApiClient('http://127.0.0.1:8642', async (command, args) => {
      calls.push({ command, args });
      if (args?.method === 'POST') {
        return { status: 202, body: JSON.stringify({ run_id: 'run_123', status: 'started' }) };
      }
      return {
        status: 200,
        body: [
          'data: {"event":"message.delta","delta":"pong"}',
          '',
          'data: {"event":"run.completed","output":"pong"}',
          '',
          ': stream closed',
        ].join('\n'),
      };
    });

    const result = await client.runTask({ input: 'Reply pong.', instructions: 'Be brief.', sessionId: 'task-1' });

    expect(result.ok).toBe(true);
    expect(result.output).toBe('pong');
    expect(result.events.map((event) => event.event)).toEqual(['message.delta', 'run.completed']);
    expect(calls[0]).toEqual({
      command: 'hermes_api_request',
      args: {
        method: 'POST',
        url: 'http://127.0.0.1:8642/v1/runs',
        body: {
          input: 'Reply pong.',
          instructions: 'Be brief.',
          session_id: 'task-1',
        },
      },
    });
    expect(calls[1]).toEqual({
      command: 'hermes_api_request',
      args: {
        method: 'GET',
        url: 'http://127.0.0.1:8642/v1/runs/run_123/events',
      },
    });
  });

  test('native client sends managed authorization headers through health, runs, and events', async () => {
    const calls: Array<{ command: string; args?: Record<string, unknown> }> = [];
    const client = new NativeHermesApiClient(
      'https://managed.example.com/hermes',
      async (command, args) => {
        calls.push({ command, args });
        if (args?.url === 'https://managed.example.com/hermes/v1/runs') {
          return { status: 202, body: JSON.stringify({ run_id: 'run_123' }) };
        }
        if (args?.url === 'https://managed.example.com/hermes/v1/runs/run_123/events') {
          return { status: 200, body: 'data: {"event":"run.completed","output":"done"}\n\n' };
        }
        return { status: 200, body: JSON.stringify({ status: 'ok', platform: 'hermes-agent' }) };
      },
      { Authorization: 'Bearer managed-token' },
    );

    await client.checkHealth();
    await client.runTask({ input: 'Run managed task.' });

    expect(calls.map((call) => call.args?.headers)).toEqual([
      { Authorization: 'Bearer managed-token' },
      { Authorization: 'Bearer managed-token' },
      { Authorization: 'Bearer managed-token' },
    ]);
  });

  test('native client includes selected profile only when routing is capability-supported', async () => {
    const calls: Array<{ command: string; args?: Record<string, unknown> }> = [];
    const client = new NativeHermesApiClient('http://127.0.0.1:8642', async (command, args) => {
      calls.push({ command, args });
      if (args?.method === 'POST') {
        return { status: 202, body: JSON.stringify({ run_id: 'run_123', status: 'started', profile: 'frieren' }) };
      }
      return { status: 200, body: 'data: {"event":"run.completed","output":"done"}\n\n' };
    });

    await client.runTask({
      input: 'Use selected profile.',
      sessionId: 'task-1',
      profile: { id: 'frieren', name: 'frieren', source: 'public-rest', executionRouting: 'supported' },
      profileRoutingSupported: true,
    });

    expect(calls[0].args?.body).toEqual({
      input: 'Use selected profile.',
      session_id: 'task-1',
      profile: 'frieren',
    });
  });

  test('native client omits selected profile when routing is not supported', async () => {
    const calls: Array<{ command: string; args?: Record<string, unknown> }> = [];
    const client = new NativeHermesApiClient('http://127.0.0.1:8642', async (command, args) => {
      calls.push({ command, args });
      if (args?.method === 'POST') {
        return { status: 202, body: JSON.stringify({ run_id: 'run_123', status: 'started' }) };
      }
      return { status: 200, body: 'data: {"event":"run.completed","output":"done"}\n\n' };
    });

    await client.runTask({
      input: 'Use selected profile.',
      sessionId: 'task-1',
      profile: { id: 'frieren', name: 'frieren', source: 'cli', executionRouting: 'unsupported' },
      profileRoutingSupported: false,
    });

    expect(calls[0].args?.body).toEqual({
      input: 'Use selected profile.',
      session_id: 'task-1',
    });
  });

  test('native client reports the gateway run id before reading events', async () => {
    const startedRuns: string[] = [];
    const client = new NativeHermesApiClient('http://127.0.0.1:8642', async (_command, args) => {
      if (args?.method === 'POST') {
        return { status: 202, body: JSON.stringify({ run_id: 'run_123', status: 'started' }) };
      }
      return {
        status: 200,
        body: 'data: {"event":"run.completed","output":"pong"}\n\n',
      };
    });

    const result = await client.runTask({ input: 'Reply pong.', onRunStarted: (runId) => startedRuns.push(runId) });

    expect(startedRuns).toEqual(['run_123']);
    expect(result.runId).toBe('run_123');
  });

  test('native client exposes gateway REST endpoint families with the expected methods', async () => {
    const calls: Array<{ command: string; args?: Record<string, unknown> }> = [];
    const client = new NativeHermesApiClient('http://127.0.0.1:8642', async (command, args) => {
      calls.push({ command, args });
      return { status: 200, body: JSON.stringify({ ok: true }) };
    });

    await client.checkDetailedHealth?.();
    await client.listModels?.();
    await client.getCapabilities?.();
    await client.listProfiles?.();
    await client.getActiveProfile?.();
    await client.createChatCompletion?.({ messages: [] });
    await client.createResponse?.({ input: 'hello' });
    await client.getResponse?.('resp 1');
    await client.deleteResponse?.('resp 1');
    await client.getRun?.('run 1');
    await client.stopRun?.('run 1');
    await client.listJobs?.();
    await client.createJob?.({ name: 'daily' });
    await client.getJob?.('job 1');
    await client.updateJob?.('job 1', { enabled: false });
    await client.deleteJob?.('job 1');
    await client.pauseJob?.('job 1');
    await client.resumeJob?.('job 1');
    await client.runJob?.('job 1');

    expect(calls.map((call) => call.args)).toEqual([
      { method: 'GET', url: 'http://127.0.0.1:8642/health/detailed' },
      { method: 'GET', url: 'http://127.0.0.1:8642/v1/models' },
      { method: 'GET', url: 'http://127.0.0.1:8642/v1/capabilities' },
      { method: 'GET', url: 'http://127.0.0.1:8642/v1/profiles' },
      { method: 'GET', url: 'http://127.0.0.1:8642/v1/profile/active' },
      { method: 'POST', url: 'http://127.0.0.1:8642/v1/chat/completions', body: { messages: [] } },
      { method: 'POST', url: 'http://127.0.0.1:8642/v1/responses', body: { input: 'hello' } },
      { method: 'GET', url: 'http://127.0.0.1:8642/v1/responses/resp%201' },
      { method: 'DELETE', url: 'http://127.0.0.1:8642/v1/responses/resp%201' },
      { method: 'GET', url: 'http://127.0.0.1:8642/v1/runs/run%201' },
      { method: 'POST', url: 'http://127.0.0.1:8642/v1/runs/run%201/stop' },
      { method: 'GET', url: 'http://127.0.0.1:8642/api/jobs' },
      { method: 'POST', url: 'http://127.0.0.1:8642/api/jobs', body: { name: 'daily' } },
      { method: 'GET', url: 'http://127.0.0.1:8642/api/jobs/job%201' },
      { method: 'PATCH', url: 'http://127.0.0.1:8642/api/jobs/job%201', body: { enabled: false } },
      { method: 'DELETE', url: 'http://127.0.0.1:8642/api/jobs/job%201' },
      { method: 'POST', url: 'http://127.0.0.1:8642/api/jobs/job%201/pause' },
      { method: 'POST', url: 'http://127.0.0.1:8642/api/jobs/job%201/resume' },
      { method: 'POST', url: 'http://127.0.0.1:8642/api/jobs/job%201/run' },
    ]);
  });

  test('gateway endpoint helpers preserve unavailable responses without throwing', async () => {
    const client = new NativeHermesApiClient('http://127.0.0.1:8642', async () => ({
      status: 404,
      body: JSON.stringify({ error: { message: 'endpoint missing' } }),
    }));

    const result = await client.getRun?.('missing');

    expect(result).toEqual({
      ok: false,
      status: 404,
      data: { error: { message: 'endpoint missing' } },
      error: 'endpoint missing',
    });
  });

  test('native client parses public REST profiles and profile routing capability metadata', async () => {
    const client = new NativeHermesApiClient('http://127.0.0.1:8642', async (_command, args) => {
      if (String(args?.url).endsWith('/v1/profiles')) {
        return {
          status: 200,
          body: JSON.stringify({
            profiles: [
              { id: 'default', name: 'default' },
              { id: 'frieren', name: 'frieren' },
            ],
            active_profile: 'frieren',
            capabilities: {
              profiles: {
                run_routing: true,
                request_context: true,
                session_context: true,
              },
            },
          }),
        };
      }
      return { status: 404, body: JSON.stringify({ error: { message: 'missing' } }) };
    });

    const result = await client.listProfiles?.();

    expect(result).toEqual({
      ok: true,
      profiles: [
        { id: 'default', name: 'default', source: 'public-rest', active: false, executionRouting: 'supported' },
        { id: 'frieren', name: 'frieren', source: 'public-rest', active: true, executionRouting: 'supported' },
      ],
      activeProfileId: 'frieren',
      activeProfileSource: 'public-rest',
      source: 'public-rest',
      message: '2 profiles discovered from public REST.',
      executionRouting: 'supported',
      executionRoutingReason: undefined,
    });
  });

  test('fetch client preserves HTTP health errors for browser mode', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: 'blocked' }), {
        status: 403,
        headers: { 'content-type': 'application/json' },
      });

    try {
      const health = await new FetchHermesApiClient('http://127.0.0.1:8642').checkHealth();
      expect(health).toEqual({ ok: false, message: 'Hermes API health returned HTTP 403.' });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('fetch client sends managed authorization headers and local clients send none', async () => {
    const originalFetch = globalThis.fetch;
    const calls: Array<{ url: string; headers?: HeadersInit }> = [];
    globalThis.fetch = async (input, init) => {
      calls.push({ url: String(input), headers: init?.headers });
      return new Response(JSON.stringify({ status: 'ok', platform: 'hermes-agent' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    };

    try {
      await new FetchHermesApiClient('http://127.0.0.1:8642').checkHealth();
      await new FetchHermesApiClient('https://managed.example.com/hermes', {
        Authorization: 'Bearer managed-token',
      }).checkHealth();
      expect(calls).toEqual([
        { url: 'http://127.0.0.1:8642/health', headers: undefined },
        {
          url: 'https://managed.example.com/hermes/health',
          headers: { Authorization: 'Bearer managed-token' },
        },
      ]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('fetch health extracts Hermes profile metadata from alternate fields', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          status: 'ok',
          platform: 'hermes-agent',
          active_profile: 'Personal Hermes',
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );

    try {
      const health = await new FetchHermesApiClient('http://127.0.0.1:8642').checkHealth();
      expect(health.profile).toEqual({ id: 'active-profile', name: 'Personal Hermes' });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('parses SSE event blocks and ignores comments', () => {
    expect(parseSseEvents('data: {"event":"message.delta","delta":"a"}\n\n: stream closed\n')).toEqual([
      { event: 'message.delta', delta: 'a' },
    ]);
  });
});
