import { describe, expect, test } from 'bun:test';
import {
  FetchHermesProfileDetailsClient,
  NativeHermesProfileDetailsClient,
  profileDetailsFromPayload,
  resolveHermesProfileHome,
} from './hermesProfileDetailsClient';

describe('hermesProfileDetailsClient', () => {
  test('resolves default and named profile homes from Hermes home', () => {
    expect(resolveHermesProfileHome('/Users/example/.hermes', 'default', 'default')).toBe('/Users/example/.hermes');
    expect(resolveHermesProfileHome('/Users/example/.hermes', 'frieren', 'frieren')).toBe('/Users/example/.hermes/profiles/frieren');
  });

  test('normalizes bounded read-only detail payloads with per-section sources', () => {
    const result = profileDetailsFromPayload({
      ok: true,
      profile_id: 'frieren',
      profile_name: 'frieren',
      source: 'local-state',
      path: '/Users/example/.hermes/profiles/frieren',
      loaded_at: '2026-05-05T00:00:00.000Z',
      soul_md: {
        source: 'local-state',
        path: '/Users/example/.hermes/profiles/frieren/SOUL.md',
        text: 'a'.repeat(5000),
        truncated: true,
      },
      skills: {
        source: 'local-state',
        items: [{ id: 'research', name: 'research', source: 'local-state', path: '/skills/research' }],
      },
      sessions: {
        source: 'local-state',
        items: [{ id: 'session-1', title: 'session-1', source: 'local-state', path: '/sessions/session-1.json' }],
      },
    });

    expect(result.ok).toBe(true);
    expect(result.profileId).toBe('frieren');
    expect(result.path).toBe('/Users/example/.hermes/profiles/frieren');
    expect(result.soulMd.text.length).toBeLessThanOrEqual(4096);
    expect(result.soulMd.truncated).toBe(true);
    expect(result.skills.items).toEqual([{ id: 'research', name: 'research', source: 'local-state', path: '/skills/research' }]);
    expect(result.sessions.items).toEqual([{ id: 'session-1', title: 'session-1', source: 'local-state', path: '/sessions/session-1.json' }]);
  });

  test('native client calls a read-only Tauri command for profile details', async () => {
    const calls: Array<{ command: string; args?: Record<string, unknown> }> = [];
    const client = new NativeHermesProfileDetailsClient(async (command, args) => {
      calls.push({ command, args });
      return {
        ok: true,
        profile_id: 'default',
        profile_name: 'default',
        source: 'local-state',
        path: '/Users/example/.hermes',
        loaded_at: '2026-05-05T00:00:00.000Z',
        soul_md: { source: 'unavailable', unavailable_reason: 'SOUL.md not found.' },
        skills: { source: 'local-state', items: [] },
        sessions: { source: 'local-state', items: [] },
      };
    });

    const result = await client.getProfileDetails({ id: 'default', name: 'default', source: 'cli' });

    expect(calls).toEqual([
      {
        command: 'hermes_profile_details',
        args: { profileId: 'default', profileName: 'default' },
      },
    ]);
    expect(result.ok).toBe(true);
    expect(result.profileId).toBe('default');
    expect(result.soulMd.unavailableReason).toBe('SOUL.md not found.');
  });

  test('fetch client reads the sidecar profile details endpoint', async () => {
    const originalFetch = globalThis.fetch;
    const urls: string[] = [];
    globalThis.fetch = (async (url: string) => {
      urls.push(url);
      return new Response(JSON.stringify({
        ok: true,
        profile_id: 'frieren',
        profile_name: 'frieren',
        source: 'local-state',
        path: '/Users/example/.hermes/profiles/frieren',
        loaded_at: '2026-05-05T00:00:00.000Z',
        soul_md: { source: 'local-state', text: 'Soul text' },
        skills: { source: 'local-state', items: [] },
        sessions: { source: 'local-state', items: [] },
      }), { status: 200 });
    }) as typeof fetch;

    try {
      const result = await new FetchHermesProfileDetailsClient('http://127.0.0.1:8765/').getProfileDetails({
        id: 'frieren',
        name: 'frieren',
        source: 'cli',
      });

      expect(urls).toEqual(['http://127.0.0.1:8765/profiles/frieren/details?name=frieren']);
      expect(result.ok).toBe(true);
      expect(result.soulMd.text).toBe('Soul text');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
