# Hermes Guild v0 Tasks

Codex Goal rule:
Work through tasks in milestone order. Complete as much of the v0 loop as possible in one long-horizon Goal session.

After each milestone:
- keep the app runnable
- update completed checkboxes
- append a checkpoint to `docs/EXECUTION_LOG.md`
- run relevant build/test/lint commands if available
- continue to the next milestone unless blocked

Do not expand v0 scope. Deferred features must be recorded under Scope Guard in `docs/EXECUTION_LOG.md`.

## Phase 0 — Setup

- [x] T001 Read `docs/DESIGN.md`, `docs/REFERENCES.md`, `docs/AGENT_RULES.md`, and `docs/PRD.md`; summarize implementation constraints in `docs/EXECUTION_LOG.md`.
- [x] T002 Create initial API contract for `Agent`, `Task`, `TimelineEvent`, `Artifact`, `ReportCard`, and `BridgeEvent`.
- [x] T003 Create initial project scaffold for Tauri + React.

## Phase 1 — Desktop Shell

- [x] T004 Make app launch locally.
- [x] T005 Create one active pet window.
- [x] T006 Add pet -> Guild Hall open action.
- [x] T007 Persist or mock pet position if feasible; otherwise document fallback.

## Phase 2 — Mock Hermes Bridge

- [x] T008 Implement mock agents: Researcher, Builder, Reviewer.
- [x] T009 Implement active profile selection.
- [x] T010 Implement task creation and direct assignment.
- [x] T011 Implement mock lifecycle events: created, assigned, running, progress, completed, needs_review, approved, error.

## Phase 3 — Quest Loop

- [x] T012 Pet input creates a task for the active profile.
- [x] T013 Guild Hall shows active profile, active quest, and pending reviews.
- [x] T014 Quest Board shows task list.
- [x] T015 Task Detail shows task timeline.
- [x] T016 Timeline updates from mock bridge events.

## Phase 4 — Review Loop

- [x] T017 Generate Quest Report Card when mock task completes.
- [x] T018 Show completed tasks in Review.
- [x] T019 Implement Approve.
- [x] T020 Implement Revise with instructions.
- [x] T021 Revised task re-enters mock execution and returns updated report.

## Phase 5 — Error / Polish / Handoff

- [x] T022 Add basic error state visible on pet and task detail.
- [x] T023 Update README with setup, run commands, and what is mocked.
- [x] T024 Update `docs/EXECUTION_LOG.md` with final status, remaining gaps, and next recommended work.
- [x] T025 Run available build/test/lint commands and record results.

## Phase 6 — API-First Real Hermes Bridge

- [x] T026 Create short `docs/HERMES_INTEGRATION_PLAN.md`.
- [x] T027 Preserve the existing MockHermesBridge behavior.
- [x] T028 Add a stable UI-facing bridge interface shared by mock and real bridges.
- [x] T029 Add RealHermesBridge behind the same interface.
- [x] T030 Add bridge factory selection for `mock`, `real`, and `auto`.
- [x] T031 Add local config support for bridge mode and Hermes API base URL.
- [x] T032 Route pet and Quest Board tasks through the selected bridge in real mode.
- [x] T033 Capture Hermes API run output and convert it into a Quest Report Card.
- [x] T034 Surface real Hermes API failures in pet state, task detail, timeline, and execution docs.
- [x] T035 Show bridge mode / fallback status in the visible system strip.
- [x] T036 Update README with mock / real / auto setup.
- [x] T037 Run relevant build/test/lint verification.
