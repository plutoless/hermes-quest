import { describe, expect, test } from 'bun:test';
import { FetchHermesProfileClient, NativeHermesProfileClient, parseHermesProfileListTable } from './hermesProfileClient';

const profileTable = `
 Profile          Model                        Gateway      Alias
 ───────────────    ───────────────────────────    ───────────    ────────────
◆default         gpt-5.5                      stopped      —
 frieren         deepseek-v4-flash            stopped      frieren
 rem             gpt-5.5                      stopped      rem
`;

describe('hermesProfileClient', () => {
  test('parses hermes profile list table with active marker and metadata', () => {
    const result = parseHermesProfileListTable(profileTable);

    expect(result).toEqual({
      profiles: [
        { id: 'default', name: 'default', source: 'cli', active: true, model: 'gpt-5.5', gatewayStatus: 'stopped' },
        { id: 'frieren', name: 'frieren', source: 'cli', active: false, model: 'deepseek-v4-flash', gatewayStatus: 'stopped', alias: 'frieren' },
        { id: 'rem', name: 'rem', source: 'cli', active: false, model: 'gpt-5.5', gatewayStatus: 'stopped', alias: 'rem' },
      ],
      activeProfileId: 'default',
    });
  });

  test('native profile client uses Tauri hermes_profile_list command', async () => {
    const calls: Array<{ command: string; args?: Record<string, unknown> }> = [];
    const client = new NativeHermesProfileClient(async (command, args) => {
      calls.push({ command, args });
      if (command === 'hermes_profile_route_status') {
        return { status: 0, stdout: 'usage: hermes --oneshot PROMPT', stderr: '' };
      }
      return { status: 0, stdout: profileTable, stderr: '' };
    });

    const result = await client.listProfiles();

    expect(calls).toEqual([
      { command: 'hermes_profile_list', args: undefined },
      { command: 'hermes_profile_route_status', args: undefined },
    ]);
    expect(result.ok).toBe(true);
    expect(result.source).toBe('cli');
    expect(result.activeProfileId).toBe('default');
    expect(result.profiles.map((profile) => profile.id)).toEqual(['default', 'frieren', 'rem']);
    expect(result.executionRouting).toBe('supported');
    expect(result.executionRoutingSource).toBe('cli');
    expect(result.executionRoutingMode).toBe('cli');
  });

  test('fetch profile client reads profiles from sidecar compatibility endpoint', async () => {
    const originalFetch = globalThis.fetch;
    const urls: string[] = [];
    globalThis.fetch = (async (url: string) => {
      urls.push(url);
      return new Response(JSON.stringify({
        ok: true,
        source: 'local-state',
        active_profile_id: 'frieren',
        profiles: [
          { id: 'default', name: 'default' },
          { id: 'frieren', name: 'frieren' },
        ],
        execution_routing: 'supported',
        execution_routing_source: 'sidecar',
        execution_routing_mode: 'sidecar',
        execution_routing_reason: 'Verified CLI route.',
      }), { status: 200 });
    }) as typeof fetch;

    try {
      const result = await new FetchHermesProfileClient('http://127.0.0.1:8765/').listProfiles();

      expect(urls).toEqual(['http://127.0.0.1:8765/profiles']);
      expect(result.ok).toBe(true);
      expect(result.source).toBe('local-state');
      expect(result.activeProfileId).toBe('frieren');
      expect(result.profiles.map((profile) => profile.source)).toEqual(['local-state', 'local-state']);
      expect(result.executionRouting).toBe('supported');
      expect(result.executionRoutingSource).toBe('sidecar');
      expect(result.executionRoutingMode).toBe('sidecar');
      expect(result.profiles.every((profile) => profile.executionRouting === 'supported')).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
