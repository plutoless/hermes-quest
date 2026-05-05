# Hermes Guild v0 API Contract

This contract defines the Hermes Bridge surface. UI components should depend on these game-readable objects instead of Hermes runtime internals.

## Domain Types

### Agent

- `id`: stable profile id.
- `name`: display name.
- `role`: configured class/role, such as Researcher, Builder, Reviewer.
- `status`: current pet-visible state: `idle`, `thinking`, `running`, `blocked`, `needs_review`, or `error`.
- `availability`: `available`, `busy`, or `offline`.
- `activeInPet`: whether this profile is represented by the active desktop pet.
- `currentTaskId`: active quest id, if any.
- `skills`: configured Hermes skill summaries.
- `traits`: configured role profile signals, not measured stats.
- `health`: coarse bridge-derived health label.
- `equipment`: configured model/tool/workspace summary.
- `lastReportId`: most recent report card id, if any.
- In real mode, `name` must come from Hermes API profile metadata when available. If `/health` does not provide profile metadata, use the explicit missing state `Profile unavailable`; do not use a manual profile-name config or a Guild role preset as the profile name.

### Task

- `id`: stable quest id.
- `title`: short quest title.
- `assigneeId`: directly assigned agent id.
- `brief`: user task brief.
- `goals`: optional advanced intake goals.
- `nonGoals`: optional advanced intake boundaries.
- `context`: optional background context for the task.
- `definitionOfDone`: optional acceptance target for review.
- `type`: `pet` or `quest_board`.
- `state`: `created`, `assigned`, `running`, `blocked`, `needs_review`, `approved`, or `error`.
- `progress`: numeric 0-100 progress estimate derived by the bridge.
- `artifacts`: list of produced artifacts.
- `timeline`: normalized user-facing execution events.
- `reviewStatus`: `none`, `required`, `approved`, or `revision_requested`.
- `error`: optional visible error summary.
- `revisionOfTaskId`: original task id when this task is a revision rerun.
- `hermesRunId`: Hermes gateway run id when `/v1/runs` has returned one.

### TimelineEvent

- `id`: stable event id.
- `taskId`: related task id.
- `agentId`: related agent id when available.
- `type`: `created`, `assigned`, `started`, `progress`, `blocked`, `artifact`, `completed`, `review_required`, `approved`, `revision_requested`, or `error`.
- `message`: human-readable event text.
- `timestamp`: ISO timestamp.
- `source`: `guild`, `bridge`, or `hermes`.

### Pet-Visible Message Selection

Pet Mode is not a raw timeline renderer. It may use task timeline and report data as inputs, but pet chat bubbles should only show:

- user-submitted text
- actual Hermes returned output
- Hermes-provided progress text when an event includes text, preview, or delta content
- concise error text

Pet Mode should not show app-authored greeting, sending, accepted, report-ready, report-wrapper, or bridge lifecycle narration such as run-start, run-complete, artifact-capture, or routing labels as if the active profile said them.

### Artifact

- `id`: stable artifact id.
- `taskId`: related task id.
- `kind`: `summary`, `handoff`, `decision`, `risk`, `open_question`, or `file`.
- `title`: display title.
- `description`: short grounded description.
- `path`: optional local path for a real artifact.

### ReportCard

- `id`: stable report id.
- `taskId`: related task id.
- `agentId`: completing agent id.
- `title`: report title.
- `summary`: what the agent claims it completed.
- `artifacts`: artifact ids or embedded artifact summaries.
- `facts`: claims presented as facts.
- `assumptions`: assumptions separated from facts.
- `knownGaps`: remaining gaps.
- `recommendedNextAction`: concise next step.
- `reviewItems`: decisions, risks, and open questions.
- `createdAt`: ISO timestamp.

### BridgeEvent

- `id`: stable event id.
- `type`: `active_profile_changed`, `agent_idle`, `task_started`, `task_progress`, `task_blocked`, `task_completed`, `review_required`, `review_approved`, `revision_requested`, or `gateway_error`.
- `agentId`: related agent id when available.
- `taskId`: related task id when available.
- `payload`: event-specific data.
- `timestamp`: ISO timestamp.

## Bridge Methods

- `getSnapshot()`: returns agents, active profile, tasks, reports, system status, and pet position.
- `subscribe(listener)`: emits `BridgeEvent` updates and returns an unsubscribe function.
- `setActiveProfile(agentId)`: changes the profile represented by the pet; unknown profile ids are ignored.
- `createTask(input)`: creates a directly assigned task from Pet Mode or Quest Board; unknown assignees are rejected.
- `approveReport(reportId)`: marks the task/report approved and emits review timeline events only when the report task is still `needs_review` with `required` review status.
- `requestRevision(reportId, instructions)`: creates a revision task assigned to the same profile, preserves advanced brief fields, and reruns mock execution only when the original report is still actionable.
- `simulateBlocked(taskId?)`: v0 mock-only helper to surface pet and task blocked states.
- `simulateError(taskId?)`: v0 mock-only helper to surface pet and task error states.
- `setPetPosition(position)`: persists or mocks pet position.
- `stopTask(taskId)`: explicit user action for running real gateway tasks. Calls `POST /v1/runs/{run_id}/stop` only when a `hermesRunId` is known; otherwise records a visible unavailable warning.

## Source Boundaries

Bridge surfaces must be labeled with one of these source classes:

- Public REST: official Hermes API server endpoints, default `http://127.0.0.1:8642`. `gateway-rest` remains accepted as the current internal label for this source.
- CLI: stable official Hermes CLI commands for non-message capabilities when REST does not expose the signal.
- Local Hermes state: bounded, read-only Guild/Tauri bridge reads of the same local Hermes files/runtime state the official dashboard backend reads.
- Sidecar: Hermes Guild's local Python compatibility service, default `http://127.0.0.1:8765`; fourth in precedence and not used as the default message execution path.
- Dashboard compatibility: optional Hermes dashboard backend calls, default `http://127.0.0.1:9119`; protected calls require an explicit `X-Hermes-Session-Token`.
- Guild-owned: active pet selection, direct assignment, review approval/revision, task brief, desktop/Pet state, and report-card normalization.
- Unavailable: normal runtime has no verified source and must not invent data.
- Mock: test-only data for unit tests, development fixtures, and explicit test harnesses. Mock is not part of production source precedence and must not be a silent runtime fallback.

Source precedence is public REST > CLI > local state > sidecar > Guild-owned > unavailable.

`SystemStatus` exposes `hermesApiBaseUrl`, optional `hermesDashboardBaseUrl`, optional `hermesSidecarBaseUrl`, `dashboardAvailable`, `sidecarAvailable`, and `dataSources` so UI surfaces can distinguish public REST, CLI, local Hermes state, sidecar, dashboard compatibility, Guild-owned state, and unavailable data. Mock labels may exist for tests and explicit development harnesses only.

`SystemStatus.operationalData` exposes concise read-only summaries for real gateway/local/compatibility surfaces: sessions, logs, analytics, cron jobs, config/defaults/schema, redacted env status, gateway jobs, and sidecar local-state probes. Env summaries must count configured keys only and must not include secret values.

Current gateway REST client coverage includes:

- `GET /health`
- `GET /health/detailed`
- `GET /v1/models`
- `GET /v1/capabilities`
- `GET /v1/profiles`
- `GET /v1/profile/active`
- `POST /v1/chat/completions`
- `POST /v1/responses`
- `GET /v1/responses/{id}`
- `DELETE /v1/responses/{id}`
- `POST /v1/runs`
- `GET /v1/runs/{run_id}`
- `GET /v1/runs/{run_id}/events`
- `POST /v1/runs/{run_id}/stop`
- `GET /api/jobs`
- `POST /api/jobs`
- `GET /api/jobs/{job_id}`
- `PATCH /api/jobs/{job_id}`
- `DELETE /api/jobs/{job_id}`
- `POST /api/jobs/{job_id}/pause`
- `POST /api/jobs/{job_id}/resume`
- `POST /api/jobs/{job_id}/run`

Current dashboard compatibility client coverage includes:

- `GET /api/status`
- `GET /api/sessions`
- `GET /api/sessions/{session_id}`
- `GET /api/sessions/{session_id}/messages`
- `GET /api/sessions/search`
- `DELETE /api/sessions/{session_id}`
- `GET /api/config`
- `GET /api/config/defaults`
- `GET /api/config/schema`
- `PUT /api/config`
- `GET /api/env`
- `PUT /api/env`
- `DELETE /api/env`
- `GET /api/logs`
- `GET /api/analytics/usage`
- `GET /api/cron/jobs`
- `POST /api/cron/jobs`
- `POST /api/cron/jobs/{job_id}/pause`
- `POST /api/cron/jobs/{job_id}/resume`
- `POST /api/cron/jobs/{job_id}/trigger`
- `DELETE /api/cron/jobs/{job_id}`
- `GET /api/skills`
- `PUT /api/skills/toggle`
- `GET /api/tools/toolsets`

Write endpoints are client-supported but must be invoked only from explicit user actions. Env/API-key UI must display only redacted or metadata state, never cleartext secret values.

### Public REST Profile Context Contract

Hermes Guild supports selected-profile execution through public REST only when gateway metadata explicitly advertises it. Supported gateway metadata must expose profile discovery plus request/session run routing, for example:

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

When supported, Hermes Guild may send `profile` in `POST /v1/runs` using the selected Hermes profile name. When unsupported, Hermes Guild must omit `profile`, `profile_id`, and `profile_name`, keep assignment as Guild-owned state, and show `profile routing unavailable`.

The intended Hermes gateway behavior is request/session scoped:

- explicit JSON `profile` or `X-Hermes-Profile`
- session-bound profile by `session_id`
- fallback to active/global Hermes profile
- no `hermes profile use` and no global active-profile mutation for per-run routing

Hermes Guild must not patch Hermes source to create this contract. If the installed gateway does not advertise profile routing, Guild continues through the non-source-edit route order: CLI, safe read-only local state evidence, then the Guild Python sidecar. If none can route execution, Guild keeps the route unavailable.

### Profile Context

New Pet messages and Quest Board tasks carry a `profileContext` snapshot:

- `profileId` and `profileName` from real Hermes profile metadata.
- `source` for profile identity.
- `routingSource` and `routingMode` for the actual execution path.
- `sessionId` for the Guild task/chat session.
- `verified` and `unavailableReason` so assignment cannot be confused with execution routing.

Switching the active profile affects new work only. Existing tasks, timelines, and report cards preserve the profile context captured at creation time.

Protected dashboard compatibility endpoints are skipped unless an explicit session token is available. The official dashboard token is generated per dashboard process and is not persisted by Hermes Guild.

Current sidecar compatibility client coverage includes:

- `GET /health`
- `GET /capabilities`
- `GET /local-state/summary`
- `POST /runs`
- `GET /runs/{id}`
- `POST /runs/{id}/stop`

Current Python sidecar HTTP coverage includes:

- `GET /health`
- `GET /version`
- `GET /capabilities`
- `GET /profiles`
- `GET /active-profile`
- `GET /local-state/summary`
- `POST /runs`
- `GET /runs/{id}`
- `GET /runs/{id}/events`
- `POST /runs/{id}/stop`

When public REST lacks selected-profile routing, the sidecar may execute a selected profile through the verified CLI mechanism `hermes -p <profile> -z <prompt>`. The sidecar route is loopback-only, uses bounded subprocess arguments, does not call `hermes profile use`, and returns structured routing metadata. If CLI profile execution is unavailable, sidecar run endpoints return structured unsupported responses with the exact blocker.

## Test Mock Behavior

Mock behavior is retained for test coverage and explicit development harnesses. It is not a production fallback and should not be used to make unavailable Hermes state appear real.

- The app singleton bridge persists the latest mock snapshot to `localStorage`.
- The app singleton bridge broadcasts mock updates through `BroadcastChannel` so the Pet Mode webview and Guild Hall webview can observe the same local state.
- The app singleton bridge also listens for `storage` events as a fallback sync path when another webview writes the mock snapshot.
- Restored and remote snapshots are sanitized before UI consumption: the fixed v0 roster is restored, invalid profile references are repaired or dropped, malformed collections fall back safely, and malformed system status or pet position values fall back to seeded mock defaults.
- Remote terminal states stop local mock lifecycle timers so one webview cannot complete a task after another webview blocks or errors it.
- Test bridge instances are isolated and do not use persistence or cross-webview broadcast.
- Mock lifecycle timers are owned by the webview that creates or revises a task.

## Real Runtime Behavior

- Real task execution uses Gateway REST runs and event streams.
- Sidecar availability is checked separately from gateway availability.
- Dashboard compatibility availability is checked separately from gateway availability.
- Gateway unavailability is surfaced as unavailable/error in normal runtime; it must not silently substitute mock data.
- Sidecar unavailability does not affect Gateway REST task execution; selected-profile fallback execution is labeled unavailable when sidecar is needed but unavailable.
- Dashboard compatibility unavailability or missing session-token access does not affect task execution; affected surfaces are labeled unavailable.
- Real mode never falls back to mock when gateway health fails.
- Running gateway tasks can be stopped only through explicit user action and only after the run id is known.
- Gateway run-status timeline entries are bridge-visible status evidence and should not be rendered as Pet chat bubbles.
