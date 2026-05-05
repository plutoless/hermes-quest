# Hermes Integration Plan

## Goal

Wire Hermes Guild to real Hermes Agent capabilities without making the official Hermes dashboard server a required runtime dependency.

Hermes Guild should use the Hermes Gateway API for execution and stable REST facts, then replicate useful official dashboard backend logic inside the Guild/Tauri bridge for local Hermes state.

## Architecture

- Gateway REST remains the core real execution source:
  - default base URL: `http://127.0.0.1:8642`
  - health, detailed health, models, capabilities, runs, run events, run status, run stop, and gateway jobs
- Local Hermes state is the preferred source for dashboard-derived operational surfaces:
  - sessions and messages
  - config/defaults/schema
  - env/API-key set/unset status with redaction
  - logs
  - usage analytics
  - cron jobs
  - skills and toolsets
- Dashboard compatibility is optional/debug only:
  - default base URL: `http://127.0.0.1:9119`
  - public endpoints may be checked without auth
  - protected endpoints require explicit `X-Hermes-Session-Token`
  - missing dashboard service or token does not affect gateway task execution
- CLI/PTY is a fallback only for features official source proves are not available through Gateway REST or local state.
- Guild-owned state remains limited to active pet selection, direct assignment, task intake fields, review approval/revision, Pet position, and report-card normalization.

## Source Precedence

1. Gateway REST.
2. Guild/Tauri local Hermes state adapter.
3. Hermes CLI for proven CLI-only capabilities.
4. Dashboard compatibility for optional public or explicitly token-authenticated reads.
5. Guild-owned workflow state.
6. Explicit unavailable state.

## Current Implementation Notes

- `BridgeConfig` keeps `hermesApiBaseUrl` as the core real-mode URL.
- `hermesDashboardBaseUrl` remains only for optional compatibility checks and should be treated as advanced/debug UI.
- Dashboard compatibility clients guard protected endpoints when no session token is configured.
- Real/auto gateway execution continues when dashboard compatibility is unavailable.
- Protected dashboard data surfaces remain unavailable until a local adapter or explicit token-backed compatibility path supplies them.

## Non-Goals

- Do not require users to run `hermes dashboard`.
- Do not expose cleartext secrets.
- Do not persist or log dashboard session tokens.
- Do not add new Hermes server endpoints in this app.
- Do not broaden v0 into Tavern, Skill Deck page, full Infirmary page, XP/loot, multi-pet, or multi-agent orchestration.
- Do not turn Guild Hall into a generic admin dashboard.

## Verification

- Unit tests cover gateway client endpoint coverage, dashboard compatibility auth guards, bridge source precedence, profile-name honesty, Pet chat wrapper removal, and unavailable states.
- `bun run verify:web` is the full web validation gate.
- `cd src-tauri && cargo fmt --check` and `cd src-tauri && cargo check` are the native validation gates.

## Remaining Gaps

- Local Hermes state adapter still needs implementation for sessions, logs, config/env summaries, skills/toolsets, cron jobs, and analytics.
- CLI adapter remains deferred until official source proves a capability is CLI-only.
- Dashboard compatibility can only read protected endpoints with an explicit session token; Hermes Guild does not infer or persist that token.
