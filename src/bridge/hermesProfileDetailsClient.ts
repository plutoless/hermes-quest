import { normalizeBaseUrl } from './hermesApiClient';
import type { HermesDataSource, HermesProfileDetailsClient, HermesProfileMetadata } from './types';
import type { ProfileDetails, ProfileDetailsSection, ProfileSessionSummary, ProfileSkillSummary, ProfileTextSection } from '../types';

const maxTextLength = 4096;

type HermesProfileDetailsInvoker = <T>(command: string, args?: Record<string, unknown>) => Promise<T>;

export class NativeHermesProfileDetailsClient implements HermesProfileDetailsClient {
  constructor(private readonly invokeCommand: HermesProfileDetailsInvoker) {}

  async getProfileDetails(profile: HermesProfileMetadata): Promise<ProfileDetails> {
    try {
      const payload = await this.invokeCommand<unknown>('hermes_profile_details', {
        profileId: profile.id,
        profileName: profile.name,
      });
      return profileDetailsFromPayload(payload, profile);
    } catch (error) {
      return unavailableProfileDetails(profile, `Hermes profile details command failed: ${messageFromUnknown(error)}`);
    }
  }
}

export class FetchHermesProfileDetailsClient implements HermesProfileDetailsClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = normalizeBaseUrl(baseUrl, 'http://127.0.0.1:8765');
  }

  async getProfileDetails(profile: HermesProfileMetadata): Promise<ProfileDetails> {
    const id = encodeURIComponent(profile.id);
    const name = encodeURIComponent(profile.name);
    try {
      const response = await fetch(`${this.baseUrl}/profiles/${id}/details?name=${name}`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        return unavailableProfileDetails(profile, `Hermes Companion sidecar profile details returned HTTP ${response.status}.`);
      }
      return profileDetailsFromPayload(payload, profile);
    } catch (error) {
      return unavailableProfileDetails(profile, `Hermes Companion sidecar profile details request failed: ${messageFromUnknown(error)}`);
    }
  }
}

export async function createDefaultHermesProfileDetailsClient(sidecarBaseUrl: string): Promise<HermesProfileDetailsClient> {
  if (isTauriRuntime()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return new NativeHermesProfileDetailsClient(invoke);
  }

  return new FetchHermesProfileDetailsClient(sidecarBaseUrl);
}

export function resolveHermesProfileHome(hermesHome: string, profileId: string, profileName: string) {
  const normalizedHome = hermesHome.replace(/\/+$/, '');
  const key = (profileName || profileId).trim();
  if (!key || key === 'default') return normalizedHome;
  return `${normalizedHome}/profiles/${key}`;
}

export function profileDetailsFromPayload(payload: unknown, fallbackProfile?: HermesProfileMetadata): ProfileDetails {
  if (!payload || typeof payload !== 'object') {
    return unavailableProfileDetails(fallbackProfile, 'Hermes profile details payload was invalid.');
  }
  const candidate = payload as Record<string, unknown>;
  const profileId = stringField(candidate.profile_id) || stringField(candidate.profileId) || fallbackProfile?.id || 'profile-unavailable';
  const profileName = stringField(candidate.profile_name) || stringField(candidate.profileName) || fallbackProfile?.name || profileId;
  const source = dataSource(candidate.source) ?? fallbackProfile?.source ?? 'unavailable';
  const unavailableReason = stringField(candidate.unavailable_reason) || stringField(candidate.unavailableReason) || undefined;
  return {
    ok: candidate.ok !== false && !unavailableReason,
    profileId,
    profileName,
    source,
    path: stringField(candidate.path) || undefined,
    soulMd: textSectionFromPayload(candidate.soul_md ?? candidate.soulMd),
    skills: skillsSectionFromPayload(candidate.skills),
    sessions: sessionsSectionFromPayload(candidate.sessions),
    loadedAt: stringField(candidate.loaded_at) || stringField(candidate.loadedAt) || new Date().toISOString(),
    unavailableReason,
  };
}

function textSectionFromPayload(value: unknown): ProfileTextSection {
  if (!value || typeof value !== 'object') {
    return { source: 'unavailable', text: '', unavailableReason: 'SOUL.md details unavailable.' };
  }
  const candidate = value as Record<string, unknown>;
  const rawText = stringField(candidate.text);
  const boundedText = rawText.slice(0, maxTextLength);
  return {
    source: dataSource(candidate.source) ?? 'unavailable',
    path: stringField(candidate.path) || undefined,
    text: boundedText,
    truncated: candidate.truncated === true || rawText.length > maxTextLength,
    unavailableReason: stringField(candidate.unavailable_reason) || stringField(candidate.unavailableReason) || undefined,
  };
}

function skillsSectionFromPayload(value: unknown): ProfileDetailsSection<ProfileSkillSummary> {
  const section = genericSection(value);
  return {
    ...section,
    items: section.items.map((item) => {
      const candidate = item as Record<string, unknown>;
      const name = stringField(candidate.name) || stringField(candidate.id) || 'skill';
      return {
        id: stringField(candidate.id) || slugFromName(name),
        name,
        category: stringField(candidate.category) || undefined,
        description: stringField(candidate.description) || undefined,
        trigger: stringField(candidate.trigger) || undefined,
        enabled: typeof candidate.enabled === 'boolean' ? candidate.enabled : undefined,
        source: dataSource(candidate.source) ?? section.source,
        path: stringField(candidate.path) || undefined,
        unavailableReason: stringField(candidate.unavailable_reason) || undefined,
      };
    }),
  };
}

function sessionsSectionFromPayload(value: unknown): ProfileDetailsSection<ProfileSessionSummary> {
  const section = genericSection(value);
  return {
    ...section,
    items: section.items.map((item) => {
      const candidate = item as Record<string, unknown>;
      const title = stringField(candidate.title) || stringField(candidate.id) || 'session';
      return {
        id: stringField(candidate.id) || slugFromName(title),
        title,
        source: dataSource(candidate.source) ?? section.source,
        path: stringField(candidate.path) || undefined,
        updatedAt: stringField(candidate.updated_at) || stringField(candidate.updatedAt) || undefined,
        messageCount: numberField(candidate.message_count) ?? numberField(candidate.messageCount),
        unavailableReason: stringField(candidate.unavailable_reason) || undefined,
      };
    }),
  };
}

function genericSection(value: unknown): ProfileDetailsSection<Record<string, unknown>> {
  if (!value || typeof value !== 'object') {
    return { source: 'unavailable', items: [], unavailableReason: 'Section unavailable.' };
  }
  const candidate = value as Record<string, unknown>;
  const items = Array.isArray(candidate.items) ? candidate.items.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object')) : [];
  return {
    source: dataSource(candidate.source) ?? 'unavailable',
    path: stringField(candidate.path) || undefined,
    items,
    unavailableReason: stringField(candidate.unavailable_reason) || stringField(candidate.unavailableReason) || undefined,
  };
}

function unavailableProfileDetails(profile: HermesProfileMetadata | undefined, reason: string): ProfileDetails {
  const profileId = profile?.id ?? 'profile-unavailable';
  const profileName = profile?.name ?? 'Profile unavailable';
  return {
    ok: false,
    profileId,
    profileName,
    source: 'unavailable',
    soulMd: { source: 'unavailable', text: '', unavailableReason: reason },
    skills: { source: 'unavailable', items: [], unavailableReason: reason },
    sessions: { source: 'unavailable', items: [], unavailableReason: reason },
    loadedAt: new Date().toISOString(),
    unavailableReason: reason,
  };
}

function dataSource(value: unknown): HermesDataSource | undefined {
  const allowed: HermesDataSource[] = ['public-rest', 'gateway-rest', 'cli', 'local-state', 'local-hermes-state', 'sidecar', 'dashboard-compatibility', 'companion-owned', 'mock-fallback', 'unavailable', 'cli-pty'];
  return typeof value === 'string' && allowed.includes(value as HermesDataSource) ? value as HermesDataSource : undefined;
}

function stringField(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function numberField(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function slugFromName(name: string) {
  return name.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'item';
}

function messageFromUnknown(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function isTauriRuntime() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}
