<goal>
Implement the Hermes Guild hybrid bridge architecture: keep Gateway REST `/v1/runs` as the default v0 message execution path, add version-aware local read-only Hermes state adapters for operational/profile data, keep dashboard REST as optional token-gated compatibility only, and add a narrow Python sidecar only if Gateway REST is proven insufficient for core Pet/Guild message UX.
</goal>

<context>
Read these files first:
- `AGENTS.md`
- `README.md`
- `SPEC.md`
- `docs/DESIGN.md`
- `docs/REFERENCES.md`
- `docs/API_CONTRACT.md`
- `docs/HERMES_INTEGRATION_PLAN.md`
- `docs/HERMES_CAPABILITY_MATRIX.md`
- `docs/EXECUTION_LOG.md`
- `src/types.ts`
- `src/bridge/types.ts`
- `src/bridge/hermesApiClient.ts`
- `src/bridge/hermesApiClient.test.ts`
- `src/bridge/hermesDashboardApiClient.ts`
- `src/bridge/hermesDashboardApiClient.test.ts`
- `src/bridge/bridgeFactory.ts`
- `src/bridge/bridgeFactory.test.ts`
- `src/bridge/realHermesBridge.ts`
- `src/bridge/mockHermesBridge.ts`
- `src/bridge/mockHermesBridge.test.ts`
- `src/hooks/useBridgeSnapshot.ts`
- `src/App.tsx`
- `src/App.pet.test.ts`
- `src-tauri/src/lib.rs`
- `src-tauri/src/main.rs`
- `package.json`

Reference code to inspect before local adapter work:
- `../hermes-webui/api/routes.py`
- `../hermes-webui/api/streaming.py`
- `../hermes-webui/api/profiles.py`
- `../hermes-webui/api/dashboard_probe.py`
- `../hermes-webui/api/models.py`
- `../hermes-webui/api/agent_sessions.py`
- official Hermes `hermes_cli/web_server.py`
- official Hermes API server docs

Important prior findings:
- `../hermes-webui` uses its own backend and reads local Hermes state for profiles, sessions, logs, config, cron, and related surfaces.
- `../hermes-webui` sends normal chat through `POST /api/chat/start`, then streams via WebUI SSE, and the backend runs Hermes Agent in-process with `AIAgent.run_conversation()`.
- `../hermes-webui` does not depend on protected official dashboard REST for normal chat or operational state.
- Official `hermes dashboard` protects most `/api/*` routes with an ephemeral `X-Hermes-Session-Token`.
- Hermes Guild should not require `hermes dashboard` and should not use CLI subprocesses for normal message sending.

Discovery commands:
```bash
git status --short
rg "runTask|/v1/runs|stopRun|getRun|HermesApiClient|RealHermesBridge" src
rg "dashboard-compatibility|local-hermes-state|dataSources|SystemStatus|BridgeConfig" src docs
rg "state.db|sessions.json|active_profile|cron|logs|config.yaml|\\.env|skills|toolsets" docs src
rg "AIAgent|run_conversation|/api/chat/start|EventSource|dashboard_probe|get_active_hermes_home" ../hermes-webui/api ../hermes-webui/static
```
</context>

<constraints>
- Preserve Hermes Guild's v0 loop: Pet entry -> profile assignment -> quest execution -> timeline visibility -> report card review.
- Gateway REST `/v1/runs` remains the default v0 message sending path unless concrete evidence shows it cannot support core UX.
- Do not require users to run `hermes dashboard`.
- Do not call protected dashboard endpoints without an explicit valid token.
- Do not store, log, or render dashboard tokens.
- Do not use CLI subprocesses for normal Pet Mode or Quest Board message sending.
- Use source precedence per capability:
  1. Gateway REST
  2. local Hermes state adapter
  3. Python sidecar adapter only when Gateway REST is insufficient
  4. Hermes CLI only for proven CLI-only capabilities
  5. dashboard compatibility only as optional/debug fallback
  6. Guild-owned workflow state
  7. explicit unavailable state
- Keep UI components bound to stable Guild bridge objects, not raw Hermes internals or raw sidecar payloads.
- Keep adapters thin and version-aware; do not copy large Hermes internals into the React app.
- Real mode must not silently show mock data for missing real sources.
- Auto mode may use mock fallback only with visible source labels.
- Never expose cleartext secrets.
- Write actions for config/env/skills/cron/jobs require explicit user actions and tests.
- Do not add Tavern/Handoff, standalone Skill Deck, full Infirmary, XP/loot/levels, multi-pet, or multi-agent orchestration.
- Preserve unrelated user changes and untracked files, including any pre-existing `docs/superpowers/` directory.
</constraints>

<done_when>
- `SPEC.md` and `GOAL.md` encode the hybrid bridge strategy: Gateway REST execution first, local read-only adapters second, optional version-aware sidecar only if needed, CLI fallback only for CLI-only features, dashboard compatibility optional only.
- `docs/HERMES_CAPABILITY_MATRIX.md` maps every current Guild data surface to Gateway REST, local Hermes state, Python sidecar, CLI, dashboard compatibility, Guild-owned, mock fallback, or unavailable.
- The capability matrix documents `../hermes-webui` source findings for message sending, profile resolution, sessions, logs, config/env, cron, dashboard probing, and state-db/session-file handling.
- Gateway REST remains the default message sending path and tests cover run creation, events, run status, stop, raw Pet output, and review-card generation.
- A local Hermes capability detector exists and reports Hermes version when available, Gateway endpoint availability, local file/database availability, schema status, Python module availability, and per-surface unavailable reasons.
- Local read-only adapters implement or explicitly mark unavailable with detected reasons for: active profile identity, sessions summary, session messages summary if safely available, log tail summary, config summary, env redacted summary, cron summary, skills, and toolsets.
- Local adapters bound reads by size/count and never expose cleartext secrets.
- Real mode uses local adapter data for implemented surfaces and shows explicit unavailable states for missing or schema-incompatible surfaces.
- Dashboard compatibility remains optional; protected calls are token-gated and never required for core task execution or operational state.
- CLI adapter is not used for normal Pet or Quest Board message sending.
- If a Python sidecar is implemented, it exposes a narrow versioned API, has startup/failure handling, contract tests, and no UI dependency on raw Hermes internals.
- If a Python sidecar is deferred, docs record the concrete Gateway REST gaps that would justify it later and tests prove Gateway REST still supports the v0 loop.
- `docs/API_CONTRACT.md` distinguishes Gateway REST, local Hermes state, Python sidecar, CLI, dashboard compatibility, Guild-owned, mock fallback, and unavailable data sources.
- `docs/HERMES_INTEGRATION_PLAN.md` describes the hybrid architecture, update-safety strategy, and why dashboard/CLI are not primary message paths.
- `docs/EXECUTION_LOG.md` records implementation evidence, `../hermes-webui` findings, local Hermes probes, validation results, and remaining gaps.
- Unit tests cover version/capability detection, schema mismatch handling, local adapter parsing, source precedence, real-vs-mock labels, dashboard token gating, no-secret leakage, and Gateway REST message execution.
- `bun run verify:web` passes.
- `cd src-tauri && cargo fmt --check` passes.
- `cd src-tauri && cargo check` passes, or exact native blockers are documented in `docs/EXECUTION_LOG.md`.
</done_when>

<workflow>
1. Check `git status --short` and identify unrelated or pre-existing untracked changes to preserve.
2. Read all context files and compare the current partial implementation against `SPEC.md`.
3. Inspect `../hermes-webui` source before implementation:
   - `/api/chat/start` and SSE message flow
   - `api/streaming.py` `AIAgent.run_conversation()` usage
   - `api/profiles.py` profile/HERMES_HOME handling
   - sessions/state-db helpers
   - log tail handling
   - cron profile context
   - dashboard probe safety rules
4. Update `docs/HERMES_CAPABILITY_MATRIX.md` before broad implementation. Add columns or notes for version/capability detection, local source path, schema check, and fallback behavior.
5. Add failing tests for source precedence and update safety:
   - Gateway REST remains default message path.
   - CLI is not used for normal message sending.
   - dashboard protected endpoints are skipped without token.
   - local adapter marks schema mismatch unavailable.
   - real mode does not show mock data for missing local surfaces.
6. Implement a `HermesCapabilityDetector` or equivalent bridge utility that reports endpoint availability, local file availability, schema compatibility, Python module availability, and Hermes version when available.
7. Implement local read-only adapters in small vertical slices:
   - active profile identity
   - sessions summary
   - session messages summary when safely available
   - log tail summary
   - config summary
   - env redacted summary
   - cron summary
   - skills/toolsets or explicit unavailable reasons
8. For each local adapter slice, add fixtures for available, missing, malformed, and newer/older schema cases.
9. Map adapter output into existing Guild-facing `SystemStatus`, `Agent`, `Skill`, `Task`, timeline, and report objects without exposing raw Hermes internals.
10. Keep Gateway REST execution through `/v1/runs`, run events, run status, and stop working throughout.
11. Evaluate whether Gateway REST blocks core Pet/Guild message UX. If no blocker exists, explicitly defer Python sidecar in docs. If a blocker exists, implement the smallest versioned sidecar API needed for that blocker.
12. Keep dashboard compatibility optional and advanced. Do not call protected compatibility endpoints unless token access is explicit.
13. Update UI only as needed for source labels, unavailable reasons, and capability status. Avoid visual redesign.
14. Run focused tests after each adapter slice.
15. Run `bun run verify:web`.
16. Run native formatting/checks.
17. Manually probe local Hermes Gateway and local state files where available.
18. Update docs and execution log with evidence and exact remaining gaps.
19. Audit every `done_when` item before final response.
</workflow>

<verification_loop>
Focused existing checks:
```bash
bun test src/bridge/hermesApiClient.test.ts
bun test src/bridge/hermesDashboardApiClient.test.ts
bun test src/bridge/bridgeFactory.test.ts
bun test src/bridge/mockHermesBridge.test.ts
bun test src/App.pet.test.ts
```

Focused new checks to add as files exist:
```bash
bun test src/bridge/hermesCapabilityDetector.test.ts
bun test src/bridge/hermesLocalStateAdapter.test.ts
bun test src/bridge/hermesSidecarAdapter.test.ts
```

Full web validation:
```bash
bun run verify:web
```

Native validation:
```bash
cd src-tauri && cargo fmt --check
cd src-tauri && cargo check
```

Manual probes:
```bash
curl -s http://127.0.0.1:8642/health
curl -s http://127.0.0.1:8642/v1/models
curl -s http://127.0.0.1:8642/v1/capabilities
```

Manual app checks:
- Open Hermes Guild in real mode without `hermes dashboard`.
- Send a Pet message and confirm it uses Gateway REST and produces a reviewable report.
- Confirm stop-task behavior uses Gateway REST when run id is known.
- Confirm profile/session/log/config/env/cron/skills/toolsets surfaces show local real data or explicit unavailable reasons.
- Confirm no cleartext secrets are displayed.
- Confirm no protected dashboard calls occur without explicit token access.
- Confirm CLI is not used for normal message sending.

If local Hermes files, Gateway endpoints, Python modules, or native checks are unavailable, document exact commands, errors, and skipped scope in `docs/EXECUTION_LOG.md`.
</verification_loop>

<execution_rules>
- Check git status before edits.
- Preserve unrelated user changes.
- Prefer `rg` over `grep` when available.
- Use the runtime's patch/edit tool for manual edits when available.
- Read context files before implementation.
- Batch independent file reads in parallel when the runtime supports it.
- Use primary sources for Hermes behavior: official docs, `NousResearch/hermes-agent` source, and `../hermes-webui` source.
- Write failing tests before implementation for behavior changes.
- Run focused tests before broad tests.
- Do not paper over failures.
- Do not widen scope.
- Keep the final answer concise.
</execution_rules>

<output_contract>
Final response should include:
- files changed
- hybrid bridge architecture summary
- message sending path evidence
- local adapter surfaces implemented or unavailable with reasons
- capability detector summary
- sidecar implemented/deferred decision and evidence
- focused and full validation command results
- native validation results or documented blockers
- manual Hermes probe results or blockers
- remaining Hermes API/local-state/sidecar/CLI gaps

The task is complete only after every `done_when` item has evidence or an exact documented blocker.
</output_contract>
