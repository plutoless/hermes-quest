# Real Hermes Pet Profile And Output Grounding Spec

## Goal

Fix two real-mode Pet Mode issues:

- Pet Mode should show the real active Hermes profile name instead of the hardcoded `Hermes Builder` label.
- Pet Mode message bubbles should only reflect meaningful Hermes-returned output or concise errors, not bridge-authored operational narration such as `Started Hermes API run.`

This pass is a bridge and message-selection fix. It is not a Pet Mode visual redesign.

## User-Approved Requirements

- Remove unnecessary Pet Mode agent text that comes from Guild/bridge lifecycle narration.
- Pet Mode should not display strings like `Started Hermes API run.`, `Hermes API streamed response text.`, or `Hermes API run completed.` as if Hermes said them.
- Pet Mode should show the actual text Hermes returned when a real run produces output.
- Pet Mode should show the real Hermes profile name.
- The real Hermes profile name must come from Hermes API profile metadata, such as `profile.name`, `active_profile.name`, `profile_name`, or equivalent health metadata.
- The current local Hermes API does not expose profile identity through `/health`; `/v1/profile`, `/v1/profiles`, and `/v1/agents` return 404.
- If API profile metadata is unavailable, the real-mode label should be `Profile unavailable`, not `Hermes Builder`, `Hermes profile`, or a manually configured name.

## Current Reality

Real mode currently seeds a fixed Guild role roster:

- `Hermes Researcher`
- `Hermes Builder`
- `Hermes Reviewer`

The active profile defaults to `builder`, so Pet Mode can show `Hermes Builder` even when the real Hermes runtime is a different local profile.

Real mode also creates synthetic timeline entries such as:

- `Started Hermes API run.`
- `Hermes API streamed response text.`
- `Hermes API run completed.`
- `Captured final Hermes output as a review artifact.`

Pet Mode derives response bubbles from task timeline/report data, so these internal lifecycle strings can appear as companion speech. That makes the pet feel noisy and less truthful.

Local API probe on 2026-05-05:

```text
GET /health -> {"status":"ok","platform":"hermes-agent"}
GET /v1/profile -> 404
GET /v1/profiles -> 404
GET /v1/agents -> 404
```

## Scope

In scope:

- Optional parsing of real profile metadata from future Hermes health responses.
- Real bridge active agent naming.
- Removal or filtering of Pet Mode synthetic bridge narration.
- Tests for config parsing, metadata parsing, real profile labels, and real output cleanliness.
- API contract and execution log updates.

Out of scope:

- Multiple real Hermes profiles.
- Unsupported `/v1/runs` profile-routing parameters.
- Guild Hall redesign.
- Pet Mode visual redesign.
- Mock profile renaming.
- New Hermes API endpoints.
- Tavern, Skill Deck, Infirmary, XP, levels, or unrelated RPG systems.

## User-Visible Behavior

### Real Profile Name

In real mode:

- Legacy/manual `realProfileName` config is ignored for speaker identity.
- If Hermes `/health` exposes profile metadata, the bridge uses that as the companion name.
- If API profile metadata is absent, Pet Mode shows `Profile unavailable`.
- Pet Mode must not show `Hermes Builder` or `Hermes profile` as the real-mode fallback.

Bridge settings should keep bridge mode/base configuration only; they must not expose a manual field that can spoof the active Hermes profile name.

### Pet Messages

Pet Mode should show:

- user-submitted text
- actual returned Hermes output
- Hermes-provided progress text when the event includes meaningful `text`, `preview`, or `delta`
- concise errors

Pet Mode should not show:

- app-authored greeting text
- accepted/sending status bubbles such as `I am sending...` or `Quest accepted...`
- report wrapper text such as `Returned output:`
- bridge lifecycle narration
- run-start/run-complete labels
- artifact-capture labels
- assignment/routing labels
- long diagnostics or stack traces

Task detail timelines may still contain Guild-owned lifecycle records where useful, but Pet chat bubbles must not present those records as Hermes speech.

## Likely Files And Systems

Read first:

- `SPEC.md`
- `GOAL.md`
- `docs/superpowers/plans/2026-05-05-real-hermes-pet-profile-output.md`
- `AGENTS.md`
- `src/App.tsx`
- `src/types.ts`
- `src/bridge/types.ts`
- `src/bridge/bridgeFactory.ts`
- `src/bridge/bridgeFactory.test.ts`
- `src/bridge/hermesApiClient.ts`
- `src/bridge/hermesApiClient.test.ts`
- `src/bridge/realHermesBridge.ts`
- `docs/API_CONTRACT.md`
- `docs/EXECUTION_LOG.md`
- `package.json`

Useful discovery commands:

```bash
rg "Hermes Builder|Started Hermes API run|Hermes API streamed|Hermes API run completed|realProfileName" src docs README.md
rg "getPetAgentResponse|latestUsefulEvent|BridgeConfig|healthFromHttpResponse|RealHermesBridge" src
```

## Implementation Notes

- Do not add a manual `BridgeConfig.realProfileName` identity path.
- Do not claim real profile routing; current `/v1/runs` does not expose a profile parameter.
- Keep unsupported routing truth visible in docs, but do not surface it as chatty Pet Mode speech.
- Use API profile metadata when available, otherwise `Profile unavailable`.
- Preserve mock/auto/real modes and existing submit/review flows.
- Preserve unrelated user changes in `src/App.tsx` and `src/styles.css`.

## Edge Cases

- If Hermes health exposes malformed profile metadata, ignore it and use the next fallback.
- If a run returns no output, do not create a Pet agent output bubble from lifecycle narration.
- If a run fails, show the concise Hermes error text.
- If multiple timeline entries exist, Pet Mode should choose the latest meaningful Hermes-returned text or final report output.

## Verification

Focused tests:

```bash
bun test src/bridge/hermesApiClient.test.ts
bun test src/bridge/bridgeFactory.test.ts
```

Full web validation:

```bash
bun run verify:web
```

Native validation where available:

```bash
cd src-tauri && cargo fmt --check
cd src-tauri && cargo check
```

Manual real-mode check with a running Hermes API server:

- Open `/?mode=pet&variant=skyship-command-deck&pet=expanded`.
- Send a Pet Mode message in real mode.
- Confirm the input starts empty and is focused when expanded.
- Confirm the speaker label uses API profile metadata when present, or `Profile unavailable` when absent.
- Confirm the returned bubble contains raw Hermes output without a `Returned output:` prefix.
- Confirm the pet does not show `Started Hermes API run.`, `Hermes API streamed response text.`, or `Hermes API run completed.`

## Done When

This task is done only when all of the following are true:

- Future `/health` profile metadata can be parsed and used when configured name is absent.
- Real mode ignores legacy/manual `realProfileName`.
- Real mode falls back to `Profile unavailable`, not `Hermes Builder` or `Hermes profile`.
- Pet input starts empty and focuses when expanded.
- Pet Mode no longer displays app-authored greeting, sending, accepted, report-ready, or `Returned output:` wrapper text.
- Pet Mode no longer displays synthetic run lifecycle narration as agent speech.
- Pet Mode still displays actual Hermes returned output after completion.
- Pet Mode still displays concise real Hermes errors.
- Mock mode profile names and mock lifecycle behavior remain intact.
- Auto fallback behavior remains intact.
- `docs/API_CONTRACT.md` documents pet-visible message selection and real profile naming.
- `docs/EXECUTION_LOG.md` records implementation evidence and remaining API metadata gaps.
- `bun test src/bridge/hermesApiClient.test.ts`, `bun test src/bridge/bridgeFactory.test.ts`, and `bun run verify:web` pass.
- `cargo fmt --check` and `cargo check` pass where native prerequisites are available, or exact blockers are documented.
