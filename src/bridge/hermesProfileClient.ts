import { normalizeBaseUrl } from './hermesApiClient';
import type { HermesDataSource, HermesProfileClient, HermesProfileListResult, HermesProfileMetadata } from './types';

interface HermesProfileCliResponse {
  status: number;
  stdout: string;
  stderr: string;
}

type HermesProfileInvoker = <T>(command: string, args?: Record<string, unknown>) => Promise<T>;

const profileRoutingReason = '/v1/runs does not expose a verified selected-profile parameter.';
const cliProfileRunReason = 'Verified CLI route: hermes -p <profile> -z <prompt> scopes execution without changing sticky active profile.';

export class NativeHermesProfileClient implements HermesProfileClient {
  constructor(private readonly invokeCommand: HermesProfileInvoker) {}

  async listProfiles(): Promise<HermesProfileListResult> {
    try {
      const response = await this.invokeCommand<HermesProfileCliResponse>('hermes_profile_list');
      if (response.status !== 0) {
        return unavailableResult(`hermes profile list exited with ${response.status}: ${response.stderr || response.stdout}`);
      }
      const parsed = parseHermesProfileListTable(response.stdout);
      if (parsed.profiles.length === 0) {
        return unavailableResult('hermes profile list returned no profiles.');
      }
      const routing = await this.profileRouteStatus();
      return {
        ok: true,
        profiles: parsed.profiles.map((profile) => ({
          ...profile,
          executionRouting: routing.supported ? 'supported' : 'unsupported',
          unavailableReason: routing.supported ? undefined : routing.reason,
        })),
        activeProfileId: parsed.activeProfileId,
        source: 'cli',
        message: `${parsed.profiles.length} profiles discovered with hermes profile list.`,
        executionRouting: routing.supported ? 'supported' : 'unsupported',
        executionRoutingReason: routing.reason,
        executionRoutingSource: routing.supported ? 'cli' : undefined,
        executionRoutingMode: routing.supported ? 'cli' : undefined,
      };
    } catch (error) {
      return unavailableResult(`hermes profile list failed: ${messageFromUnknown(error)}`);
    }
  }

  private async profileRouteStatus() {
    try {
      const response = await this.invokeCommand<HermesProfileCliResponse>('hermes_profile_route_status');
      const output = `${response.stdout}\n${response.stderr}`;
      if (response.status === 0 && output.includes('--oneshot')) {
        return { supported: true, reason: cliProfileRunReason };
      }
      return { supported: false, reason: 'Hermes CLI did not advertise `-p <profile>` oneshot execution.' };
    } catch (error) {
      return { supported: false, reason: `Hermes CLI selected-profile route probe failed: ${messageFromUnknown(error)}` };
    }
  }
}

export class FetchHermesProfileClient implements HermesProfileClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = normalizeBaseUrl(baseUrl, 'http://127.0.0.1:8765');
  }

  async listProfiles(): Promise<HermesProfileListResult> {
    try {
      const response = await fetch(`${this.baseUrl}/profiles`);
      const payload = await response.json();
      if (!response.ok) {
        return unavailableResult(`Hermes Companion sidecar /profiles returned HTTP ${response.status}.`);
      }
      return resultFromSidecarPayload(payload);
    } catch (error) {
      return unavailableResult(`Hermes Companion sidecar /profiles request failed: ${messageFromUnknown(error)}`);
    }
  }
}

export async function createDefaultHermesProfileClient(sidecarBaseUrl: string): Promise<HermesProfileClient> {
  if (isTauriRuntime()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return new NativeHermesProfileClient(invoke);
  }

  return new FetchHermesProfileClient(sidecarBaseUrl);
}

export function parseHermesProfileListTable(text: string) {
  const profiles: HermesProfileMetadata[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (!line.trim()) continue;
    const normalized = line.trimStart();
    if (normalized.toLowerCase().startsWith('profile')) continue;
    if (/^[─\-\s]+$/.test(normalized)) continue;

    const active = normalized.startsWith('◆');
    const withoutMarker = active ? normalized.slice(1).trimStart() : normalized;
    const columns = withoutMarker.split(/\s{2,}/).map((item) => item.trim()).filter(Boolean);
    const name = columns[0];
    if (!name) continue;

    const profile: HermesProfileMetadata = {
      id: slugFromName(name),
      name,
      source: 'cli',
      active,
    };
    const model = normalizeDash(columns[1]);
    const gatewayStatus = normalizeDash(columns[2]);
    const alias = normalizeDash(columns[3]);
    if (model) profile.model = model;
    if (gatewayStatus) profile.gatewayStatus = gatewayStatus;
    if (alias) profile.alias = alias;
    profiles.push(profile);
  }

  return {
    profiles,
    activeProfileId: profiles.find((profile) => profile.active)?.id,
  };
}

function resultFromSidecarPayload(payload: unknown): HermesProfileListResult {
  if (!payload || typeof payload !== 'object') {
    return unavailableResult('Hermes Companion sidecar returned invalid profile payload.');
  }
  const candidate = payload as Record<string, unknown>;
  const source = dataSource(candidate.source) ?? 'sidecar';
  const executionRouting = routingStatus(candidate.execution_routing) ?? 'unsupported';
  const executionRoutingReason = stringField(candidate.execution_routing_reason) ?? profileRoutingReason;
  const executionRoutingSource = dataSource(candidate.execution_routing_source);
  const executionRoutingMode = routingMode(candidate.execution_routing_mode);
  const rawProfiles = Array.isArray(candidate.profiles) ? candidate.profiles : [];
  const profiles = rawProfiles
    .map((item) => profileFromUnknown(item, source, executionRouting, executionRoutingReason))
    .filter((profile): profile is HermesProfileMetadata => Boolean(profile));
  if (profiles.length === 0) {
    return unavailableResult(stringField(candidate.unavailable_reason) ?? 'Hermes Companion sidecar returned no profiles.');
  }
  return {
    ok: true,
    profiles,
    activeProfileId: stringField(candidate.active_profile_id) ?? profiles.find((profile) => profile.active)?.id,
    source,
    message: `${profiles.length} profiles discovered from ${source}.`,
    executionRouting,
    executionRoutingReason,
    executionRoutingSource,
    executionRoutingMode,
  };
}

function profileFromUnknown(
  item: unknown,
  source: HermesDataSource,
  executionRouting: HermesProfileMetadata['executionRouting'] = 'unsupported',
  executionRoutingReason = profileRoutingReason,
) {
  if (!item || typeof item !== 'object') return undefined;
  const candidate = item as Record<string, unknown>;
  const name = stringField(candidate.name) ?? stringField(candidate.id);
  if (!name) return undefined;
  const profile: HermesProfileMetadata = {
    id: stringField(candidate.id) ?? slugFromName(name),
    name,
    source,
    active: candidate.active === true,
    executionRouting,
  };
  if (executionRouting !== 'supported') profile.unavailableReason = executionRoutingReason;
  const model = stringField(candidate.model);
  const alias = stringField(candidate.alias);
  const gatewayStatus = stringField(candidate.gateway_status) ?? stringField(candidate.gatewayStatus);
  if (model) profile.model = model;
  if (alias) profile.alias = alias;
  if (gatewayStatus) profile.gatewayStatus = gatewayStatus;
  return profile;
}

function routingStatus(value: unknown): HermesProfileMetadata['executionRouting'] | undefined {
  return value === 'supported' || value === 'unsupported' || value === 'unknown' ? value : undefined;
}

function routingMode(value: unknown): HermesProfileListResult['executionRoutingMode'] | undefined {
  return value === 'request' || value === 'session' || value === 'cli' || value === 'sidecar' || value === 'unavailable' ? value : undefined;
}

function unavailableResult(message: string): HermesProfileListResult {
  return {
    ok: false,
    profiles: [],
    source: 'unavailable',
    message,
    executionRouting: 'unsupported',
    executionRoutingReason: profileRoutingReason,
  };
}

function dataSource(value: unknown): HermesDataSource | undefined {
  const allowed: HermesDataSource[] = ['public-rest', 'gateway-rest', 'cli', 'local-state', 'local-hermes-state', 'sidecar', 'dashboard-compatibility', 'companion-owned', 'mock-fallback', 'unavailable', 'cli-pty'];
  return typeof value === 'string' && allowed.includes(value as HermesDataSource) ? value as HermesDataSource : undefined;
}

function normalizeDash(value: string | undefined) {
  if (!value || value === '-' || value === '—') return undefined;
  return value;
}

function stringField(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function slugFromName(name: string) {
  return name.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'profile';
}

function messageFromUnknown(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function isTauriRuntime() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}
