# Profile Context Routed Chat Spec

## Goal

Make Hermes Guild route Pet and Quest Board chat/task execution through the selected Hermes profile end to end, without modifying Hermes source code and without depending on users starting the standalone Hermes dashboard service.

The selected profile must become a first-class execution context:

- profile selection in the UI binds the current Pet/chat/task context
- new Pet messages and Quest Board tasks carry that profile context into the bridge
- the bridge resolves a verified execution route using the source precedence below
- the resulting task, timeline, report card, and system status state the real route used
- Pet chat shows only user-submitted text, actual Hermes output/progress text, and concise errors

If no verified route can execute against the selected profile, Hermes Guild must show an explicit unavailable state instead of pretending assignment equals Hermes routing. Mock is test-only.

## Source Precedence

Use the user's required precedence for every real profile and routing signal:

1. Public official Hermes REST
2. Stable official Hermes CLI
3. Safe read-only local Hermes state
4. Hermes Guild Python sidecar compatibility service
5. Guild-owned workflow state
6. Unavailable

Mock data is allowed only in tests and explicit development harnesses. Mock is not a runtime fallback.

## Product Behavior

### Profile Context

Hermes Guild should maintain a `ProfileContext` for new chat/task execution:

- `profileId`: Guild-stable profile id
- `profileName`: real Hermes profile name from REST/CLI/local/sidecar metadata
- `source`: source that provided profile identity
- `routingSource`: source that can execute selected-profile runs, if any
- `routingMode`: `request`, `session`, `cli`, `sidecar`, or `unavailable`
- `sessionId`: Guild chat/task session id when session context exists
- `verified`: whether the execution route is proven for the current installed Hermes
- `unavailableReason`: exact reason when routing cannot be verified

The effective profile for new work is resolved in this order:

1. explicit profile selected for the task/message
2. current Pet/session-bound profile
3. Hermes active profile only when a selected profile is not required
4. validation error or explicit unavailable state

Switching the active profile affects new messages/tasks only. Existing task history, report cards, and session records must keep the profile context that was used when they were created.

### Routed Chat

Pet Mode and Quest Board must both use the same bridge route for selected-profile execution:

- opening Pet Mode shows the selected profile and route availability
- sending a Pet message creates a task/chat entry assigned to that selected profile
- Quest Board direct assignment creates a task using that task's selected assignee profile
- bridge run metadata records the selected profile, routing source, route mode, Hermes run id when present, and route evidence
- status chips or Integration Truth may show routing labels, but Pet chat bubbles must not show lifecycle wrapper text as if the agent said it

Routed chat is considered working end to end only when a real route executes against the selected Hermes profile or the UI gives a precise, verified unavailable reason after all allowed sources were checked.

## Route Resolution Requirements

### 1. Public REST

Prefer public REST when the installed Hermes gateway advertises support.

Hermes Guild may use REST profile routing only when metadata proves support for profile discovery plus request/session execution routing, for example:

```json
{
  "profiles": {
    "list": true,
    "active": true,
    "request_context": true,
    "session_context": true,
    "run_routing": true
  }
}
```

When supported:

- `GET /v1/profiles` and `GET /v1/profile/active` provide profile identity
- `POST /v1/runs` may include the selected profile name
- session-scoped routing may use `session_id` plus profile metadata when advertised
- run responses/events should be parsed for returned profile/routing metadata

When unsupported:

- do not send `profile`, `profile_id`, or `profile_name` fields to `/v1/runs`
- do not send unadvertised `X-Hermes-Profile` headers
- continue to CLI/local/sidecar route discovery

### 2. CLI

Investigate stable official CLI execution before using the sidecar as an execution route.

Required discovery:

- inspect `hermes --help`
- inspect `hermes profile --help`
- inspect any run/chat/agent command help that can execute a single request
- verify whether a per-command profile selector exists, such as a documented flag or environment contract
- prove the route does not call `hermes profile use` and does not mutate global active profile state

If a stable CLI route exists, Hermes Guild may implement a CLI adapter through the native/Tauri bridge or Python sidecar, provided command arguments are bounded and no shell interpolation is used for user content.

### 3. Local State

Local Hermes state may be used for read-only metadata and route evidence only when the files are safe to read and understood.

Local state must not be used to fake execution routing. It may support execution only if official code or docs prove that a local-state value can scope a single request/session without global mutation.

### 4. Python Sidecar

The Python sidecar is a compatibility layer, not a shortcut around official sources.

Use sidecar execution only when:

- public REST lacks selected-profile routing
- no stable direct CLI route can be called safely from the app
- the sidecar can execute Hermes under a selected profile using verified official mechanisms without editing Hermes source
- the sidecar is loopback-only and returns structured route evidence

If implemented, sidecar endpoints should be explicit and typed, for example:

- `POST /runs`
- `GET /runs/{run_id}`
- `GET /runs/{run_id}/events`
- `POST /runs/{run_id}/stop`

Each run response must include the selected profile, routing source/mode, command/import mechanism used, and whether the route was verified.

### 5. Guild-Owned And Unavailable

Guild-owned assignment remains useful for UI, review, and history, but it is not proof that Hermes executed under that profile.

When no route is verified:

- keep selected profile as Guild-owned assignment
- mark execution routing as `unavailable`
- show the exact probe evidence or blocker
- do not claim the Hermes run used the selected profile

## WebUI Reference

Read `../hermes-webui` only as a reference for official behavior. Do not require the dashboard service in normal Guild execution.

Known useful WebUI patterns:

- sessions can carry a `profile`
- chat start uses the session profile rather than requiring profile on every message
- streaming resolves `session.profile` to profile home/runtime environment before constructing/running the Hermes agent
- server request-local profile context is used for dashboard API calls

The goal is to replicate the compatible logic inside Hermes Guild adapters when official mechanisms allow it, not to proxy through the dashboard service or patch Hermes.

## UI Requirements

- Pet profile switcher and Guild profile controls must set the same active profile context for new work.
- Pet chat input remains minimal: no demo prefill, no greeting, no `Quest accepted`, no `Returned output:` wrapper, no report-ready narration.
- Pet chat displays user text, raw Hermes output/progress text, and concise errors only.
- Quest Board task detail/timeline shows selected profile, actual routing source, run id, and unavailable reason when relevant.
- Integration Truth/System Status shows public REST, CLI, local state, sidecar, Guild-owned, and unavailable source labels distinctly.
- UI must not use mock data in real/auto mode.

## Non-Goals

- Do not edit, patch, monkey-patch, vendor, or write tests into Hermes source.
- Do not require users to run `hermes dashboard`.
- Do not use protected dashboard APIs as the normal execution path.
- Do not use `hermes profile use` or any global active-profile mutation for per-task or per-session routing.
- Do not invent profile identity from Guild presets or manual overrides.
- Do not use fake route labels to make the UI appear complete.
- Do not implement profile creation/editing.
- Do not build multi-pet, multi-agent orchestration, Tavern, Skill Deck, Infirmary, or decorative RPG stats.

## Likely Files

Core Guild files:

- `src/App.tsx`
- `src/types.ts`
- `src/bridge/types.ts`
- `src/bridge/realHermesBridge.ts`
- `src/bridge/bridgeFactory.ts`
- `src/bridge/hermesApiClient.ts`
- `src/bridge/hermesProfileClient.ts`
- `src/bridge/hermesSidecarClient.ts`
- `src-tauri/src/lib.rs`
- `sidecar/hermes_guild_sidecar.py`

Tests:

- `src/App.pet.test.ts`
- `src/bridge/hermesApiClient.test.ts`
- `src/bridge/bridgeFactory.test.ts`
- `src/bridge/hermesProfileClient.test.ts`
- `src/bridge/hermesSidecarClient.test.ts`
- `sidecar/tests/`

Docs:

- `docs/API_CONTRACT.md`
- `docs/HERMES_CAPABILITY_MATRIX.md`
- `docs/HERMES_INTEGRATION_PLAN.md`
- `docs/EXECUTION_LOG.md`
- `AGENTS.md`

Read-only references:

- `/Users/plutoless/.hermes/hermes-agent/gateway/platforms/api_server.py`
- `/Users/plutoless/Documents/hermes-webui/api/routes.py`
- `/Users/plutoless/Documents/hermes-webui/api/streaming.py`
- `/Users/plutoless/Documents/hermes-webui/api/profiles.py`
- `/Users/plutoless/Documents/hermes-webui/server.py`

## Verification

Focused tests should cover:

- active profile selection updates the `ProfileContext` for new work
- switching profile does not rewrite existing task/session history
- Pet chat and Quest Board both pass selected profile context into bridge execution
- REST route sends selected profile only when capability metadata advertises routing
- unsupported REST route omits profile fields and continues to next allowed source
- CLI/local/sidecar route discovery records exact support or blocker evidence
- sidecar selected-profile run endpoints either execute through a verified mechanism or return structured unsupported responses
- Pet chat contains no lifecycle wrappers
- Integration Truth shows the real routing source or unavailable reason

Commands:

```bash
bun test src/bridge/hermesApiClient.test.ts
bun test src/bridge/bridgeFactory.test.ts
bun test src/bridge/hermesProfileClient.test.ts
bun test src/bridge/hermesSidecarClient.test.ts
bun test src/App.pet.test.ts
python3 -m unittest discover sidecar/tests
bun run verify:web
cd src-tauri && cargo fmt --check
cd src-tauri && cargo check
```

Manual/probe checks:

```bash
git -C /Users/plutoless/.hermes/hermes-agent status --short
curl -s --max-time 2 http://127.0.0.1:8642/health
curl -s --max-time 2 http://127.0.0.1:8642/v1/profiles
curl -s --max-time 2 http://127.0.0.1:8642/v1/profile/active
curl -s --max-time 2 http://127.0.0.1:8642/v1/capabilities
hermes --help
hermes profile --help
hermes profile list
```

Manual UI check:

- open `/?mode=pet&variant=skyship-command-deck&pet=expanded`
- confirm input is empty and focused
- select a non-default profile if available
- send a Pet message
- confirm the task/report shows the selected profile and actual route source
- confirm Pet bubbles show only user text and raw Hermes output/progress/error
- confirm no `Quest accepted`, `Returned output:`, greeting, report-ready, or fake routing text appears

## Done When

- `SPEC.md` and `GOAL.md` define profile context routed chat as the active goal.
- Hermes source checkout remains unmodified.
- Profile selection in Pet/Guild creates a `ProfileContext` used by new Pet messages and Quest Board tasks.
- Public REST profile routing is used only when capability metadata proves support.
- CLI, local-state, and sidecar routes are investigated and either implemented with tests or rejected with exact evidence.
- If a sidecar execution route is implemented, it runs loopback-only and returns structured profile routing metadata.
- Routed chat works end to end through the best verified source for the installed Hermes.
- If no source can route selected-profile execution, UI and docs show a precise unavailable state and no fake routing.
- Tests and verification commands above pass, or any unavailable command is documented with the exact blocker.
