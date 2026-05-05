# Hermes Integration Plan

## Goal

Wire Hermes Guild to real Hermes Agent capabilities without making the official Hermes dashboard server a required runtime dependency.

Hermes Guild should use the Hermes Gateway API for execution and stable REST facts, then replicate useful official dashboard backend logic inside the Guild/Tauri bridge for local Hermes state.

## Architecture

- Gateway REST remains the core real execution source:
  - default base URL: `http://127.0.0.1:8642`
  - health, detailed health, models, capabilities, profiles, active profile, runs, run events, run status, run stop, and gateway jobs
- CLI is the second source for non-message capabilities when a stable official Hermes command exposes data that public REST does not.
- Local Hermes state is the preferred source for dashboard-derived operational surfaces:
  - sessions and messages
  - config/defaults/schema
  - env/API-key set/unset status with redaction
  - logs
  - usage analytics
  - cron jobs
  - skills and toolsets
- Python sidecar is the fourth-precedence compatibility layer:
  - default base URL: `http://127.0.0.1:8765`
  - loopback-only local service
  - health/version/capability probes
  - bounded, redacted local-state summaries
  - run endpoints return structured unsupported while Gateway REST remains sufficient
- Dashboard compatibility is optional/debug only:
  - default base URL: `http://127.0.0.1:9119`
  - public endpoints may be checked without auth
  - protected endpoints require explicit `X-Hermes-Session-Token`
  - missing dashboard service or token does not affect gateway task execution
- Dashboard PTY is a fallback only for features official source proves are not available through Gateway REST, CLI, local state, or sidecar compatibility.
- Guild-owned state remains limited to active pet selection, direct assignment, task intake fields, review approval/revision, Pet position, and report-card normalization.

## Source Precedence

1. Public official REST APIs.
2. Hermes CLI for proven CLI capabilities.
3. Guild/Tauri local Hermes state adapter.
4. Python sidecar compatibility probes.
5. Guild-owned workflow state.
6. Explicit unavailable state.

Mock is not part of production source precedence. Keep mock data in tests, fixtures, and explicit development harnesses only.

## Current Implementation Notes

- `BridgeConfig` keeps `hermesApiBaseUrl` as the core real-mode URL.
- `hermesSidecarBaseUrl` is local/advanced compatibility config and defaults to `http://127.0.0.1:8765`.
- `hermesDashboardBaseUrl` remains only for optional compatibility checks and should be treated as advanced/debug UI.
- `sidecarAvailable` is shown independently from gateway health. It does not replace Gateway REST, but it can provide selected-profile execution fallback when REST lacks routing and CLI support is verified.
- Dashboard compatibility clients guard protected endpoints when no session token is configured.
- Real/auto gateway execution continues when dashboard compatibility is unavailable.
- Real/auto Gateway REST execution continues when sidecar compatibility is unavailable. Selected-profile routing fallback is unavailable in that case.
- Protected dashboard data surfaces remain unavailable until a local adapter or explicit token-backed compatibility path supplies them.
- Missing Hermes data is surfaced as unavailable/error in normal runtime rather than being replaced with mock data.
- Hermes Guild now has a capability-gated consumer path for public REST selected-profile execution. It sends `profile` to `/v1/runs` only when public REST profile metadata advertises request/session run routing.
- Current Hermes gateway versions may still lack those public profile endpoints. Hermes Guild must not patch Hermes source to add them; it now uses the verified CLI mechanism `hermes -p <profile> -z <prompt>` through the loopback sidecar when public REST cannot route a selected profile.

## Non-Goals

- Do not require users to run `hermes dashboard`.
- Do not expose cleartext secrets.
- Do not make sidecar the first source for data available through REST, CLI, or safe local state.
- Do not use sidecar execution for normal Pet/Quest message sending when Gateway REST can route the selected profile itself.
- Do not use mock data as a normal runtime fallback.
- Do not persist or log dashboard session tokens.
- Do not add new Hermes server endpoints in this app.
- Do not send selected-profile fields to `/v1/runs` unless the Hermes gateway itself advertises support. Use sidecar `/runs` for the verified CLI fallback instead.
- Do not broaden v0 into Tavern, Skill Deck page, full Infirmary page, XP/loot, multi-pet, or multi-agent orchestration.
- Do not turn Guild Hall into a generic admin dashboard.

## Verification

- Unit tests cover gateway client endpoint coverage, dashboard compatibility auth guards, bridge source precedence, profile-name honesty, Pet chat wrapper removal, and unavailable states.
- `bun run verify:web` is the full web validation gate.
- `cd src-tauri && cargo fmt --check` and `cd src-tauri && cargo check` are the native validation gates.

## Remaining Gaps

- Local Hermes state adapter still needs implementation for sessions, logs, config/env summaries, skills/toolsets, cron jobs, and analytics.
- CLI selected-profile oneshot execution is available through the sidecar when `hermes -p default --help` proves profile-scoped oneshot support.
- Sidecar is still compatibility-scoped: health/version/capability/profile/local-state summary probes are present, and selected-profile execution fallback is limited to the verified CLI oneshot route.
- Dashboard compatibility can only read protected endpoints with an explicit session token; Hermes Guild does not infer or persist that token.
