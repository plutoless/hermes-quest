import { describe, expect, test } from 'bun:test';
import { NativeHermesSidecarClient } from './hermesSidecarClient';

describe('hermesSidecarClient', () => {
  test('checks sidecar health through the Tauri request command', async () => {
    const calls: Array<{ command: string; args?: Record<string, unknown> }> = [];
    const client = new NativeHermesSidecarClient('http://127.0.0.1:8765/', async (command, args) => {
      calls.push({ command, args });
      return {
        status: 200,
        body: JSON.stringify({
          ok: true,
          service: 'hermes-guild-sidecar',
          sources: {
            sidecar: { status: 'available' },
          },
        }),
      };
    });

    const status = await client.checkHealth();

    expect(status).toEqual({
      ok: true,
      message: 'Hermes Guild sidecar available at http://127.0.0.1:8765',
      data: {
        ok: true,
        service: 'hermes-guild-sidecar',
        sources: {
          sidecar: { status: 'available' },
        },
      },
    });
    expect(calls).toEqual([
      {
        command: 'hermes_api_request',
        args: {
          method: 'GET',
          url: 'http://127.0.0.1:8765/health',
        },
      },
    ]);
  });

  test('surfaces unavailable sidecar responses without throwing', async () => {
    const client = new NativeHermesSidecarClient('http://127.0.0.1:8765', async () => ({
      status: 503,
      body: JSON.stringify({ error: { message: 'sidecar down' } }),
    }));

    await expect(client.checkHealth()).resolves.toEqual({
      ok: false,
      message: 'Hermes Guild sidecar health returned HTTP 503.',
      data: { error: { message: 'sidecar down' } },
    });
  });

  test('starts selected-profile sidecar runs through the Tauri request command', async () => {
    const calls: Array<{ command: string; args?: Record<string, unknown> }> = [];
    const client = new NativeHermesSidecarClient('http://127.0.0.1:8765', async (command, args) => {
      calls.push({ command, args });
      return {
        status: 200,
        body: JSON.stringify({
          ok: true,
          run_id: 'sidecar-1',
          status: 'completed',
          output: 'profile output',
          profile_context: {
            profile_id: 'frieren',
            profile_name: 'frieren',
            source: 'cli',
            routing_source: 'sidecar',
            routing_mode: 'sidecar',
            session_id: 'task-1',
            verified: true,
          },
          events: [{ event: 'run.completed', output: 'profile output' }],
        }),
      };
    });

    const result = await client.runTask?.({
      input: 'hello',
      instructions: 'be brief',
      sessionId: 'task-1',
      profile: { id: 'frieren', name: 'frieren', source: 'cli', executionRouting: 'supported' },
    });

    expect(result).toEqual({
      ok: true,
      output: 'profile output',
      error: '',
      runId: 'sidecar-1',
      events: [{ event: 'run.completed', output: 'profile output' }],
      profileContext: {
        profileId: 'frieren',
        profileName: 'frieren',
        source: 'cli',
        routingSource: 'sidecar',
        routingMode: 'sidecar',
        sessionId: 'task-1',
        verified: true,
        unavailableReason: undefined,
      },
    });
    expect(calls[0]).toEqual({
      command: 'hermes_api_request',
      args: {
        method: 'POST',
        url: 'http://127.0.0.1:8765/runs',
        body: {
          input: 'hello',
          instructions: 'be brief',
          session_id: 'task-1',
          profile: { id: 'frieren', name: 'frieren' },
        },
      },
    });
  });
});
