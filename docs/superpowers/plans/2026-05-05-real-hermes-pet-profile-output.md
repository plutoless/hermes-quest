# Real Hermes Pet Profile Output Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pet Mode must show the real active Hermes profile name and must not show bridge-authored operational text such as "Started Hermes API run." as if Hermes said it.

**Architecture:** Keep the UI-facing bridge contract stable and fix the real Hermes adapter plus the Pet Mode response selector. The local Hermes API currently returns only `{"status":"ok","platform":"hermes-agent"}` from `/health`, and `/v1/profile`, `/v1/profiles`, and `/v1/agents` return 404, so the implementation must support an explicit real-profile display name in bridge config while also accepting profile metadata if the API later exposes it. Pet Mode should prefer returned Hermes output, Hermes-provided progress text, and error text over Guild/bridge lifecycle narration.

**Tech Stack:** React 19, TypeScript, Bun test, Vite, Tauri 2 bridge client.

---

## File Structure

- Modify `src/bridge/types.ts`: extend bridge config with `realProfileName` and extend Hermes health/run-event typing with optional profile metadata fields.
- Modify `src/bridge/hermesApiClient.ts`: parse likely Hermes profile fields from `/health` and profile-bearing run events without hard depending on one exact response shape.
- Modify `src/bridge/hermesApiClient.test.ts`: prove profile metadata parsing works for native and browser health checks.
- Modify `src/bridge/bridgeFactory.ts`: persist and sanitize the real profile display name.
- Modify `src/bridge/realHermesBridge.ts`: seed real-mode agents from config/API profile metadata when available, remove pet-visible synthetic Hermes lifecycle messages, and preserve operational timeline only as Guild/bridge-owned data.
- Modify `src/bridge/bridgeFactory.test.ts`: add bridge-config, real profile naming, and pet-visible output cleanliness tests.
- Modify `src/App.tsx`: filter Pet Mode derived messages so bridge/Guild operational strings do not become agent bubbles; only show real Hermes returned text, meaningful Hermes event text, report output, or errors.
- Modify `docs/API_CONTRACT.md`: document that Pet Mode messages are not raw timeline dumps and that real profile display names are bridge-derived from Hermes metadata when available.
- Modify `docs/EXECUTION_LOG.md`: record implementation evidence and any remaining Hermes API metadata gaps.

## Decisions

- Real profile name source priority: bridge config `realProfileName` first, `/health` metadata second, run-event metadata if available later, then a truthful fallback label.
- Fallback label should not be `Hermes Builder`. Use `Hermes profile` for the active real profile if no name is available.
- Add a compact bridge-settings field for the real profile display name so users can set the actual local Hermes profile name today, because the currently running Hermes API does not expose it.
- Keep the existing three role slots only if the UI still needs role cards, but the active Pet Mode name must come from real Hermes metadata, not the Builder preset.
- Do not send unsupported profile-routing fields to `/v1/runs`; current docs say `/v1/runs` does not expose a profile parameter.
- Task detail timeline may keep operational Guild events, but Pet Mode chat bubbles must not present bridge narration as Hermes output.

## Task 1: Add Real Profile Display Name Config And Metadata Parsing

**Files:**
- Modify: `src/bridge/types.ts`
- Modify: `src/bridge/bridgeFactory.ts`
- Modify: `src/bridge/hermesApiClient.ts`
- Modify: `src/bridge/hermesApiClient.test.ts`
- Modify: `src/bridge/bridgeFactory.test.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write failing bridge-config and health profile tests**

Add this test to `src/bridge/bridgeFactory.test.ts`:

```ts
test('bridge config preserves real profile display name', () => {
  localStorage.setItem(
    'hermes-guild.bridge-config',
    JSON.stringify({
      bridgeMode: 'real',
      hermesApiBaseUrl: 'http://127.0.0.1:8642/',
      realProfileName: 'Daily Driver',
    }),
  );

  expect(loadBridgeConfig()).toEqual({
    bridgeMode: 'real',
    hermesApiBaseUrl: 'http://127.0.0.1:8642',
    realProfileName: 'Daily Driver',
  });
});
```

Add these tests to `src/bridge/hermesApiClient.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the focused tests and verify they fail**

Run:

```bash
bun test src/bridge/hermesApiClient.test.ts
bun test src/bridge/bridgeFactory.test.ts
```

Expected: the new tests fail because `BridgeConfig` does not include `realProfileName`, `HermesHealth` does not include `profile`, and `healthFromHttpResponse()` drops profile metadata.

- [ ] **Step 3: Extend bridge config and health types**

In `src/bridge/types.ts`, update `BridgeConfig`, then add this interface before `HermesHealth` and extend `HermesHealth`:

```ts
export interface BridgeConfig {
  bridgeMode: BridgeMode;
  hermesApiBaseUrl: string;
  realProfileName?: string;
}
```

```ts
export interface HermesProfileMetadata {
  id: string;
  name: string;
}

export interface HermesHealth {
  ok: boolean;
  message: string;
  profile?: HermesProfileMetadata;
}
```

Keep existing `HermesApiRunEvent` shape but add optional profile fields:

```ts
  profile?: { id?: unknown; name?: unknown } | string;
  active_profile?: { id?: unknown; name?: unknown } | string;
  profile_id?: string;
  profile_name?: string;
```

- [ ] **Step 4: Persist and sanitize real profile display name**

In `src/bridge/bridgeFactory.ts`, add `realProfileName` to `defaultConfig`:

```ts
const defaultConfig: BridgeConfig = {
  bridgeMode: 'auto',
  hermesApiBaseUrl: 'http://127.0.0.1:8642',
  realProfileName: '',
};
```

Update `sanitizeConfig()`:

```ts
  const realProfileName = typeof candidate.realProfileName === 'string'
    ? candidate.realProfileName.trim()
    : defaultConfig.realProfileName;

  return {
    bridgeMode,
    hermesApiBaseUrl,
    realProfileName,
  };
```

- [ ] **Step 5: Add real profile display name field to bridge settings**

In `src/App.tsx`, inside `BridgeStatusDetails`, add this label next to the Hermes API base URL controls or after the bridge mode selector:

```tsx
<label>
  Real profile name
  <PixelInput
    value={config.realProfileName ?? ''}
    onChange={(realProfileName) => onConfigChange({ ...config, realProfileName })}
    placeholder="Hermes profile"
    ariaLabel="Real Hermes profile name"
  />
</label>
```

If `BridgeStatusDetails` currently lacks a Hermes API base URL field, do not add a broader settings redesign; add only this compact label and keep existing Save behavior.

- [ ] **Step 6: Parse profile metadata in the API client**

In `src/bridge/hermesApiClient.ts`, import the new type:

```ts
import type {
  HermesApiClient,
  HermesApiRunEvent,
  HermesApiRunTaskInput,
  HermesApiRunTaskResult,
  HermesHealth,
  HermesProfileMetadata,
} from './types';
```

Add helpers near `healthFromHttpResponse()`:

```ts
function profileFromBody(body: unknown): HermesProfileMetadata | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const candidate = body as Record<string, unknown>;
  return (
    profileFromUnknown(candidate.profile, 'profile') ??
    profileFromUnknown(candidate.active_profile, 'active-profile') ??
    profileFromPair(candidate.profile_id, candidate.profile_name) ??
    profileFromPair(candidate.active_profile_id, candidate.active_profile_name)
  );
}

function profileFromUnknown(value: unknown, fallbackId: string): HermesProfileMetadata | undefined {
  if (typeof value === 'string' && value.trim()) {
    return { id: fallbackId, name: value.trim() };
  }
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as Record<string, unknown>;
  return profileFromPair(candidate.id, candidate.name) ?? profileFromPair(candidate.slug, candidate.display_name);
}

function profileFromPair(idValue: unknown, nameValue: unknown): HermesProfileMetadata | undefined {
  const name = typeof nameValue === 'string' ? nameValue.trim() : '';
  if (!name) return undefined;
  const id = typeof idValue === 'string' && idValue.trim() ? idValue.trim() : slugFromName(name);
  return { id, name };
}

function slugFromName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'profile';
}
```

Update `healthFromHttpResponse()`:

```ts
function healthFromHttpResponse(response: HermesApiHttpResponse, baseUrl: string): HermesHealth {
  if (response.status < 200 || response.status >= 300) {
    return { ok: false, message: `Hermes API health returned HTTP ${response.status}.` };
  }
  const body = parseJson(response.body);
  const status = typeof body.status === 'string' ? body.status : 'unknown';
  const platform = typeof body.platform === 'string' ? body.platform : 'Hermes API';
  const profile = profileFromBody(body);
  return status === 'ok'
    ? { ok: true, message: `${platform} health ok at ${baseUrl}`, profile }
    : { ok: false, message: `${platform} health status: ${status}`, profile };
}
```

- [ ] **Step 7: Run the focused tests and verify they pass**

Run:

```bash
bun test src/bridge/hermesApiClient.test.ts
bun test src/bridge/bridgeFactory.test.ts
```

Expected: all focused tests pass.

- [ ] **Step 8: Commit Task 1**

```bash
git add src/bridge/types.ts src/bridge/bridgeFactory.ts src/bridge/hermesApiClient.ts src/bridge/hermesApiClient.test.ts src/bridge/bridgeFactory.test.ts src/App.tsx
git commit -m "fix: configure real Hermes profile display name"
```

## Task 2: Make Real Bridge Use Real Profile Name

**Files:**
- Modify: `src/bridge/realHermesBridge.ts`
- Modify: `src/bridge/bridgeFactory.ts`
- Modify: `src/bridge/bridgeFactory.test.ts`

- [ ] **Step 1: Write failing factory/bridge tests**

Add these tests to `src/bridge/bridgeFactory.test.ts`:

```ts
test('real mode names the active agent from configured real profile name', async () => {
  const bridge = await createBridgeFromConfig(
    { bridgeMode: 'real', hermesApiBaseUrl: 'http://127.0.0.1:8642', realProfileName: 'Daily Driver' },
    {
      apiClient: {
        checkHealth: async () => ({ ok: true, message: 'Hermes API healthy' }),
        runTask: async () => ({ ok: true, output: 'Done.', events: [] }),
      },
    },
  );

  const snapshot = bridge.getSnapshot();
  const activeAgent = snapshot.agents.find((agent) => agent.id === snapshot.activeProfileId);

  expect(activeAgent?.id).toBe('real-profile');
  expect(activeAgent?.name).toBe('Daily Driver');
  expect(activeAgent?.activeInPet).toBe(true);
  expect(snapshot.activeProfileId).toBe('real-profile');
  expect(snapshot.systemStatus.logsSummary).toContain('Daily Driver');
});

test('real mode falls back to a truthful profile label instead of Hermes Builder', async () => {
  const bridge = await createBridgeFromConfig(
    { bridgeMode: 'real', hermesApiBaseUrl: 'http://127.0.0.1:8642' },
    {
      apiClient: {
        checkHealth: async () => ({ ok: true, message: 'Hermes API healthy' }),
        runTask: async () => ({ ok: true, output: 'Done.', events: [] }),
      },
    },
  );

  const snapshot = bridge.getSnapshot();
  const activeAgent = snapshot.agents.find((agent) => agent.id === snapshot.activeProfileId);

  expect(activeAgent?.name).toBe('Hermes profile');
  expect(activeAgent?.name).not.toBe('Hermes Builder');
});
```

- [ ] **Step 2: Run the bridge factory tests and verify failure**

Run:

```bash
bun test src/bridge/bridgeFactory.test.ts
```

Expected: tests fail because `RealHermesBridge` always seeds `builder` / `Hermes Builder`.

- [ ] **Step 3: Add profile application API to RealHermesBridge**

In `src/bridge/realHermesBridge.ts`, import `HermesProfileMetadata`:

```ts
import type {
  BridgeConfig,
  HermesApiClient,
  HermesApiRunEvent,
  HermesBridgeApi,
  HermesHealth,
  HermesProfileMetadata,
  Listener,
} from './types';
```

Add a method to the class:

```ts
  applyHermesProfile(profile: HermesProfileMetadata | undefined) {
    const configuredName = this.config.realProfileName?.trim();
    const realProfile = configuredName
      ? { id: 'real-profile', name: configuredName }
      : profile ?? { id: 'hermes-profile', name: 'Hermes profile' };
    const activeAgent: Agent = {
      id: realProfile.id,
      name: realProfile.name,
      role: 'Builder',
      status: 'idle',
      availability: 'available',
      activeInPet: true,
      traits: ['Execution', 'Planning', 'Reliability'],
      bestFor: 'real Hermes API execution',
      avoid: 'unsupported profile routing claims',
        health: configuredName ? 'Configured real Hermes profile name' : 'Mapped from Hermes API metadata',
      equipment: ['Hermes API server', 'Workspace tools'],
      skills: [],
    };

    this.snapshot.activeProfileId = activeAgent.id;
    this.snapshot.agents = [activeAgent];
    this.snapshot.systemStatus = {
      ...this.snapshot.systemStatus,
      logsSummary: `${this.snapshot.systemStatus.logsSummary} Active Hermes profile: ${activeAgent.name}.`,
      warnings: this.snapshot.systemStatus.warnings.filter((warning) => !warning.includes('Profile mapping is not sent')),
    };
  }
```

- [ ] **Step 4: Apply profile metadata in bridge factory**

In `src/bridge/bridgeFactory.ts`, after the real bridge health check:

```ts
  const realBridge = new RealHermesBridge(sanitized, apiClient);
  const health = await realBridge.getHealth?.();
  realBridge.applyHermesProfile(health?.profile);
```

Keep the existing real/auto health status branches after this call.

- [ ] **Step 5: Run the bridge factory tests and verify pass**

Run:

```bash
bun test src/bridge/bridgeFactory.test.ts
```

Expected: tests pass and existing auto/real fallback behavior remains intact.

- [ ] **Step 6: Commit Task 2**

```bash
git add src/bridge/realHermesBridge.ts src/bridge/bridgeFactory.ts src/bridge/bridgeFactory.test.ts
git commit -m "fix: show real Hermes profile name"
```

## Task 3: Stop Pet Mode From Showing Bridge Narration

**Files:**
- Modify: `src/bridge/realHermesBridge.ts`
- Modify: `src/App.tsx`
- Modify: `src/bridge/bridgeFactory.test.ts`

- [ ] **Step 1: Write failing real-output cleanliness test**

Add this test to `src/bridge/bridgeFactory.test.ts`:

```ts
test('real task timeline keeps pet-visible Hermes output free of synthetic run narration', async () => {
  const bridge = await createBridgeFromConfig(
    { bridgeMode: 'real', hermesApiBaseUrl: 'http://127.0.0.1:8642' },
    {
      apiClient: {
        checkHealth: async () => ({
          ok: true,
          message: 'Hermes API healthy',
          profile: { id: 'daily-driver', name: 'Daily Driver' },
        }),
        runTask: async () => ({
          ok: true,
          output: 'This is the real Hermes answer.',
          events: [
            { event: 'message.delta', delta: 'This is the real Hermes answer.' },
            { event: 'run.completed', output: 'This is the real Hermes answer.' },
          ],
        }),
      },
    },
  );

  const taskId = bridge.createTask({ brief: 'Say something useful.', assigneeId: 'daily-driver', type: 'pet' });
  await new Promise((resolve) => setTimeout(resolve, 0));

  const task = await bridge.getTask?.(taskId);
  const messages = task?.timeline.map((event) => event.message) ?? [];

  expect(messages).toContain('This is the real Hermes answer.');
  expect(messages).not.toContain('Started Hermes API run.');
  expect(messages).not.toContain('Hermes API streamed response text.');
  expect(messages).not.toContain('Hermes API run completed.');
});
```

- [ ] **Step 2: Run the focused test and verify failure**

Run:

```bash
bun test src/bridge/bridgeFactory.test.ts
```

Expected: the test fails because the current bridge inserts synthetic strings such as `Started Hermes API run.` and `Hermes API streamed response text.`

- [ ] **Step 3: Remove synthetic Hermes narration from real bridge**

In `src/bridge/realHermesBridge.ts`, change the start update in `runHermesTask()` from:

```ts
timeline: [...task.timeline, this.timeline(task.id, task.assigneeId, 'started', 'Started Hermes API run.', 'hermes')],
```

to:

```ts
timeline: task.timeline,
```

Update `timelineForRunEvent()` so it only returns real event text:

```ts
  private timelineForRunEvent(task: Task, event: HermesApiRunEvent): TimelineEvent | undefined {
    const messageText = this.textFromRunEvent(event);
    if (!messageText) return undefined;
    return this.timeline(task.id, task.assigneeId, 'progress', messageText, 'hermes');
  }

  private textFromRunEvent(event: HermesApiRunEvent) {
    const text =
      typeof event.text === 'string' ? event.text :
      typeof event.preview === 'string' ? event.preview :
      typeof event.delta === 'string' ? event.delta :
      undefined;
    return text?.trim();
  }
```

In `completeTask()`, remove these synthetic timeline additions:

```ts
this.timeline(task.id, task.assigneeId, 'artifact', 'Captured final Hermes output as a review artifact.', 'hermes'),
this.timeline(task.id, task.assigneeId, 'completed', 'Hermes API run completed.', 'hermes'),
```

Replace them with the actual final output:

```ts
this.timeline(task.id, task.assigneeId, 'completed', finalOutput, 'hermes'),
this.timeline(task.id, task.assigneeId, 'review_required', 'Quest Report Card is ready for review.', 'guild'),
```

- [ ] **Step 4: Add a Pet Mode response filter**

In `src/App.tsx`, add this helper near `getPetAgentResponse()`:

```ts
function isPetVisibleTimelineEvent(event: TimelineEvent) {
  if (event.source === 'guild' || event.source === 'bridge') return false;
  const normalized = event.message.toLowerCase();
  return ![
    'started hermes api run',
    'hermes api streamed response text',
    'hermes api run completed',
    'captured final hermes output as a review artifact',
  ].some((blocked) => normalized.includes(blocked));
}
```

Update `latestUsefulEvent` in `getPetAgentResponse()`:

```ts
  const latestUsefulEvent = [...trackedTask.timeline]
    .reverse()
    .find((event) => isPetVisibleTimelineEvent(event) && event.message.trim().length > 0);
```

Remove the appended progress suffix for Hermes text. Replace:

```ts
    const eventText =
      latestUsefulEvent.type === 'completed' || latestUsefulEvent.type === 'review_required'
        ? latestUsefulEvent.message
        : `${latestUsefulEvent.message} (${trackedTask.progress}%)`;
```

with:

```ts
    const eventText = latestUsefulEvent.message;
```

- [ ] **Step 5: Run the focused tests**

Run:

```bash
bun test src/bridge/bridgeFactory.test.ts
```

Expected: tests pass and the real task timeline includes actual returned Hermes text, not synthetic run lifecycle labels.

- [ ] **Step 6: Commit Task 3**

```bash
git add src/bridge/realHermesBridge.ts src/App.tsx src/bridge/bridgeFactory.test.ts
git commit -m "fix: keep pet bubbles grounded in Hermes output"
```

## Task 4: Update Contract Docs And Execution Log

**Files:**
- Modify: `docs/API_CONTRACT.md`
- Modify: `docs/EXECUTION_LOG.md`

- [ ] **Step 1: Update API contract**

Add this section to `docs/API_CONTRACT.md` after `TimelineEvent`:

```md
### Pet-Visible Message Selection

Pet Mode is not a raw timeline renderer. It may use task timeline and report data as inputs, but pet chat bubbles should only show:

- user-submitted text
- actual Hermes returned output
- Hermes-provided progress text when an event includes text, preview, or delta content
- concise error text
- report-ready prompts

Pet Mode should not show bridge lifecycle narration such as run-start, run-complete, artifact-capture, or routing labels as if the active profile said them.
```

Add this bullet under `Agent`:

```md
- In real mode, `name` should use the configured real profile display name first, then Hermes API profile metadata when available; if both are unavailable, use a truthful generic label rather than a Guild role preset.
```

- [ ] **Step 2: Update execution log**

Append this entry to `docs/EXECUTION_LOG.md`:

```md
### 2026-05-05 CST — Real Hermes profile name and Pet output grounding plan

Goal: Make Pet Mode show the real Hermes profile name and prevent bridge-authored operational labels from appearing as agent chat.

Planned changes:

- Parse optional profile metadata from Hermes health responses.
- Add a bridge-configured real profile display name because the current local Hermes API health response does not expose profile identity.
- Apply configured/API profile metadata to the active real-mode bridge agent.
- Remove synthetic Hermes lifecycle messages from pet-visible real bridge output.
- Filter Pet Mode derived responses so Guild/bridge timeline narration does not become chat bubbles.
- Keep unsupported `/v1/runs` profile routing out of scope.

Verification targets:

- `bun test src/bridge/hermesApiClient.test.ts`
- `bun test src/bridge/bridgeFactory.test.ts`
- `bun run verify:web`
- Manual Pet Mode check in real mode with a running Hermes API server.
```

- [ ] **Step 3: Commit Task 4**

```bash
git add docs/API_CONTRACT.md docs/EXECUTION_LOG.md
git commit -m "docs: define pet-visible real Hermes output"
```

## Task 5: Final Verification

**Files:**
- No new source files.

- [ ] **Step 1: Run full web verification**

Run:

```bash
bun run verify:web
```

Expected: Tauri config check, TypeScript, Bun tests, and production build pass.

- [ ] **Step 2: Run native checks where available**

Run:

```bash
cd src-tauri && cargo fmt --check
cd src-tauri && cargo check
```

Expected: both pass if Rust/Tauri prerequisites are installed. If they fail because prerequisites are missing, record the exact failure in `docs/EXECUTION_LOG.md`.

- [ ] **Step 3: Manual real-mode Pet Mode check**

With a real Hermes API server running at the configured base URL, open:

```text
http://127.0.0.1:1420/?mode=pet&variant=skyship-command-deck&pet=expanded
```

Expected:

- The pet speaker label uses the configured real profile name when set.
- If `/health` has no profile name and no configured real profile name is set, the label is `Hermes profile`, not `Hermes Builder`.
- After sending a message, the pet bubble shows the returned Hermes text.
- The pet bubble does not show `Started Hermes API run.`, `Hermes API streamed response text.`, or `Hermes API run completed.`

- [ ] **Step 4: Final commit if verification docs changed**

```bash
git add docs/EXECUTION_LOG.md
git commit -m "docs: record real Hermes pet verification"
```

## Acceptance Criteria

- `src/bridge/hermesApiClient.test.ts` proves profile metadata is parsed from `/health` when the API exposes it.
- `src/bridge/bridgeFactory.test.ts` proves real-mode active profile name comes from bridge config when set.
- Real-mode fallback active profile label is `Hermes profile`, not `Hermes Builder`.
- Pet Mode no longer turns synthetic run lifecycle text into agent chat bubbles.
- Pet Mode still shows actual returned Hermes output after a real task completes.
- Existing mock, auto fallback, approve/revise, and task submission tests still pass.
- `bun run verify:web` passes.
- Native `cargo fmt --check` and `cargo check` pass, or exact prerequisite blockers are documented.

## Non-Goals

- Do not build multiple real Hermes profile routing.
- Do not add unsupported profile parameters to `/v1/runs`.
- Do not redesign Pet Mode visuals.
- Do not remove task timeline visibility from Guild Hall or Quest Board.
- Do not change mock profile names or mock lifecycle behavior unless a shared test requires a small compatibility adjustment.
