import { describe, expect, test } from 'bun:test';
import { FetchHermesDashboardApiClient, NativeHermesDashboardApiClient } from './hermesDashboardApiClient';

describe('hermesDashboardApiClient', () => {
  test('native client checks dashboard status through the Tauri command', async () => {
    const calls: Array<{ command: string; args?: Record<string, unknown> }> = [];
    const client = new NativeHermesDashboardApiClient('http://127.0.0.1:9119/', async (command, args) => {
      calls.push({ command, args });
      return { status: 200, body: JSON.stringify({ status: 'ok' }) };
    });

    const status = await client.checkStatus();

    expect(status).toEqual({ ok: true, message: 'Hermes dashboard compatibility ok at http://127.0.0.1:9119' });
    expect(calls).toEqual([
      {
        command: 'hermes_api_request',
        args: {
          method: 'GET',
          url: 'http://127.0.0.1:9119/api/status',
        },
      },
    ]);
  });

  test('native client skips protected dashboard endpoints when no session token is available', async () => {
    const calls: Array<{ command: string; args?: Record<string, unknown> }> = [];
    const client = new NativeHermesDashboardApiClient('http://127.0.0.1:9119', async (command, args) => {
      calls.push({ command, args });
      return { status: 200, body: JSON.stringify({ ok: true }) };
    });

    await client.listSessions();
    await client.getConfigDefaults();
    await client.getConfigSchema();
    await client.getEnv();
    await client.listSkills();

    expect(calls.map((call) => call.args)).toEqual([
      { method: 'GET', url: 'http://127.0.0.1:9119/api/config/defaults' },
      { method: 'GET', url: 'http://127.0.0.1:9119/api/config/schema' },
    ]);

    const sessions = await client.listSessions();
    expect(sessions).toEqual({
      ok: false,
      status: 401,
      error: 'Hermes dashboard protected endpoint requires an explicit session token.',
    });
  });

  test('native client sends dashboard session token only when explicitly configured', async () => {
    const calls: Array<{ command: string; args?: Record<string, unknown> }> = [];
    const token = crypto.randomUUID();
    const client = new NativeHermesDashboardApiClient(
      'http://127.0.0.1:9119',
      async (command, args) => {
        calls.push({ command, args });
        return { status: 200, body: JSON.stringify({ ok: true }) };
      },
      { sessionToken: token },
    );

    expect(client.hasProtectedAccess()).toBe(true);

    await client.listSessions();
    await client.getSession('session 1');
    await client.listSessionMessages('session 1');
    await client.searchSessions('hello world');
    await client.deleteSession('session 1');
    await client.getConfig();
    await client.getConfigDefaults();
    await client.getConfigSchema();
    await client.updateConfig({ theme: 'companion' });
    await client.getEnv();
    await client.updateEnv({ OPENAI_API_KEY: 'redacted' });
    await client.deleteEnv('OPENAI_API_KEY');
    await client.getLogs();
    await client.getAnalyticsUsage();
    await client.listCronJobs();
    await client.createCronJob({ name: 'daily' });
    await client.pauseCronJob('job 1');
    await client.resumeCronJob('job 1');
    await client.triggerCronJob('job 1');
    await client.deleteCronJob('job 1');
    await client.listSkills();
    await client.toggleSkill({ name: 'research', enabled: false });
    await client.listToolsets();

    expect(calls.map((call) => call.args)).toEqual([
      { method: 'GET', url: 'http://127.0.0.1:9119/api/sessions', headers: { 'X-Hermes-Session-Token': token } },
      { method: 'GET', url: 'http://127.0.0.1:9119/api/sessions/session%201', headers: { 'X-Hermes-Session-Token': token } },
      { method: 'GET', url: 'http://127.0.0.1:9119/api/sessions/session%201/messages', headers: { 'X-Hermes-Session-Token': token } },
      { method: 'GET', url: 'http://127.0.0.1:9119/api/sessions/search?q=hello+world', headers: { 'X-Hermes-Session-Token': token } },
      { method: 'DELETE', url: 'http://127.0.0.1:9119/api/sessions/session%201', headers: { 'X-Hermes-Session-Token': token } },
      { method: 'GET', url: 'http://127.0.0.1:9119/api/config', headers: { 'X-Hermes-Session-Token': token } },
      { method: 'GET', url: 'http://127.0.0.1:9119/api/config/defaults' },
      { method: 'GET', url: 'http://127.0.0.1:9119/api/config/schema' },
      { method: 'PUT', url: 'http://127.0.0.1:9119/api/config', body: { theme: 'companion' }, headers: { 'Content-Type': 'application/json', 'X-Hermes-Session-Token': token } },
      { method: 'GET', url: 'http://127.0.0.1:9119/api/env', headers: { 'X-Hermes-Session-Token': token } },
      { method: 'PUT', url: 'http://127.0.0.1:9119/api/env', body: { OPENAI_API_KEY: 'redacted' }, headers: { 'Content-Type': 'application/json', 'X-Hermes-Session-Token': token } },
      { method: 'DELETE', url: 'http://127.0.0.1:9119/api/env', body: { key: 'OPENAI_API_KEY' }, headers: { 'Content-Type': 'application/json', 'X-Hermes-Session-Token': token } },
      { method: 'GET', url: 'http://127.0.0.1:9119/api/logs', headers: { 'X-Hermes-Session-Token': token } },
      { method: 'GET', url: 'http://127.0.0.1:9119/api/analytics/usage', headers: { 'X-Hermes-Session-Token': token } },
      { method: 'GET', url: 'http://127.0.0.1:9119/api/cron/jobs', headers: { 'X-Hermes-Session-Token': token } },
      { method: 'POST', url: 'http://127.0.0.1:9119/api/cron/jobs', body: { name: 'daily' }, headers: { 'Content-Type': 'application/json', 'X-Hermes-Session-Token': token } },
      { method: 'POST', url: 'http://127.0.0.1:9119/api/cron/jobs/job%201/pause', headers: { 'X-Hermes-Session-Token': token } },
      { method: 'POST', url: 'http://127.0.0.1:9119/api/cron/jobs/job%201/resume', headers: { 'X-Hermes-Session-Token': token } },
      { method: 'POST', url: 'http://127.0.0.1:9119/api/cron/jobs/job%201/trigger', headers: { 'X-Hermes-Session-Token': token } },
      { method: 'DELETE', url: 'http://127.0.0.1:9119/api/cron/jobs/job%201', headers: { 'X-Hermes-Session-Token': token } },
      { method: 'GET', url: 'http://127.0.0.1:9119/api/skills', headers: { 'X-Hermes-Session-Token': token } },
      { method: 'PUT', url: 'http://127.0.0.1:9119/api/skills/toggle', body: { name: 'research', enabled: false }, headers: { 'Content-Type': 'application/json', 'X-Hermes-Session-Token': token } },
      { method: 'GET', url: 'http://127.0.0.1:9119/api/tools/toolsets', headers: { 'X-Hermes-Session-Token': token } },
    ]);
  });

  test('fetch client reports dashboard unavailability without exposing secret payloads', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: { message: 'dashboard unavailable' }, secret: 'should-not-log' }), {
        status: 503,
        headers: { 'content-type': 'application/json' },
      });

    try {
      const status = await new FetchHermesDashboardApiClient('http://127.0.0.1:9119').checkStatus();
      expect(status.ok).toBe(false);
      expect(status.message).toBe('dashboard unavailable');
      expect(status.message).not.toContain('should-not-log');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
