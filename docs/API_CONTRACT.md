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

- Gateway REST: Hermes API server, default `http://127.0.0.1:8642`.
- Local Hermes state: Guild/Tauri bridge reads of the same local Hermes files/runtime state the official dashboard backend reads.
- Dashboard compatibility: optional Hermes dashboard backend calls, default `http://127.0.0.1:9119`; protected calls require an explicit `X-Hermes-Session-Token`.
- CLI/PTY: official Hermes CLI or dashboard PTY only when Gateway REST and local state are unavailable.
- Guild-owned: active pet selection, direct assignment, review approval/revision, task brief, desktop/Pet state, and report-card normalization.
- Mock fallback: mock bridge data shown only in mock mode or auto fallback.
- Unavailable: real mode has no verified source and must not invent data.

`SystemStatus` exposes `hermesApiBaseUrl`, optional `hermesDashboardBaseUrl`, `dashboardAvailable`, and `dataSources` so UI surfaces can distinguish gateway REST, local Hermes state, dashboard compatibility, Guild-owned state, mock fallback, and unavailable data.

`SystemStatus.operationalData` exposes concise read-only summaries for real gateway/local/compatibility surfaces: sessions, logs, analytics, cron jobs, config/defaults/schema, redacted env status, and gateway jobs. Env summaries must count configured keys only and must not include secret values.

Current gateway REST client coverage includes:

- `GET /health`
- `GET /health/detailed`
- `GET /v1/models`
- `GET /v1/capabilities`
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

Protected dashboard compatibility endpoints are skipped unless an explicit session token is available. The official dashboard token is generated per dashboard process and is not persisted by Hermes Guild.

## Mock v0 Runtime Behavior

- The app singleton bridge persists the latest mock snapshot to `localStorage`.
- The app singleton bridge broadcasts mock updates through `BroadcastChannel` so the Pet Mode webview and Guild Hall webview can observe the same local state.
- The app singleton bridge also listens for `storage` events as a fallback sync path when another webview writes the mock snapshot.
- Restored and remote snapshots are sanitized before UI consumption: the fixed v0 roster is restored, invalid profile references are repaired or dropped, malformed collections fall back safely, and malformed system status or pet position values fall back to seeded mock defaults.
- Remote terminal states stop local mock lifecycle timers so one webview cannot complete a task after another webview blocks or errors it.
- Test bridge instances are isolated and do not use persistence or cross-webview broadcast.
- Mock lifecycle timers are owned by the webview that creates or revises a task.

## Real Runtime Behavior

- Real task execution uses Gateway REST runs and event streams.
- Dashboard compatibility availability is checked separately from gateway availability.
- Gateway availability decides whether auto mode uses real execution or mock fallback.
- Dashboard compatibility unavailability or missing session-token access does not force task execution to mock fallback; affected surfaces are labeled unavailable.
- Real mode never falls back to mock when gateway health fails.
- Running gateway tasks can be stopped only through explicit user action and only after the run id is known.
- Gateway run-status timeline entries are bridge-visible status evidence and should not be rendered as Pet chat bubbles.
