import { describe, expect, test } from 'bun:test';
import { NativeHermesProfileRunClient } from './hermesProfileRunClient';

describe('hermesProfileRunClient', () => {
  test('runs selected profile tasks through native Hermes CLI command', async () => {
    const calls: Array<{ command: string; args?: Record<string, unknown> }> = [];
    const client = new NativeHermesProfileRunClient(async (command, args) => {
      calls.push({ command, args });
      return { status: 0, stdout: 'profile output\n', stderr: '' };
    });

    const result = await client.runTask({
      input: 'hello',
      instructions: 'be brief',
      sessionId: 'task-1',
      profile: { id: 'frieren', name: 'frieren', source: 'cli', executionRouting: 'supported' },
    });

    expect(result.ok).toBe(true);
    expect(result.output).toBe('profile output');
    expect(result.profileContext).toEqual({
      profileId: 'frieren',
      profileName: 'frieren',
      source: 'cli',
      routingSource: 'cli',
      routingMode: 'cli',
      sessionId: 'task-1',
      verified: true,
    });
    expect(calls).toEqual([
      {
        command: 'hermes_profile_run',
        args: {
          profile: 'frieren',
          input: 'hello',
          instructions: 'be brief',
        },
      },
    ]);
  });
});
