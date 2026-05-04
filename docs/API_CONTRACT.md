# Hermes Guild v0 API Contract

This contract defines the first mock Hermes Bridge surface. UI components should depend on these game-readable objects instead of Hermes runtime internals.

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

## Mock v0 Runtime Behavior

- The app singleton bridge persists the latest mock snapshot to `localStorage`.
- The app singleton bridge broadcasts mock updates through `BroadcastChannel` so the Pet Mode webview and Guild Hall webview can observe the same local state.
- The app singleton bridge also listens for `storage` events as a fallback sync path when another webview writes the mock snapshot.
- Restored and remote snapshots are sanitized before UI consumption: the fixed v0 roster is restored, invalid profile references are repaired or dropped, malformed collections fall back safely, and malformed system status or pet position values fall back to seeded mock defaults.
- Remote terminal states stop local mock lifecycle timers so one webview cannot complete a task after another webview blocks or errors it.
- Test bridge instances are isolated and do not use persistence or cross-webview broadcast.
- Mock lifecycle timers are owned by the webview that creates or revises a task.

## v0 Source Boundaries

- Guild-maintained: active profile, direct assignment, pet position, review actions, user-facing timeline.
- Mock bridge-derived: agent availability, task lifecycle, progress, completion, errors.
- Guild-generated: report card, facts, assumptions, known gaps, rewards, normalized timeline.
- Hermes-provided: none in the first mock implementation.
