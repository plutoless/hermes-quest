# Hermes Guild Hybrid Bridge Spec

## Goal

Build Hermes Guild around a stable, version-aware Hermes Bridge that can survive Hermes updates while preserving the v0 task/review loop.

The architecture should use:

1. **Gateway REST `/v1/runs` as the v0 message execution path**.
2. **Guild-owned local read-only adapters** for Hermes state that is not exposed through stable Gateway REST.
3. **Optional dashboard compatibility probes** only for public or explicitly token-authenticated dashboard endpoints.
4. **A thin Python sidecar adapter only if Gateway REST cannot support core Pet/Guild message UX**.
5. **CLI as a narrow fallback**, not the default message path.

The product loop remains:

> Pet entry -> profile assignment -> quest execution -> timeline visibility -> report card review.

## Decisions From Discussion

- Do not require users to start `hermes dashboard`.
- Do not use protected dashboard REST as a primary integration surface.
- Learn from `../hermes-webui`, which owns its backend, reads Hermes local state, and only probes the official dashboard safely.
- For message sending, prefer stable Gateway REST first. `hermes-webui` uses an in-process `AIAgent.run_conversation()` backend for maximum parity, but Hermes Guild should only add that kind of sidecar if Gateway REST blocks the v0 UX.
- Do not use CLI subprocesses for normal Pet chat or Quest Board message sending.
- Handle Hermes updates through capability detection, schema checks, adapter contract tests, graceful unavailable states, and narrow adapter boundaries.

## Source Strategy

Use this precedence for each capability:

1. **Gateway REST**: stable Hermes API server, default `http://127.0.0.1:8642`.
2. **Local Hermes state adapter**: Tauri/sidecar reads of bounded local files or databases, modeled after `hermes-webui` and official dashboard source.
3. **Python sidecar adapter**: optional, version-aware API over Hermes internals for features Gateway REST cannot expose.
4. **Hermes CLI adapter**: only for proven CLI-only features, never normal message sending.
5. **Dashboard compatibility**: optional/debug only; protected endpoints require explicit token access.
6. **Guild-owned state**: active pet profile selection, direct assignment, task intake fields, review approval/revision, Pet window state, and report-card normalization.
7. **Unavailable**: explicit missing state; never silently fill with mock data in real mode.

## Message Sending Strategy

### v0 Default

- Use Gateway REST runs:
  - `POST /v1/runs`
  - `GET /v1/runs/{run_id}`
  - `GET /v1/runs/{run_id}/events`
  - `POST /v1/runs/{run_id}/stop`
- Convert Hermes output/events into Guild tasks, timelines, Pet-visible output, and Quest Report Cards.
- Keep Pet chat minimal: user message, actual Hermes output/progress text, concise errors.

### Optional Later Sidecar

Add a Python sidecar only if a verified Gateway REST gap blocks core UX, such as:

- profile-specific execution cannot be routed through Gateway REST;
- Gateway REST lacks necessary streaming/tool/progress semantics;
- Gateway REST cannot expose reviewable artifact/session evidence;
- Hermes features required by v0 are only available through `AIAgent.run_conversation()`.

If added, the sidecar must expose a small stable Guild-facing API, not raw Hermes internals:

- `GET /capabilities`
- `GET /version`
- `GET /profiles`
- `GET /active-profile`
- `GET /sessions`
- `GET /sessions/{id}/messages`
- `GET /logs?tail=...`
- `GET /config-summary`
- `GET /env-summary`
- `GET /skills`
- `GET /toolsets`
- optionally `POST /runs` and `GET /runs/{id}/events` only if Gateway REST is insufficient

## Local State Adapter Targets

Learn from `../hermes-webui` and official Hermes source before implementing each surface.

Likely local sources:

- active profile:
  - `~/.hermes/active_profile`
  - `~/.hermes/profiles/*`
  - `hermes_cli.profiles` when importable
- sessions:
  - `~/.hermes/sessions/sessions.json`
  - active profile `state.db`
  - WebUI reference: `api/routes.py`, `api/models.py`, `api/agent_sessions.py`
- logs:
  - active profile `logs/agent.log`, `logs/gateway.log`, and bounded tails
  - WebUI reference: `_handle_logs`
- config:
  - active profile `config.yaml`
  - `hermes_cli.config.load_config`, `DEFAULT_CONFIG`, schema/default logic when importable
- env/API key status:
  - active profile `.env`
  - redacted set/unset metadata only
  - never reveal secret values
- cron:
  - active profile `cron/jobs.json`
  - WebUI reference: `cron_profile_context`
- skills/toolsets:
  - active profile skills/tool config paths or `hermes_cli` modules when available

## Version And Update Safety

The bridge must degrade per surface rather than breaking the app when Hermes updates.

Requirements:

- Detect Hermes version and adapter capabilities at startup.
- Check Gateway endpoint availability before using each endpoint.
- Check local file/database existence and schema before reading.
- Check Python module/function availability before importing or calling Hermes internals.
- Record detected version, adapter status, and unavailable reasons in `SystemStatus` and docs.
- Add fixtures and contract tests for known Hermes state shapes.
- Keep UI bound to stable Guild objects, never directly to Hermes internal payloads.

## User-Visible Behavior

Pet Mode:

- Sends v0 messages through Gateway REST unless a future sidecar is explicitly enabled because Gateway REST is insufficient.
- Shows only user text, actual Hermes returned output/progress text, and concise errors.
- Shows real profile name only from verified Hermes profile metadata/local profile state; otherwise `Profile unavailable`.

Guild Hall:

- Shows source labels for Gateway REST, local Hermes state, Python sidecar, CLI, dashboard compatibility, Guild-owned, mock fallback, and unavailable.
- Shows real local summaries only after adapter schema checks pass.
- Does not show fake sessions/logs/skills/toolsets in real mode.

Review:

- Remains Guild-owned.
- Links reports to real run IDs, session IDs, artifacts, and local evidence when available.

Settings:

- Gateway base URL remains the core real-mode setting.
- Dashboard URL, if present, is advanced compatibility only.
- Sidecar controls, if added, must show detected version/capabilities and unavailable reasons.

## Non-Goals

- Requiring `hermes dashboard`.
- Calling protected dashboard endpoints without an explicit token.
- Persisting or logging dashboard tokens.
- Using CLI subprocesses for normal message sending.
- Deep monkey-patching of Hermes internals in the Tauri/React process.
- Cleartext secret display.
- Config/env/skill/cron writes without explicit user action.
- Multi-pet, Tavern/Handoff, standalone Skill Deck, full Infirmary, XP/loot/levels, or multi-agent orchestration.

## Files And Systems Likely Involved

Read first:

- `AGENTS.md`
- `SPEC.md`
- `GOAL.md`
- `docs/DESIGN.md`
- `docs/API_CONTRACT.md`
- `docs/HERMES_INTEGRATION_PLAN.md`
- `docs/HERMES_CAPABILITY_MATRIX.md`
- `docs/EXECUTION_LOG.md`
- `src/types.ts`
- `src/bridge/types.ts`
- `src/bridge/hermesApiClient.ts`
- `src/bridge/hermesDashboardApiClient.ts`
- `src/bridge/bridgeFactory.ts`
- `src/bridge/realHermesBridge.ts`
- `src/hooks/useBridgeSnapshot.ts`
- `src/App.tsx`
- `src-tauri/src/lib.rs`
- `package.json`

Reference code to inspect:

- `../hermes-webui/api/routes.py`
- `../hermes-webui/api/streaming.py`
- `../hermes-webui/api/profiles.py`
- `../hermes-webui/api/dashboard_probe.py`
- `../hermes-webui/api/models.py`
- `../hermes-webui/api/agent_sessions.py`
- official Hermes `hermes_cli/web_server.py`
- official Hermes API server docs

Discovery commands:

```bash
rg "runTask|/v1/runs|stopRun|getRun|HermesApiClient|RealHermesBridge" src
rg "dashboard-compatibility|local-hermes-state|dataSources|SystemStatus|BridgeConfig" src docs
rg "state.db|sessions.json|active_profile|cron|logs|config.yaml|\\.env|skills|toolsets" docs src
rg "AIAgent|run_conversation|/api/chat/start|EventSource|dashboard_probe|get_active_hermes_home" ../hermes-webui/api ../hermes-webui/static
```

## Edge Cases

- Gateway available but specific endpoints missing, such as local `/v1/capabilities` returning 404.
- Gateway unavailable but local read-only state is available.
- Local profile state exists but profile display metadata is missing.
- `state.db` exists with an older/newer schema.
- `sessions.json` is malformed or huge.
- Logs are missing or too large.
- `.env` includes secrets; only redacted set/unset summaries are allowed.
- Hermes Python modules are not importable.
- Hermes module signatures changed after an update.
- Sidecar process fails to start, exits, or reports unsupported version.
- Dashboard is running but protected endpoints reject unauthenticated calls.

## Verification

Focused tests:

```bash
bun test src/bridge/hermesApiClient.test.ts
bun test src/bridge/hermesDashboardApiClient.test.ts
bun test src/bridge/bridgeFactory.test.ts
bun test src/bridge/mockHermesBridge.test.ts
```

Add tests as new adapters are created:

```bash
bun test src/bridge/hermesLocalStateAdapter.test.ts
bun test src/bridge/hermesCapabilityDetector.test.ts
bun test src/bridge/hermesSidecarAdapter.test.ts
```

Full validation:

```bash
bun run verify:web
cd src-tauri && cargo fmt --check
cd src-tauri && cargo check
```

Manual checks:

- Probe Gateway health/models/runs endpoints.
- Open Hermes Guild in real mode without `hermes dashboard` running.
- Send a Pet message and verify it creates a run-backed reviewable quest.
- Confirm local state surfaces are real, schema-checked, or explicitly unavailable.
- Confirm no mock data appears in real mode for missing surfaces.
- Confirm no cleartext secrets or dashboard tokens appear in UI/logs/tests.

## Done When

- `SPEC.md` and `GOAL.md` encode the hybrid bridge strategy: Gateway REST execution first, local read-only adapters second, optional version-aware sidecar only if needed, CLI fallback only for CLI-only features, dashboard compatibility optional only.
- `docs/HERMES_CAPABILITY_MATRIX.md` maps every Guild surface to Gateway REST, local Hermes state, Python sidecar, CLI, dashboard compatibility, Guild-owned, mock fallback, or unavailable.
- Gateway REST remains the default message sending path and is covered by tests for run creation, events, status, stop, raw Pet output, and review-card generation.
- Local state adapter capability detection exists and reports per-surface availability/unavailable reasons.
- At least profile identity, sessions summary, log tail summary, config summary, env redacted summary, and cron summary are implemented through local read-only adapters or explicitly documented unavailable with detected reasons.
- Dashboard compatibility remains optional; protected calls are token-gated and never required for core execution.
- If a Python sidecar is implemented, it has a narrow API, version/capability endpoint, startup failure handling, tests, and no UI dependency on raw Hermes internals.
- If a Python sidecar is deferred, docs explain which Gateway REST gaps would justify it later.
- CLI is not used for normal Pet or Quest Board message sending.
- Real mode never silently replaces unavailable real data with mock data.
- Unit tests cover version/capability detection, schema mismatch handling, local adapter parsing, source precedence, real-vs-mock labels, dashboard token gating, and no-secret leakage.
- `docs/API_CONTRACT.md`, `docs/HERMES_INTEGRATION_PLAN.md`, and `docs/EXECUTION_LOG.md` are updated with implemented surfaces, source decisions, Hermes/WebUI source findings, validation evidence, and remaining gaps.
- `bun run verify:web` passes.
- `cd src-tauri && cargo fmt --check` passes.
- `cd src-tauri && cargo check` passes, or exact native blockers are documented.
