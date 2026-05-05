import type { HermesApiRunEvent, HermesApiRunTaskInput, HermesApiRunTaskResult } from './types';

interface HermesCliResponse {
  status: number;
  stdout: string;
  stderr: string;
}

type HermesProfileRunInvoker = <T>(command: string, args?: Record<string, unknown>) => Promise<T>;

export class NativeHermesProfileRunClient {
  constructor(private readonly invokeCommand: HermesProfileRunInvoker) {}

  async runTask(input: HermesApiRunTaskInput): Promise<HermesApiRunTaskResult> {
    const profile = input.profile;
    if (!profile?.name) {
      return { ok: false, output: '', error: 'Hermes CLI selected-profile run requires a profile name.', events: [] };
    }
    const profileName = profile.name;
    try {
      const response = await this.invokeCommand<HermesCliResponse>('hermes_profile_run', {
        profile: profileName,
        input: input.input,
        instructions: input.instructions,
      });
      const output = response.stdout.trim();
      const error = response.stderr.trim();
      const runId = `cli-${Date.now().toString(36)}`;
      if (response.status !== 0) {
        return {
          ok: false,
          output,
          error: error || `Hermes CLI selected-profile run exited with status ${response.status}.`,
          runId,
          events: [runEvent('run.failed', runId, profileName, output, error)],
        };
      }
      return {
        ok: true,
        output,
        runId,
        events: [runEvent('run.completed', runId, profileName, output)],
        profileContext: {
          profileId: profile.id,
          profileName,
          source: profile.source,
          routingSource: 'cli',
          routingMode: 'cli',
          sessionId: input.sessionId,
          verified: true,
        },
      };
    } catch (error) {
      return { ok: false, output: '', error: `Hermes CLI selected-profile run failed: ${messageFromUnknown(error)}`, events: [] };
    }
  }
}

export async function createDefaultHermesProfileRunClient(): Promise<NativeHermesProfileRunClient | undefined> {
  if (!isTauriRuntime()) return undefined;
  const { invoke } = await import('@tauri-apps/api/core');
  return new NativeHermesProfileRunClient(invoke);
}

function runEvent(event: string, runId: string, profileName: string, output: string, error?: string): HermesApiRunEvent {
  return {
    event,
    run_id: runId,
    output,
    error,
    profile: profileName,
    profile_routing: 'supported',
    profile_routing_source: 'cli',
    profile_routing_mode: 'cli',
  };
}

function messageFromUnknown(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function isTauriRuntime() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}
