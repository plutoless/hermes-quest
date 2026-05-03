# Execution Log

This file is the shared status, decision, and progress log for Codex Goal style long-horizon execution.

Use:
- `docs/PRD.md` for the stable v0 target
- `docs/TASKS.md` for the milestone plan
- this file for current status, decisions, checkpoints, blockers, and remaining gaps

## Current Objective
- Replace the subprocess RealHermesBridge with an API-first Hermes bridge while preserving the existing mock bridge and v0 loop.

## Current Milestone
- Phase 6 — API-first Real Hermes Bridge

## Current Status
- React v0 loop is implemented and runnable through Vite.
- Tauri native shell launches on macOS with separate Guild Hall and Pet windows.
- MockHermesBridge remains available.
- RealHermesBridge is implemented as a Hermes API adapter behind the same UI-facing bridge interface.
- Bridge factory supports `mock`, `real`, and `auto`; auto falls back to mock when real Hermes is unavailable.
- Codex Goal status: active for API-first real Hermes integration.

## Decisions

### D001 — One active pet in v0
Status: accepted  
Reason: Multiple pets add desktop window complexity and are deferred to v0.5.

### D002 — `docs/DESIGN.md` is the product source of truth
Status: accepted  
Reason: Reference material should inform implementation, not override product scope.

### D003 — Separate task lifecycle state from pet display state
Status: accepted  
Reason: `idle` and `thinking` describe agent/pet behavior, while tasks need lifecycle states such as `created` and `assigned`.

### D004 — Use `docs/TASKS.md` as a Codex Goal milestone plan
Status: accepted  
Reason: Codex Goal / long-horizon execution should work continuously through milestones, not stop after each single checkbox task.

### D005 — Hermes runtime notes do not block mock-first UI coding
Status: accepted  
Reason: v0 uses a mock Hermes Bridge first and excludes full Hermes integration, so Hermes runtime/WebUI notes should be required before real integration, not before the first Tauri shell and mock bridge implementation.

### D006 — React dev mode is the runnable milestone gate until Rust is available
Status: accepted  
Reason: The Tauri config and Rust scaffold are present, but this environment cannot run `cargo metadata`; Vite keeps the product loop runnable while native shell verification remains a documented blocker.

### D007 — Pet position persistence is mocked in the bridge
Status: accepted  
Reason: Native window position persistence depends on verified Tauri window APIs; v0 keeps a bridge-owned `petPosition` field so UI code does not depend on platform behavior yet.

### D008 — Tauri pet route renders Pet Mode only
Status: accepted  
Reason: The `pet` window is configured for `/?mode=pet`; rendering only the compact pet surface there keeps native shell behavior aligned with the one-active-pet v0 requirement.

### D009 — Mock bridge app singleton syncs across webviews
Status: accepted  
Reason: Tauri `main` and `pet` windows run separate webviews, so the app singleton bridge persists snapshots to `localStorage` and broadcasts updates with `BroadcastChannel` while keeping tests isolated.

### D010 — Enable macOS private API for transparent Pet Mode
Status: accepted  
Reason: Tauri requires `app.macOSPrivateApi` for transparent windows on macOS; the v0 pet window explicitly depends on transparency, undecorated chrome, and always-on-top behavior.

### D011 — Minimal real bridge uses Hermes CLI one-shot
Status: accepted  
Reason: `hermes -z/--oneshot` is the least invasive available integration path for a first real adapter; it returns final stdout without requiring gateway, WebUI, memory UI, or session browser scope.

### D012 — Bridge selection is local-config driven
Status: accepted  
Reason: `mock`, `real`, and `auto` modes need to be switchable without redesigning the v0 UI; local storage keeps the app runnable and lets users configure the Hermes API base URL.

### D013 — Auto mode falls back to mock
Status: accepted  
Reason: Hermes availability can vary by machine and runtime; auto mode should preserve the v0 loop by using mock behavior when the real API path is unavailable.

### D014 — Real bridge is API-first
Status: accepted  
Reason: Hermes Guild is a desktop workbench, not a CLI wrapper. Real mode should use the Hermes API server (`/health`, `/v1/runs`, and `/v1/runs/{run_id}/events`) instead of spawning Hermes subprocesses for normal task execution.

### D015 — Pet window is not pinned above Guild Hall
Status: accepted  
Reason: Always-on-top makes the v0 pet obscure the main Guild Hall window. Pet Mode should be a separate movable companion window, not a modal overlay over the primary work surface.

### D016 — Native Hermes API calls bypass WebView CORS
Status: accepted
Reason: Tauri is native shell plus WebView UI. Browser-origin rules still apply to `fetch()` from React, so native mode should call the Hermes API through a Tauri command and let Rust perform local HTTP requests without WebView CORS constraints.

## Checkpoints

### 2026-05-03 21:13 CST — Documentation setup

#### Goal
Create execution rules and prepare project docs for implementation.

#### Changed
- Added `docs/AGENT_RULES.md`.
- Added initial `docs/EXECUTION_LOG.md`.
- Updated `docs/REFERENCES.md` to time-box reference analysis.
- Split task lifecycle states from pet display states in `docs/DESIGN.md`.

#### Works
- Documentation established the v0 loop, scope guard, and source-of-truth order.

#### Mocked
- Nothing.

#### Tested
- Read back changed docs.

#### Blockers
- None.

#### Next
- Adapt the execution docs for the selected long-horizon workflow.

### 2026-05-03 21:18 CST — Task queue and PRD added

#### Goal
Add stable PRD and checkbox task list.

#### Changed
- Added `docs/PRD.md`.
- Added `docs/TASKS.md`.
- Updated `docs/AGENT_RULES.md` and `docs/EXECUTION_LOG.md` with an initial task queue model.

#### Works
- PRD and task list are useful inputs, but the stop-after-one-task rule is too conservative for Codex Goal.

#### Mocked
- Nothing.

#### Tested
- Read back changed docs.

#### Blockers
- None.

#### Next
- Replace single-task-stop language with Codex Goal milestone execution.

### 2026-05-03 21:22 CST — Switched to Codex Goal execution model

#### Goal
Update execution docs so Codex can work continuously through milestones while maintaining checkpoints.

#### Changed
- Replaced single-task-stop rule with Codex Goal rule in `docs/AGENT_RULES.md`.
- Changed `docs/TASKS.md` from a one-task-per-iteration queue into a milestone plan.
- Converted this log into Codex Goal status, decisions, checkpoints, blockers, and gaps.
- Added guidance in `docs/REFERENCES.md` that optional reference notes should not replace implementation.

#### Works
- The docs now support long-horizon milestone execution while preserving scope guardrails.

#### Mocked
- Nothing.

#### Tested
- Read back `docs/AGENT_RULES.md`, `docs/TASKS.md`, `docs/EXECUTION_LOG.md`, and the updated `docs/REFERENCES.md` section.

#### Blockers
- None.

#### Next
- Begin Phase 0 tasks: read source docs, summarize constraints, define the API contract, and scaffold the app.

### 2026-05-03 21:25 CST — Deferred Hermes integration notes

#### Goal
Prevent Hermes runtime/WebUI research from blocking the first mock-first product implementation pass.

#### Changed
- Updated `docs/REFERENCES.md` so only `docs/TAURI_SPIKE_PLAN.md`, `docs/API_CONTRACT.md`, `docs/PRD.md`, `docs/TASKS.md`, and `docs/EXECUTION_LOG.md` are mandatory before product UI coding.
- Moved `docs/HERMES_NOTES.md` and `docs/HERMES_WEBUI_ANALYSIS.md` to the pre-real-Hermes-integration stage.

#### Works
- Codex Goal can start with `TAURI_SPIKE_PLAN.md`, `API_CONTRACT.md`, Tauri shell, mock bridge, and the pet-to-review loop without being blocked by full Hermes runtime analysis.

#### Mocked
- Nothing.

#### Tested
- Read back the required pre-implementation docs section in `docs/REFERENCES.md` and this checkpoint.

#### Blockers
- None.

#### Next
- Begin Phase 0 tasks and avoid expanding documentation before implementation.

### 2026-05-03 21:42 CST — v0 mock loop implemented

#### Goal
Implement as much of the Hermes Guild v0 loop as possible in milestone order while keeping the app runnable.

#### Changed
- Added `docs/API_CONTRACT.md` for `Agent`, `Task`, `TimelineEvent`, `Artifact`, `ReportCard`, `BridgeEvent`, and bridge methods.
- Added `docs/TAURI_SPIKE_PLAN.md` for the native pet/dashboard window spike.
- Added a Tauri + React scaffold: `package.json`, Vite/TypeScript config, `src-tauri/`, and React entry files.
- Implemented a mock Hermes Bridge with Researcher, Builder, Reviewer, active profile selection, direct task creation, lifecycle timers, report generation, approve, revise, and mock gateway error.
- Built the Guild Hall, Pet Mode panel, Quest Board, Task Detail timeline, and Review report card flow.
- Added `README.md` with setup, run commands, working behavior, and mocked behavior.
- Updated `docs/TASKS.md` through Phase 5.

#### Works
- `bun run dev` launches the React app at `http://127.0.0.1:1420/`.
- Pet input creates a quest assigned to the active profile.
- The pet, Guild Hall, Quest Board, task detail, and Review all read the same mock bridge snapshot.
- Mock lifecycle progresses through assignment, running, progress, artifacts, completion, and review required.
- Quest Report Cards separate facts, assumptions, known gaps, review items, artifacts, and recommended next action.
- Revise creates a new execution pass for the same profile and records a revision timeline event.
- Approve marks the revised report approved and returns the active agent to idle.
- Error button emits a visible mock gateway error on the pet/task/system status.

#### Mocked
- Hermes runtime execution.
- Agent availability.
- Lifecycle/progress events.
- Artifact production.
- Quest Report Card generation.
- Gateway/provider error events.
- Pet position persistence.

#### Tested
- `bun install`: passed.
- `bun run build`: passed; Vite production build completed.
- `bun run lint`: passed; TypeScript build check completed.
- `bun run tauri:dev`: failed because `cargo` is not installed in the environment.
- Browser verification with `agent-browser`: launched Vite app, submitted a pet quest, waited for completion, opened Review, requested a revision, waited for the revision run, and approved the returned report.

#### Blockers
- Native Tauri runtime verification is blocked by missing Rust/Cargo.
- Transparent always-on-top pet window behavior is configured but not verified.
- Real Hermes integration remains intentionally deferred.

#### Next
- Install/enable Rust and platform Tauri prerequisites, then run `bun run tauri:dev`.
- Verify `main` and `pet` windows separately, including transparency, decorations, always-on-top, focus, and position persistence.
- Replace mock lifecycle events with Hermes Bridge adapters once Hermes runtime signals are available.

### 2026-05-03 21:45 CST — Mock bridge tests added

#### Goal
Add command-level verification for the local bridge lifecycle instead of relying only on manual browser inspection.

#### Changed
- Added `bun run test`.
- Added `src/bridge/mockHermesBridge.test.ts`.
- Exported `createMockHermesBridge()` for isolated tests.
- Switched lifecycle timers to global timer APIs so bridge tests can run outside the browser.
- Excluded test files from the browser app TypeScript build.
- Updated `README.md` with the test command.

#### Works
- Tests cover initial active Builder pet state, direct pet task creation, mock completion to report card, revise/rerun/approve, and mock gateway error surfacing.

#### Mocked
- Same as v0: Hermes execution, lifecycle signals, artifacts, reports, provider errors, pet position.

#### Tested
- `bun run test`: passed, 5 tests / 24 assertions.
- `bun run build`: passed.
- `bun run lint`: passed.
- `bun run tauri:dev`: still blocked by missing `cargo`.
- `sudo apt-get update`: blocked because sudo requires an interactive password.
- `bunx tauri info`: reported missing `webkit2gtk-4.1`, `rsvg2`, `rustc`, `Cargo`, and `rustup`; command did not exit cleanly after printing environment details.

#### Blockers
- Cannot install Rust/Cargo or Linux Tauri system dependencies from this session without sudo password or another installation path.

#### Next
- User or environment owner should install Rust/Cargo plus Tauri Linux dependencies, then rerun `bun run tauri:dev`.
- On Ubuntu 24.04, expected packages are `cargo`, `rustc`, `pkg-config`, `libwebkit2gtk-4.1-dev`, and `librsvg2-dev`.

### 2026-05-03 21:47 CST — Pet window route tightened

#### Goal
Make the configured Tauri `pet` window route render the compact Pet Mode surface instead of the full dashboard.

#### Changed
- Added `/?mode=pet` route detection in `src/App.tsx`.
- Pet-only mode now renders only the active pet panel.
- Pet Hall action attempts to focus the Tauri `main` webview window and falls back to the in-page Guild Hall when running in browser dev mode.
- Added CSS for `.pet-window-shell`.

#### Works
- Browser verification of `http://127.0.0.1:1421/?mode=pet` showed only Pet Mode controls: active profile, task input, Send, and Hall.

#### Mocked
- Native window focus/open behavior remains unverified until Tauri can run.

#### Tested
- `bun run build`: passed.
- `bun run lint`: passed.
- `bun run test`: passed, 5 tests / 24 assertions.
- Browser route check with `agent-browser`: passed for `/?mode=pet`.

#### Blockers
- Native Tauri verification remains blocked by missing Cargo and unavailable sudo installation path.

### 2026-05-03 21:50 CST — Completion audit documented

#### Goal
Convert the completion audit into a durable prompt-to-artifact checklist.

#### Changed
- Added `docs/COMPLETION_AUDIT.md`.
- Mapped objective requirements, `docs/TASKS.md`, PRD acceptance criteria, command results, mocked behavior, and blockers to concrete evidence.

#### Works
- The audit distinguishes verified web/mock behavior from scaffolded but unverified native Tauri behavior.

#### Mocked
- No new mocked behavior.

#### Tested
- `timeout 15s bunx tauri info`: reported missing `webkit2gtk-4.1`, `rsvg2`, `rustc`, `Cargo`, and `rustup`; exited with code 124 after printing environment details.
- `bun run build`: passed.
- `bun run lint`: passed.
- `bun run test`: passed, 5 tests / 24 assertions.

#### Blockers
- Same native blocker: missing system prerequisites and no available sudo password path.

#### Next
- Install native prerequisites, then rerun `bun run tauri:dev`.

### 2026-05-03 21:53 CST — Native prerequisite checker added

#### Goal
Make the native Tauri blocker executable and repeatable.

#### Changed
- Added `scripts/check-native-prereqs.sh`.
- Added `bun run check:native`.
- Added `bun run verify:web` for the web-side build/lint/test suite.
- Updated `README.md` and `docs/COMPLETION_AUDIT.md` with the native prerequisite check and corrected Ubuntu install command.

#### Works
- `bun run verify:web` runs lint, mock bridge tests, and production build in sequence.
- `bun run check:native` reports each missing native prerequisite with the next setup command.

#### Mocked
- No new mocked behavior.

#### Tested
- `bun run verify:web`: passed; lint passed, tests passed with 5 tests / 24 assertions, production build passed.
- `bun run check:native`: failed as expected, reporting missing `cargo`, `rustc`, `rustup`, `pkg-config`, `webkit2gtk-4.1`, and `librsvg-2.0`.

#### Blockers
- Native prerequisites remain unavailable in this environment.

#### Next
- Install `cargo`, `rustc`, `pkg-config`, `libwebkit2gtk-4.1-dev`, and `librsvg2-dev`, then rerun `bun run check:native` and `bun run tauri:dev`.

### 2026-05-03 21:54 CST — Native checker output tightened

#### Goal
Make the native prerequisite failure easier to interpret when `pkg-config` itself is missing.

#### Changed
- Updated `scripts/check-native-prereqs.sh` to skip package checks with an explicit message when `pkg-config` is unavailable.
- Marked `scripts/check-native-prereqs.sh` executable.

#### Works
- Native check now reports missing commands first and clearly marks WebKit/rsvg package checks as skipped until `pkg-config` exists.

#### Mocked
- No new mocked behavior.

#### Tested
- `bun run verify:web`: passed; lint passed, tests passed with 5 tests / 24 assertions, production build passed.
- `bun run check:native`: failed as expected, reporting missing `cargo`, `rustc`, `rustup`, and `pkg-config`; WebKit/rsvg checks skipped because `pkg-config` is missing.

#### Blockers
- Native prerequisites remain unavailable in this environment.

#### Next
- Install native prerequisites, then rerun `bun run check:native` and `bun run tauri:dev`.

### 2026-05-03 21:55 CST — Native verification checklist added

#### Goal
Provide a concrete pass/fail checklist for the first environment that can run Tauri.

#### Changed
- Added `docs/NATIVE_VERIFICATION.md`.
- Updated `docs/COMPLETION_AUDIT.md` to include the native verification handoff.

#### Works
- Native verification now has explicit prerequisites, launch commands, window expectations, pass criteria, known v0 limits, and execution log reporting instructions.

#### Mocked
- No new mocked behavior.

#### Tested
- Documentation-only change; latest web verification remains `bun run verify:web` passing.
- Native verification remains blocked until prerequisites are installed.

#### Blockers
- Native prerequisites remain unavailable in this environment.

#### Next
- Install native prerequisites and run the checklist in `docs/NATIVE_VERIFICATION.md`.

### 2026-05-03 21:56 CST — README native handoff linked

#### Goal
Make the native verification checklist discoverable from the primary setup document.

#### Changed
- Updated `README.md` to point to `docs/NATIVE_VERIFICATION.md` after the native prerequisite install command.

#### Works
- The README now links run commands, web verification, native prerequisite checking, native setup, and the native pass/fail checklist.

#### Mocked
- No new mocked behavior.

#### Tested
- `bun run verify:web`: passed; lint passed, tests passed with 5 tests / 24 assertions, production build passed.
- `bun run check:native`: failed as expected, reporting missing `cargo`, `rustc`, `rustup`, and `pkg-config`; WebKit/rsvg checks skipped because `pkg-config` is missing.

#### Blockers
- Native prerequisites remain unavailable in this environment.

#### Next
- Install native prerequisites and run `docs/NATIVE_VERIFICATION.md`.

### 2026-05-03 21:57 CST — Pet drag region added

#### Goal
Align the undecorated Tauri pet window scaffold with v0 drag-to-position behavior.

#### Changed
- Added `data-tauri-drag-region` to the Pet Mode drag strip in `src/App.tsx`.
- Added move cursor and disabled text selection for the drag strip in `src/styles.css`.

#### Works
- Browser mode remains unaffected.
- Native Tauri should treat the Pet Mode header as a draggable region once the native runtime can launch.

#### Mocked
- Pet position persistence remains bridge-mocked.

#### Tested
- `bun run verify:web`: passed; lint passed, tests passed with 5 tests / 24 assertions, production build passed.
- `bun run check:native`: failed as expected, reporting missing `cargo`, `rustc`, `rustup`, and `pkg-config`; WebKit/rsvg checks skipped because `pkg-config` is missing.

#### Blockers
- Native drag behavior cannot be verified until native prerequisites are installed.

#### Next
- Install native prerequisites and verify the drag region in Tauri.

### 2026-05-03 21:59 CST — Mock bridge cross-webview sync added

#### Goal
Make the mock bridge viable for separate Tauri Pet Mode and Guild Hall webviews.

#### Changed
- Updated `src/bridge/mockHermesBridge.ts` so the app singleton persists snapshots to `localStorage`.
- Added `BroadcastChannel` update propagation for app singleton bridge instances.
- Kept `createMockHermesBridge()` test instances isolated by default.
- Updated `docs/API_CONTRACT.md` and `docs/COMPLETION_AUDIT.md` with the mock runtime behavior.

#### Works
- Browser/app singleton state has a local persistence and broadcast path for separate webviews.
- Existing isolated bridge tests still pass.

#### Mocked
- Hermes execution remains mocked.
- Mock lifecycle timers are still owned by the webview that creates or revises a task.

#### Tested
- `bun run verify:web`: passed; lint passed, tests passed with 5 tests / 24 assertions, production build passed.
- `bun run check:native`: failed as expected, reporting missing `cargo`, `rustc`, `rustup`, and `pkg-config`; WebKit/rsvg checks skipped because `pkg-config` is missing.

#### Blockers
- Cross-webview sync cannot be runtime-verified until Tauri can launch.

#### Next
- Verify Pet/Guild Hall sync in native Tauri once prerequisites are installed.

### 2026-05-03 22:00 CST — Mock bridge storage-event fallback added

#### Goal
Make Pet/Guild Hall mock sync less dependent on `BroadcastChannel` alone.

#### Changed
- Updated `src/bridge/mockHermesBridge.ts` so persisted mock snapshots use the same event envelope as broadcast messages.
- Added a `storage` event listener fallback for cross-webview mock state updates.
- Updated `docs/API_CONTRACT.md` with the fallback behavior.

#### Works
- App singleton bridge can sync through `BroadcastChannel` or same-origin storage events.
- Test bridge instances remain isolated and non-persistent by default.

#### Mocked
- Hermes execution remains mocked.

#### Tested
- `bun run verify:web`: passed; lint passed, tests passed with 5 tests / 24 assertions, production build passed.
- `bun run check:native`: failed as expected, reporting missing `cargo`, `rustc`, `rustup`, and `pkg-config`; WebKit/rsvg checks skipped because `pkg-config` is missing.

#### Blockers
- Cross-webview sync still needs native Tauri runtime verification after prerequisites are installed.

#### Next
- Verify Pet/Guild Hall sync in native Tauri once prerequisites are installed.

### 2026-05-03 22:02 CST — Persistent bridge test added

#### Goal
Cover the mock bridge local persistence path with an automated test.

#### Changed
- Added a test for persistent bridge mode in `src/bridge/mockHermesBridge.test.ts`.
- The test uses fake `localStorage`, disables `BroadcastChannel`, verifies the stored event envelope, and verifies snapshot restoration.
- Updated `docs/COMPLETION_AUDIT.md` with the stronger bridge sync evidence.

#### Works
- Persistent bridge snapshot storage and restore behavior now has command-level coverage.

#### Mocked
- Test uses fake `localStorage`; native same-origin storage events still require Tauri runtime verification.

#### Tested
- `bun run verify:web`: passed; lint passed, tests passed with 6 tests / 29 assertions, production build passed.
- `bun run check:native`: failed as expected, reporting missing `cargo`, `rustc`, `rustup`, and `pkg-config`; WebKit/rsvg checks skipped because `pkg-config` is missing.

#### Blockers
- Native cross-webview storage and broadcast behavior still requires Tauri runtime verification.

#### Next
- Verify Pet/Guild Hall sync in native Tauri once prerequisites are installed.

### 2026-05-03 22:03 CST — Storage-event fallback test added

#### Goal
Cover the mock bridge storage-event fallback used for cross-webview sync.

#### Changed
- Added a test that installs fake `window` storage listeners, simulates a second bridge writing an event envelope, dispatches the storage event, and verifies the receiving bridge updates.
- Updated `docs/COMPLETION_AUDIT.md` with the stronger bridge sync evidence.

#### Works
- Persistent bridge storage envelope, restore, and storage-event receive paths now have automated coverage.

#### Mocked
- Test uses fake `window` and fake `localStorage`; native webview behavior still requires Tauri runtime verification.

#### Tested
- `bun run verify:web`: passed; lint passed, tests passed with 7 tests / 33 assertions, production build passed.
- `bun run check:native`: failed as expected, reporting missing `cargo`, `rustc`, `rustup`, and `pkg-config`; WebKit/rsvg checks skipped because `pkg-config` is missing.

#### Blockers
- Native cross-webview sync still requires Tauri runtime verification.

#### Next
- Verify Pet/Guild Hall sync in native Tauri once prerequisites are installed.

### 2026-05-03 22:05 CST — BroadcastChannel sync test added

#### Goal
Cover the primary mock bridge cross-webview sync path.

#### Changed
- Added a fake `BroadcastChannel` test for persistent bridge mode in `src/bridge/mockHermesBridge.test.ts`.
- Updated `docs/COMPLETION_AUDIT.md` with BroadcastChannel sync evidence.

#### Works
- Persistent bridge storage envelope, restore, storage-event fallback, and BroadcastChannel receive paths now have automated coverage.

#### Mocked
- Test uses a fake BroadcastChannel; native webview behavior still requires Tauri runtime verification.

#### Tested
- `bun run verify:web`: passed; lint passed, tests passed with 8 tests / 36 assertions, production build passed.
- `bun run check:native`: failed as expected, reporting missing `cargo`, `rustc`, `rustup`, and `pkg-config`; WebKit/rsvg checks skipped because `pkg-config` is missing.

#### Blockers
- Native cross-webview sync still requires Tauri runtime verification.

#### Next
- Verify Pet/Guild Hall sync in native Tauri once prerequisites are installed.

### 2026-05-03 22:06 CST — Tauri config check added

#### Goal
Validate the native window scaffold without requiring Cargo or WebKitGTK.

#### Changed
- Added `scripts/check-tauri-config.mjs`.
- Added `bun run check:tauri-config`.
- Included `check:tauri-config` in `bun run verify:web`.
- Updated `README.md` and `docs/COMPLETION_AUDIT.md` with the config check evidence.

#### Works
- The script validates `src-tauri/tauri.conf.json` against installed Tauri CLI schema properties for required window keys.
- The script validates Hermes Guild v0 expectations for the `pet` window: `/?mode=pet`, undecorated, transparent, and always on top.

#### Mocked
- No new mocked behavior.

#### Tested
- `bun run verify:web`: passed; Tauri config check passed, lint passed, tests passed with 8 tests / 36 assertions, production build passed.
- `bun run check:native`: failed as expected, reporting missing `cargo`, `rustc`, `rustup`, and `pkg-config`; WebKit/rsvg checks skipped because `pkg-config` is missing.

#### Blockers
- Native runtime launch remains blocked by missing prerequisites.

#### Next
- Install native prerequisites and run `docs/NATIVE_VERIFICATION.md`.

### 2026-05-03 22:08 CST — Vite dev port locked for Tauri

#### Goal
Prevent Tauri from loading a stale dev URL if Vite silently switches ports.

#### Changed
- Set Vite `server.strictPort` to `true` for port `1420`.
- Updated `scripts/check-tauri-config.mjs` to verify the Vite port, strict port setting, and Tauri `build.devUrl` alignment.
- Updated `docs/NATIVE_VERIFICATION.md` and `docs/COMPLETION_AUDIT.md` with the port requirement/evidence.

#### Works
- `bun run check:tauri-config` now fails if Vite can drift away from the Tauri dev URL.

#### Mocked
- No new mocked behavior.

#### Tested
- `bun run verify:web`: passed; Tauri config check passed, lint passed, tests passed with 8 tests / 36 assertions, production build passed.
- `bun run check:native`: failed as expected, reporting missing `cargo`, `rustc`, `rustup`, and `pkg-config`; WebKit/rsvg checks skipped because `pkg-config` is missing.

#### Blockers
- Native runtime launch remains blocked by missing prerequisites.

#### Next
- Install native prerequisites and run `docs/NATIVE_VERIFICATION.md`.

### 2026-05-03 22:10 CST — Revision metadata emits immediately

#### Goal
Keep Pet/Guild Hall webviews in sync immediately when a revision task is linked to its original task.

#### Changed
- Updated `src/bridge/mockHermesBridge.ts` to emit after `revisionOfTaskId` is attached to a revision task.
- Added a test assertion that revision task metadata is included in a `revision_requested` event.
- Updated `docs/COMPLETION_AUDIT.md` test assertion count.

#### Works
- Other bridge subscribers no longer need to wait for the next mock lifecycle progress event to observe the revision/original relationship.

#### Mocked
- Hermes execution remains mocked.

#### Tested
- `bun run verify:web`: passed; Tauri config check passed, lint passed, tests passed with 8 tests / 37 assertions, production build passed.
- `bun run check:native`: failed as expected, reporting missing `cargo`, `rustc`, `rustup`, and `pkg-config`; WebKit/rsvg checks skipped because `pkg-config` is missing.

#### Blockers
- Native runtime launch remains blocked by missing prerequisites.

#### Next
- Install native prerequisites and run `docs/NATIVE_VERIFICATION.md`.

### 2026-05-03 22:12 CST — Active profile sync coverage added

#### Goal
Verify the shared mock bridge keeps Pet Mode and Guild Hall aligned when the active profile changes.

#### Changed
- Added a persistent bridge `BroadcastChannel` test for `setActiveProfile()`.
- Updated `docs/COMPLETION_AUDIT.md` to reflect active-profile cross-window sync coverage.

#### Works
- A second persistent bridge instance now observes the active profile id and `activeInPet` flags after another instance changes the profile.

#### Mocked
- Broadcast delivery is still covered with a fake `BroadcastChannel`; native webview delivery remains part of the Tauri verification handoff.

#### Tested
- `bun run test`: passed with 9 tests / 40 assertions.
- `bun run verify:web`: passed; Tauri config check passed, lint passed, tests passed with 9 tests / 40 assertions, production build passed.
- `bun run check:native`: failed as expected, reporting missing `cargo`, `rustc`, `rustup`, and `pkg-config`; WebKit/rsvg checks skipped because `pkg-config` is missing.
- `bunx vite --host 127.0.0.1 --port 1422`: started a browser-test dev server because configured Tauri port 1420 and fallback 1421 were already occupied in this environment.
- agent-browser browser flow on `http://127.0.0.1:1422/`: created a pet quest, waited for mock completion, opened Review, requested a revision rerun, waited for the revised report, and approved the report. Review action clicks were confirmed with DOM click evaluation after accessibility-ref clicks did not visibly trigger.

#### Blockers
- Native runtime launch remains blocked by missing prerequisites.

#### Next
- Install native prerequisites and run `docs/NATIVE_VERIFICATION.md`.

### 2026-05-03 22:21 CST — Fresh audit verification

#### Goal
Re-check the current workspace against the active objective instead of relying on earlier progress notes.

#### Checked
- Confirmed app route at `http://127.0.0.1:1422/` is running for browser testing.
- Confirmed pet-only route at `http://127.0.0.1:1422/?mode=pet` renders only Pet Mode controls.
- Re-exercised the browser-visible loop with agent-browser snapshots.
- Re-ran the full web gate after updating audit documentation.
- Checked local paths for native prerequisites; `cargo`, `rustc`, `rustup`, and `pkg-config` are not present in PATH or expected user/system locations.

#### Works
- Pet task creation, task completion, Review report generation, revision rerun, and approval all update visible UI state in browser dev mode.
- Web build, lint, test, and Tauri config validation are green.

#### Mocked
- Hermes execution, artifacts, provider errors, and profile availability remain mock bridge behavior.
- Native pet window runtime behavior remains scaffolded/config-checked but not executed.

#### Tested
- `bun run verify:web`: passed; Tauri config check passed, lint passed, tests passed with 9 tests / 40 assertions, production build passed.

#### Blockers
- Native runtime launch remains blocked by missing `cargo`, `rustc`, `rustup`, `pkg-config`, WebKitGTK, and rsvg prerequisites.
- Installing those prerequisites still requires sudo/password access outside the current automation path.

#### Next
- Install native prerequisites, then run `bun run check:native` and `bun run tauri:dev` with `docs/NATIVE_VERIFICATION.md`.

### 2026-05-03 22:23 CST — Browser detail and error evidence tightened

#### Goal
Verify the browser-visible task detail and error state, not just bridge behavior.

#### Checked
- Opened the completed/revision-requested task in Quest Board through browser DOM interaction.
- Inspected rendered task detail content for artifacts and timeline entries.
- Triggered the Error action and inspected pet, task detail, and system-strip text.

#### Works
- Task detail rendered 3 artifacts and 9 visible timeline entries after completion and revision request.
- Error action changed the pet status to `Error`, task detail state to `ERROR`, displayed `Mock gateway error: provider response timed out.`, and updated the system strip.

#### Mocked
- The error is still generated by `simulateError()` in the mock bridge.

#### Tested
- agent-browser DOM inspection on `http://127.0.0.1:1422/`.
- `bun run verify:web`: passed; Tauri config check passed, lint passed, tests passed with 9 tests / 40 assertions, production build passed.

#### Blockers
- Native runtime launch remains blocked by missing prerequisites.

#### Next
- Install native prerequisites, then run `bun run check:native` and `bun run tauri:dev` with `docs/NATIVE_VERIFICATION.md`.

### 2026-05-03 22:27 CST — Advanced quest brief disclosure added

#### Goal
Close the design guardrail that quest creation should stay lightweight while exposing goals, non-goals, context, and definition of done behind advanced disclosure.

#### Changed
- Added optional `goals`, `nonGoals`, `context`, and `definitionOfDone` fields to the frontend task contract.
- Stored advanced fields in the mock bridge when creating Quest Board tasks.
- Added a Quest Board `Advanced brief` disclosure with those fields.
- Rendered populated advanced brief fields in Task Detail.
- Added mock bridge test coverage for advanced intake field persistence.
- Updated `docs/API_CONTRACT.md` and `docs/COMPLETION_AUDIT.md`.

#### Works
- Default Quest Board intake still starts with one main task input.
- Opening `Advanced brief` allows the user to add goals, non-goals, context, and definition of done without adding a new v0 surface.
- Browser verification created a task with all 4 fields and Task Detail displayed all of them.

#### Mocked
- Hermes execution remains mocked; advanced fields are Guild-maintained task metadata.

#### Tested
- `bun run verify:web`: passed; Tauri config check passed, lint passed, tests passed with 10 tests / 44 assertions, production build passed.
- agent-browser browser check on `http://127.0.0.1:1422/`: advanced disclosure created a Quest Board task whose detail displayed all 4 advanced brief fields.

#### Blockers
- Native runtime launch remains blocked by missing prerequisites.

#### Next
- Install native prerequisites, then run `bun run check:native` and `bun run tauri:dev` with `docs/NATIVE_VERIFICATION.md`.

### 2026-05-03 22:28 CST — Agent idle event contract closed

#### Goal
Keep the mock bridge aligned with the declared `BridgeEvent` contract by emitting `agent_idle` when approval returns the assigned profile to idle.

#### Changed
- `approveReport()` now emits `agent_idle` after `review_approved`.
- The approve/revise bridge test now asserts the `agent_idle` event is observed for the Builder profile.
- Updated `docs/COMPLETION_AUDIT.md` command evidence and lifecycle-event wording.

#### Works
- Subscribers can distinguish the review approval event from the agent returning to idle.

#### Mocked
- Hermes execution remains mocked; this is a Guild/bridge lifecycle event.

#### Tested
- `bun run verify:web`: passed; Tauri config check passed, lint passed, tests passed with 10 tests / 45 assertions, production build passed.

#### Blockers
- Native runtime launch remains blocked by missing prerequisites.

#### Next
- Install native prerequisites, then run `bun run check:native` and `bun run tauri:dev` with `docs/NATIVE_VERIFICATION.md`.

### 2026-05-03 22:31 CST — Blocked state path added

#### Goal
Make the declared v0 `blocked` state observable through the mock bridge and UI instead of only existing in types.

#### Changed
- Added `simulateBlocked(taskId?)` to the mock bridge API and `docs/API_CONTRACT.md`.
- Added a Guild Hall `Block` action next to the existing mock Error action.
- `simulateBlocked()` clears lifecycle timers, marks the task and agent blocked, appends a blocked timeline event, updates system status text, and emits `task_blocked`.
- Added blocked-state test coverage for task, agent, timeline, system status, and event stream.
- Added blocked pet/state-pill styling.

#### Works
- Browser verification showed the pet status as `Blocked`, Task Detail state as `BLOCKED`, a blocked timeline entry, and a system strip message.

#### Mocked
- Blocked state is still generated by the mock bridge; no real Hermes tool/input blockage is integrated.

#### Tested
- `bun run verify:web`: passed; Tauri config check passed, lint passed, tests passed with 11 tests / 50 assertions, production build passed.
- agent-browser browser check on `http://127.0.0.1:1422/`: Block action visibly updated pet, task detail, timeline, and system strip.

#### Blockers
- Native runtime launch remains blocked by missing prerequisites.

#### Next
- Install native prerequisites, then run `bun run check:native` and `bun run tauri:dev` with `docs/NATIVE_VERIFICATION.md`.

### 2026-05-03 22:33 CST — Handoff docs synced to current surface

#### Goal
Keep the runnable-surface documentation aligned after adding advanced intake and blocked-state controls.

#### Changed
- Updated `README.md` to mention optional advanced brief fields and Block/Error mock controls.
- Updated `docs/NATIVE_VERIFICATION.md` pass criteria to include advanced intake and blocked-state checks.
- Updated `docs/COMPLETION_AUDIT.md` README/native handoff evidence.

#### Works
- New users and native verifiers can see the current web-visible controls without reading implementation files.

#### Mocked
- Blocked/error controls remain mock bridge controls.

#### Tested
- `bun run verify:web`: passed; Tauri config check passed, lint passed, tests passed with 11 tests / 50 assertions, production build passed.

#### Blockers
- Native runtime launch remains blocked by missing prerequisites.

#### Next
- Install native prerequisites, then run `bun run check:native` and `bun run tauri:dev` with `docs/NATIVE_VERIFICATION.md`.

### 2026-05-03 22:35 CST — Blocked/error reports are no longer actionable

#### Goal
Prevent contradictory Review state when a task that had a report is later marked blocked or error.

#### Changed
- `simulateBlocked()` and `simulateError()` now clear task `reviewStatus` to `none`.
- Pending reports in the UI now require both `task.state === "needs_review"` and `task.reviewStatus === "required"`.
- Review cards are only actionable under that same condition.
- Added bridge assertions that blocked/error tasks clear actionable review status.
- Updated `docs/COMPLETION_AUDIT.md`.

#### Works
- Browser verification showed a blocked task no longer displays as a pending Review badge/actionable report.

#### Mocked
- Blocked/error state remains generated by the mock bridge.

#### Tested
- `bun run verify:web`: passed; Tauri config check passed, lint passed, tests passed with 11 tests / 52 assertions, production build passed.
- agent-browser check on `http://127.0.0.1:1422/`: navigation showed no pending Review badge while the selected task was blocked.

#### Blockers
- Native runtime launch remains blocked by missing prerequisites.

#### Next
- Install native prerequisites, then run `bun run check:native` and `bun run tauri:dev` with `docs/NATIVE_VERIFICATION.md`.

### 2026-05-03 22:36 CST — Bridge guards stale review actions

#### Goal
Enforce the same reviewability invariant in the mock bridge that the UI uses for Review actions.

#### Changed
- `approveReport()` and `requestRevision()` now no-op unless the report task is still `needs_review` with required review status.
- Added a bridge test that completes a task, blocks it, then verifies approve/revise cannot approve or spawn a revision from the stale report.
- Updated `docs/COMPLETION_AUDIT.md`.

#### Works
- Stale reports remain visible for traceability, but bridge actions cannot mutate blocked/error tasks as if they were still reviewable.

#### Mocked
- Review execution is still mock bridge behavior.

#### Tested
- `bun run verify:web`: passed; Tauri config check passed, lint passed, tests passed with 12 tests / 56 assertions, production build passed.

#### Blockers
- Native runtime launch remains blocked by missing prerequisites.

#### Next
- Install native prerequisites, then run `bun run check:native` and `bun run tauri:dev` with `docs/NATIVE_VERIFICATION.md`.

### 2026-05-03 22:38 CST — Remote terminal updates stop local timers

#### Goal
Prevent one webview's stale mock lifecycle timers from overwriting another webview's blocked/error terminal update.

#### Changed
- Added timer reconciliation after remote `BroadcastChannel` or storage snapshot updates.
- Local timers are cleared for tasks that remote state says are no longer `assigned` or `running`.
- Added a persistent bridge test where the timer-owning bridge creates a task, another bridge blocks it, and the owner does not later complete it.
- Updated `docs/COMPLETION_AUDIT.md`.

#### Works
- Cross-webview mock sync now preserves remote blocked state instead of letting stale local timers generate a report afterward.

#### Mocked
- This remains mock lifecycle synchronization; native webview runtime behavior still needs Tauri verification.

#### Tested
- `bun run verify:web`: passed; Tauri config check passed, lint passed, tests passed with 13 tests / 59 assertions, production build passed.

#### Blockers
- Native runtime launch remains blocked by missing prerequisites.

#### Next
- Install native prerequisites, then run `bun run check:native` and `bun run tauri:dev` with `docs/NATIVE_VERIFICATION.md`.

### 2026-05-03 22:40 CST — Storage fallback timer reconciliation covered

#### Goal
Verify timer reconciliation also works through the storage-event fallback, not only through `BroadcastChannel`.

#### Changed
- Added a persistent bridge test where the timer-owning bridge creates a task, another bridge receives it through the storage fallback, blocks it, and the owner receives the blocked snapshot through the storage fallback.
- The test waits past the original lifecycle completion time and verifies the task remains blocked with no generated report.
- Updated `docs/COMPLETION_AUDIT.md`.

#### Works
- Both mock cross-webview sync channels now have timer-reconciliation coverage.

#### Mocked
- This remains mock lifecycle synchronization; native webview runtime behavior still needs Tauri verification.

#### Tested
- `bun run verify:web`: passed; Tauri config check passed, lint passed, tests passed with 14 tests / 63 assertions, production build passed.

#### Blockers
- Native runtime launch remains blocked by missing prerequisites.

#### Next
- Install native prerequisites, then run `bun run check:native` and `bun run tauri:dev` with `docs/NATIVE_VERIFICATION.md`.

### 2026-05-03 22:42 CST — Mock pet position sync covered

#### Goal
Cover the v0 pet position persistence fallback with automated evidence.

#### Changed
- Added a persistent bridge test that calls `setPetPosition()` in one bridge instance and verifies another persistent bridge instance receives the mocked position through `BroadcastChannel`.
- Updated `docs/COMPLETION_AUDIT.md`.

#### Works
- The bridge-owned pet position fallback now has cross-window sync coverage.

#### Mocked
- Pet position is still bridge-mocked; native window position persistence remains unimplemented until Tauri runtime verification.

#### Tested
- `bun run verify:web`: passed; Tauri config check passed, lint passed, tests passed with 15 tests / 64 assertions, production build passed.

#### Blockers
- Native runtime launch remains blocked by missing prerequisites.

#### Next
- Install native prerequisites, then run `bun run check:native` and `bun run tauri:dev` with `docs/NATIVE_VERIFICATION.md`.

### 2026-05-03 22:43 CST — Storage fallback pet position sync covered

#### Goal
Cover mocked pet position synchronization through the storage-event fallback, not only `BroadcastChannel`.

#### Changed
- Added a persistent bridge test that calls `setPetPosition()` in one bridge instance, dispatches the stored snapshot through the fake storage listener, and verifies another persistent bridge receives the position.
- Updated `docs/COMPLETION_AUDIT.md`.

#### Works
- Both mock cross-window sync paths now cover pet position fallback state.

#### Mocked
- Pet position is still bridge-mocked; native window position persistence remains unimplemented until Tauri runtime verification.

#### Tested
- `bun run verify:web`: passed; Tauri config check passed, lint passed, tests passed with 16 tests / 66 assertions, production build passed.

#### Blockers
- Native runtime launch remains blocked by missing prerequisites.

#### Next
- Install native prerequisites, then run `bun run check:native` and `bun run tauri:dev` with `docs/NATIVE_VERIFICATION.md`.

### 2026-05-03 22:45 CST — Revision keeps advanced brief metadata

#### Goal
Keep revision reruns grounded in the original quest context.

#### Changed
- `requestRevision()` now carries original `goals`, `nonGoals`, `context`, and `definitionOfDone` into the revision task.
- Added a bridge test that creates a task with all advanced intake fields, requests a revision, and verifies the revision retains those fields.
- Updated `docs/COMPLETION_AUDIT.md`.

#### Works
- Revision tasks no longer lose the original review context or acceptance target.

#### Mocked
- Revision execution remains mock lifecycle behavior.

#### Tested
- `bun run verify:web`: passed; Tauri config check passed, lint passed, tests passed with 17 tests / 71 assertions, production build passed.

#### Blockers
- Native runtime launch remains blocked by missing prerequisites.

#### Next
- Install native prerequisites, then run `bun run check:native` and `bun run tauri:dev` with `docs/NATIVE_VERIFICATION.md`.

### 2026-05-03 22:47 CST — Native scaffold verifier expanded

#### Goal
Make `check:tauri-config` verify the native scaffold shape, not only `tauri.conf.json`.

#### Changed
- `scripts/check-tauri-config.mjs` now checks `src-tauri/Cargo.toml` for the Hermes Guild package/lib names and Tauri 2 dependencies.
- It also checks `src-tauri/src/lib.rs`, `src-tauri/src/main.rs`, and `src-tauri/build.rs` for expected Tauri entrypoint/build calls.
- Updated `docs/COMPLETION_AUDIT.md`.

#### Works
- The web verification gate now catches broken native scaffold files even before Cargo/WebKitGTK are available.

#### Mocked
- No new mocked behavior.

#### Tested
- `bun run verify:web`: passed; stricter Tauri/native scaffold check passed, lint passed, tests passed with 17 tests / 71 assertions, production build passed.

#### Blockers
- Native runtime launch remains blocked by missing prerequisites.

#### Next
- Install native prerequisites, then run `bun run check:native` and `bun run tauri:dev` with `docs/NATIVE_VERIFICATION.md`.

### 2026-05-03 22:49 CST — Profile identity guard added

#### Goal
Prevent bridge state from referencing profiles that do not exist in the configured Hermes Guild roster.

#### Changed
- `setActiveProfile()` now ignores unknown profile ids.
- `createTask()` now throws for unknown assignees.
- Added bridge test coverage for both paths.
- Updated `docs/COMPLETION_AUDIT.md`.

#### Works
- UI and bridge state cannot accidentally create active pet or quest assignments for a missing profile.

#### Mocked
- No new mocked behavior.

#### Tested
- `bun run verify:web`: passed; Tauri/native scaffold check passed, lint passed, tests passed with 18 tests / 73 assertions, production build passed.

#### Blockers
- Native runtime launch remains blocked by missing prerequisites.

#### Next
- Install native prerequisites, then run `bun run check:native` and `bun run tauri:dev` with `docs/NATIVE_VERIFICATION.md`.

### 2026-05-03 22:51 CST — Restored and remote snapshots are sanitized

#### Goal
Prevent persisted or remote mock snapshots from injecting invalid active profile ids or task assignees into app state.

#### Changed
- Added snapshot sanitization for persisted startup snapshots and remote `BroadcastChannel`/storage snapshots.
- Invalid active profile ids fall back to Builder.
- Agent `activeInPet` flags are normalized to the sanitized active profile.
- Tasks with invalid assignees are reassigned to the sanitized active profile.
- Reports with invalid agent ids are dropped.
- Added tests for invalid restored snapshots and invalid remote storage snapshots.
- Updated `docs/COMPLETION_AUDIT.md`.

#### Works
- App-facing bridge snapshots continue to reference configured Hermes Guild profiles even if local storage or a remote webview provides malformed profile references.

#### Mocked
- This is mock bridge state hygiene; real Hermes profile validation remains future integration work.

#### Tested
- `bun run verify:web`: passed; Tauri/native scaffold check passed, lint passed, tests passed with 20 tests / 79 assertions, production build passed.

#### Blockers
- Native runtime launch remains blocked by missing prerequisites.

#### Next
- Install native prerequisites, then run `bun run check:native` and `bun run tauri:dev` with `docs/NATIVE_VERIFICATION.md`.

### 2026-05-03 22:53 CST — Sanitizer restores fixed v0 roster

#### Goal
Ensure malformed persisted snapshots cannot remove the fixed v0 Researcher, Builder, Reviewer roster.

#### Changed
- Snapshot sanitization now rebuilds the agent list from the seeded v0 roster, preserving valid runtime fields for seeded agents.
- Tasks with invalid assignees still fall back to the sanitized active profile.
- Reports with invalid agent ids are dropped.
- Added a test where persisted state has no agents and an invalid report, then verifies the seeded roster is restored and the invalid report is dropped.
- Updated `docs/COMPLETION_AUDIT.md`.

#### Works
- Restored/remote app state cannot lose the three configured v0 profiles.

#### Mocked
- This is mock bridge state hygiene; real Hermes profile validation remains future integration work.

#### Tested
- `bun run verify:web`: passed; Tauri/native scaffold check passed, lint passed, tests passed with 21 tests / 83 assertions, production build passed.

#### Blockers
- Native runtime launch remains blocked by missing prerequisites.

#### Next
- Install native prerequisites, then run `bun run check:native` and `bun run tauri:dev` with `docs/NATIVE_VERIFICATION.md`.

### 2026-05-03 22:55 CST — Malformed snapshot collections tolerated

#### Goal
Prevent malformed persisted snapshots with missing `agents`, `tasks`, or `reports` collections from breaking bridge restoration.

#### Changed
- Snapshot sanitization now treats missing/non-array `agents`, `tasks`, and `reports` as empty arrays before rebuilding the v0 roster.
- Added a test with undefined collections that verifies Builder fallback, restored three-agent roster, and empty task/report lists.
- Updated `docs/COMPLETION_AUDIT.md`.

#### Works
- Corrupt local storage shape now degrades to a safe v0 mock state instead of throwing during sanitization.

#### Mocked
- This is mock bridge state hygiene.

#### Tested
- `bun run verify:web`: passed; Tauri/native scaffold check passed, lint passed, tests passed with 22 tests / 87 assertions, production build passed.

#### Blockers
- Native runtime launch remains blocked by missing prerequisites.

#### Next
- Install native prerequisites, then run `bun run check:native` and `bun run tauri:dev` with `docs/NATIVE_VERIFICATION.md`.

### 2026-05-03 22:57 CST — Malformed system and pet position state tolerated

#### Goal
Keep malformed persisted system status and pet position values from producing incoherent UI state.

#### Changed
- Snapshot sanitization now overlays malformed/missing `systemStatus` values onto the seeded mock system status.
- `systemStatus.warnings` falls back to the seeded warning list when it is not an array.
- `petPosition` falls back to the seeded position when coordinates are not finite numbers.
- Added a test covering malformed `systemStatus` and `petPosition`.
- Updated `docs/COMPLETION_AUDIT.md`.

#### Works
- Corrupt local storage can no longer remove required mock system status fields or install invalid pet coordinates.

#### Mocked
- This is mock bridge state hygiene.

#### Tested
- `bun run verify:web`: passed; Tauri/native scaffold check passed, lint passed, tests passed with 23 tests / 92 assertions, production build passed.

#### Blockers
- Native runtime launch remains blocked by missing prerequisites.

#### Next
- Install native prerequisites, then run `bun run check:native` and `bun run tauri:dev` with `docs/NATIVE_VERIFICATION.md`.

### 2026-05-03 22:59 CST — API contract synced to bridge guards

#### Goal
Keep `docs/API_CONTRACT.md` aligned with the hardened mock bridge behavior.

#### Changed
- Documented that unknown active profiles are ignored and unknown assignees are rejected.
- Documented that approve/revise only operate on actionable review reports.
- Documented that revisions preserve advanced brief fields.
- Documented restored/remote snapshot sanitization and remote timer reconciliation behavior.

#### Works
- The API contract now reflects current bridge guarantees instead of the earlier loose method semantics.

#### Mocked
- No new mocked behavior.

#### Tested
- `bun run verify:web`: passed; Tauri/native scaffold check passed, lint passed, tests passed with 23 tests / 92 assertions, production build passed.

#### Blockers
- Native runtime launch remains blocked by missing prerequisites.

#### Next
- Install native prerequisites, then run `bun run check:native` and `bun run tauri:dev` with `docs/NATIVE_VERIFICATION.md`.

### 2026-05-03 23:02 CST — Non-object stored snapshots tolerated

#### Goal
Prevent valid JSON envelopes with invalid non-object `snapshot` values from breaking bridge restoration.

#### Changed
- `sanitizeSnapshot()` now accepts unknown input and falls back to the seeded snapshot when the stored snapshot is not an object.
- Added a regression test for a persisted envelope with `snapshot: null`.
- Updated `docs/COMPLETION_AUDIT.md`.

#### Works
- Corrupt persisted snapshot values now degrade to the safe seeded v0 mock state.

#### Mocked
- This is mock bridge state hygiene.

#### Tested
- `bun run verify:web`: passed; Tauri/native scaffold check passed, lint passed, tests passed with 24 tests / 96 assertions, production build passed.

#### Blockers
- Native runtime launch remains blocked by missing prerequisites.

#### Next
- Install native prerequisites, then run `bun run check:native` and `bun run tauri:dev` with `docs/NATIVE_VERIFICATION.md`.

### 2026-05-03 23:07 CST — Completion audit refreshed

#### Goal
Re-audit the active Codex Goal against the current checkout and fresh command output.

#### Changed
- Updated `docs/COMPLETION_AUDIT.md` timestamp and command evidence with the latest verifier run.

#### Works
- The web/mock v0 loop remains runnable and covered by the current verifier.
- The prompt-to-artifact audit still maps the named docs, milestone checklist, PRD acceptance criteria, bridge behavior, README handoff, and command gates to concrete evidence.

#### Mocked
- Hermes runtime execution, lifecycle signals, artifacts, reports, blocked/error states, and pet position persistence remain mock bridge behavior.

#### Tested
- `bun run verify:web`: passed; Tauri/native scaffold check passed, lint passed, tests passed with 24 tests / 96 assertions, production build passed.
- `bun run check:native`: failed as expected, reporting missing `cargo`, `rustc`, `rustup`, and `pkg-config`; WebKit/rsvg checks skipped because `pkg-config` is missing.

#### Blockers
- Native Tauri runtime verification remains blocked by missing system prerequisites and unavailable sudo password path.

#### Next
- Install native prerequisites, then run `bun run check:native` and `bun run tauri:dev` with `docs/NATIVE_VERIFICATION.md`.

### 2026-05-03 23:12 CST — v0 mock loop committed and pushed

#### Goal
Preserve the current Hermes Guild v0 implementation and handoff docs in git.

#### Changed
- Expanded `.gitignore` for Vite, Bun, Tauri, logs, env files, and editor state.
- Committed the v0 mock loop, docs, tests, and native scaffold as `0d597bc Implement Hermes Guild v0 mock loop`.
- Pushed `main` to `origin`.

#### Works
- The remote `main` branch now contains the runnable web/mock Hermes Guild v0 implementation and current documentation.
- The local working tree was clean after push.

#### Mocked
- No runtime behavior changed in this checkpoint.

#### Tested
- Prior verifier for this commit: `bun run verify:web` passed with 24 tests / 96 assertions and production build passed.
- Fresh native prerequisite check: `bun run check:native` failed as expected, reporting missing `cargo`, `rustc`, `rustup`, and `pkg-config`; WebKit/rsvg checks skipped because `pkg-config` is missing.

#### Blockers
- Native Tauri runtime verification remains blocked by missing system prerequisites and unavailable sudo password path.

#### Next
- Install native prerequisites, then run `bun run check:native` and `bun run tauri:dev` with `docs/NATIVE_VERIFICATION.md`.

### 2026-05-04 00:18 CST — macOS native gate reached

#### Goal
Run the native verification sequence on macOS and exercise the Hermes Guild v0 loop.

#### Changed
- Added `src-tauri/icons/icon.png`, a minimal app icon required by Tauri generated context.
- Updated `scripts/check-tauri-config.mjs` to fail early when the required icon is missing.
- `src-tauri/Cargo.lock` was generated by the first successful native dependency resolution.

#### Works
- `bun install` completed with no package changes.
- Rust and Xcode command line tools are installed: `rustc 1.95.0`, `cargo 1.95.0`, `/Library/Developer/CommandLineTools`.
- `bun run tauri:dev` compiles and launches the native `hermes-guild` dev process on macOS.
- The web runtime at `http://127.0.0.1:1420/` shows Guild Hall, Quest Board, Review, and embedded Pet Mode.
- `http://127.0.0.1:1420/?mode=pet` shows only the Pet Mode surface.
- Pet-created quests assign to the active Brass profile by default.
- Quest Board shows task assignment, progress, timeline, artifacts, and review-required state.
- Review cards show facts, assumptions, known gaps, review items, Approve, and Revise.
- Approve moves a report to approved state.
- Revise records revision instructions and creates a follow-up assigned task.
- Block and Error controls surface visible pet, task, and system status changes.

#### Mocked
- Hermes runtime execution, artifacts, provider errors, blocked state, and review report contents remain mock bridge behavior.
- Pet position remains bridge-mocked.

#### Tested
- `bun run verify:web`: passed; Tauri config check, lint, 24 tests / 96 assertions, and production build all passed.
- `bun run check:native`: failed on macOS because the script still checks Linux `pkg-config`, `webkit2gtk-4.1`, and `librsvg-2.0`; Rust checks passed.
- `bun run tauri:dev`: passed native compile and launched after adding the required icon.

#### Notes
- Tauri emitted: `The window is set to be transparent but the macos-private-api is not enabled.`
- macOS reported a visible `hermes-guild` process, but Computer Use could not target the raw Tauri dev binary as an app bundle, and `osascript` window inspection was blocked by Accessibility permissions.
- Native window creation is compile/config verified from `tauri.conf.json` plus the launched process; separate-window transparency and always-on-top behavior still need direct visual verification in a permitted desktop session.

#### Next
- Decide whether to enable `tauri.macOSPrivateApi` for transparent pet behavior on macOS.
- If native visual QA is required, rerun with Accessibility/Screen Recording permissions available for the `hermes-guild` dev process.

### 2026-05-04 00:40 CST — Native verification passed

#### Goal
Run the final native blocker verification from `main` at `ce50c1e Document Hermes Guild v0 handoff`, update audit docs, and mark the Codex Goal complete if native passes.

#### Changed
- Enabled `app.macOSPrivateApi` in `src-tauri/tauri.conf.json` so the transparent Pet Mode window is supported on macOS.
- Added the matching `macos-private-api` Tauri feature in `src-tauri/Cargo.toml`.
- Expanded `scripts/check-tauri-config.mjs` to fail when a transparent pet window is configured without the required macOS private API flag.
- Kept the required Tauri icon asset and generated `src-tauri/Cargo.lock` from native dependency resolution.

#### Works
- `bun install` completed with no dependency changes.
- `bun run verify:web` passed after the native config update.
- `bun run tauri:dev` compiled and launched `target/debug/hermes-guild` without the previous macOS transparency warning.
- macOS process inspection reported a visible `hermes-guild` process.
- macOS window inspection reported two native windows:
  - `Hermes Pet` at `360x520`.
  - `Hermes Guild` at `1280x820`.
- The pet-only route `/?mode=pet` had already been verified to render only Pet Mode.
- The core v0 loop had already been verified in the running web/mock app: pet quest creation, direct assignment to Brass, Quest Board progress, Review card, Approve, Revise, Block, and Error.

#### Mocked
- Hermes execution, provider errors, artifacts, report contents, blocked state, and profile availability remain mock bridge behavior.
- Pet position persistence remains bridge-mocked.

#### Tested
- `bun install`: passed; checked 73 installs across 133 packages, no changes.
- `bun run verify:web`: passed on the final tree; config check, TypeScript, 24 tests / 96 assertions, and Vite production build passed.
- `bun run tauri:dev`: passed; Vite started on `127.0.0.1:1420`, Cargo compiled `hermes-guild`, and native app launched.
- `curl -I http://127.0.0.1:1420/`: returned HTTP 200 from the dev server during native verification.
- `osascript` process/window checks: confirmed visible `hermes-guild`, `Hermes Pet`, and `Hermes Guild` windows with expected sizes.

#### Notes
- The prior native warning was resolved by `app.macOSPrivateApi: true`.
- Chrome did not render the localhost page during the final check even though the Vite server returned HTTP 200; native process and window verification were performed through macOS process/window metadata.
- Direct native webview content inspection is still limited by desktop automation access, but the native launch and window criteria are verified.

#### Result
- Native verification passed for the v0 native shell gate.
- Codex Goal complete for the mock-first Hermes Guild v0 loop.

### 2026-05-04 01:30 CST — Minimal RealHermesBridge implemented

#### Goal
Add a minimal real Hermes integration while preserving the mock bridge and current pet -> quest -> timeline -> report card -> review loop.

#### Changed
- Added `docs/HERMES_INTEGRATION_PLAN.md` with a short implementation plan.
- Added shared bridge types in `src/bridge/types.ts`.
- Kept `MockHermesBridge` working behind the shared UI-facing bridge interface.
- Added `RealHermesBridge` with `getHealth`, `listAgents`, `setActiveAgent`, `getActiveAgent`, `submitTask`, `getTask`, `reviseTask`, and `approveTask` methods.
- Added `BridgeFactory` selection for `mock`, `real`, and `auto`.
- Added local storage bridge config for `bridgeMode`, `hermesCommand`, and Guild agent to Hermes profile mapping.
- Added a Tauri subprocess runner for Hermes CLI health and one-shot task execution.
- Updated `useBridgeSnapshot` to load the configured bridge while keeping a mock initial snapshot.
- Updated `README.md` with mock / real / auto setup.
- Added Phase 6 tasks to `docs/TASKS.md`.

#### Works
- `mock` mode still uses MockHermesBridge.
- `auto` mode checks real Hermes health and falls back to mock when the Tauri/native Hermes path is unavailable.
- `real` mode creates Guild tasks locally, maps the Guild assignee to the configured Hermes profile, invokes Hermes CLI one-shot, captures final stdout, and turns it into a Quest Report Card.
- Real bridge subprocess failures update the task error, active pet state, task timeline, and system strip instead of failing silently.
- The visible system strip reports bridge mode and fallback status.

#### Real
- Hermes CLI availability detection through native Tauri command execution.
- Hermes CLI one-shot subprocess invocation in native mode.
- Final stdout capture.
- Guild-generated Quest Report Card from real final output.
- CLI failure surfacing through bridge state.

#### Mocked / Derived
- Live intermediate Hermes progress is derived locally because one-shot mode only returns final output.
- Blocked state remains Guild-maintained; Hermes one-shot does not expose a live blocked signal.
- Auto fallback uses the existing mock bridge when real health fails.
- Pet position remains bridge-mocked.

#### Tested
- `bun test src/bridge/bridgeFactory.test.ts`: passed; 6 tests / 18 assertions.
- `bun run test`: passed after the bridge additions; 30 tests / 115 assertions.
- `bun run lint`: passed after fixing the Tauri invoke argument shape.
- `bun run verify:web`: passed; Tauri config check, TypeScript, 30 tests / 115 assertions, and Vite production build passed.
- `cargo fmt --check`: passed after formatting the new Tauri command handlers.
- `cargo check` in `src-tauri`: passed with the new Hermes subprocess commands.
- `bun run tauri:dev`: passed native compile and launched `target/debug/hermes-guild`; `curl -I http://127.0.0.1:1420/` returned HTTP 200 during the run.
- `/Users/plutoless/.hermes/hermes-agent/venv/bin/python -m hermes_cli.main --version`: passed and reported Hermes Agent v0.11.0.

#### Blockers
- Real-mode end-to-end model execution was not submitted in this checkpoint to avoid consuming provider credits or transmitting a generated task prompt; it requires launching the native Tauri app with a valid `hermesCommand` and configured provider credentials.
- Browser-only dev mode cannot run real Hermes; it reports unavailable Tauri runtime and auto-falls back to mock.

#### Next
- Run the full web verification suite after final docs and implementation edits.
- Run native `bun run tauri:dev` to compile the new Tauri commands.
- If configured credentials are available, submit a small real-mode pet task and inspect the returned Quest Report Card.

### 2026-05-04 01:45 CST — Real bridge repair pass

#### Goal
Repair the parts of the RealHermesBridge implementation that could make real mode look or behave like mock mode, then validate locally.

#### Broken
- The app initialized with a live `MockHermesBridge` while async bridge config selection was still loading; a fast pet or Quest Board submit could use mock even when `real` was configured.
- Bridge status was compressed into `logsSummary`, so mode, active implementation, Hermes availability, and fallback reason were not independently visible.
- Real-mode agents used the same fantasy mock names (`Lyra`, `Brass`, `Sable`), making real mode appear like mock data.
- Real-mode Hermes health failure used the simulated error path, which hid the actual health failure reason.

#### Fixed
- Added structured bridge status to `SystemStatus`: `bridgeMode`, `activeImplementation`, `hermesAvailable`, `fallbackReason`, and `hermesCommand`.
- Added an explicit loading bridge snapshot; task submission is disabled until bridge selection finishes, so initial UI state cannot silently submit to mock.
- Updated Pet and Quest Board submission to call the selected bridge's `submitTask` path when available.
- Real mode now uses `Hermes Researcher`, `Hermes Builder`, and `Hermes Reviewer` labels instead of mock profile names.
- Real mode never falls back to mock; failed health checks keep `activeImplementation: real`, mark Hermes unavailable, surface the real failure reason, and set the active agent to error.
- Auto mode remains the only path that falls back to mock, with `fallbackReason` visible in the system strip.
- Mock mode and auto fallback keep mock data clearly labeled through bridge status and warnings.

#### Still Mocked / Derived
- Mock mode and auto fallback still use MockHermesBridge lifecycle, artifacts, report content, blocked state, and provider errors.
- Real bridge still derives intermediate progress locally around Hermes one-shot execution.
- Real blocked state is still Guild-maintained because one-shot execution does not expose a live blocked signal.

#### Validation
- Added failing tests first for structured bridge status, auto fallback visibility, real-mode no-fallback behavior, real labels, mapped-profile task submission, and real failure surfacing.
- `bun test src/bridge/bridgeFactory.test.ts`: passed after repair; 7 tests / 40 assertions.
- `bun run verify:web`: passed; Tauri config check, TypeScript, 31 tests / 136 assertions, and Vite production build passed.
- `cargo fmt --check`: passed.
- `cargo check` in `src-tauri`: passed.
- `bun run tauri:dev`: passed native compile and launched `target/debug/hermes-guild`.
- `curl -I http://127.0.0.1:1420/`: returned HTTP 200 during the native run.
- `/Users/plutoless/.hermes/hermes-agent/venv/bin/python -m hermes_cli.main --version`: passed and reported Hermes Agent v0.11.0.
- Native dev processes were stopped after validation.

#### Result
- Repair validation passed for the minimal RealHermesBridge gate.
- Real-mode live model task submission remains intentionally unrun to avoid provider credits and prompt transmission without explicit confirmation.

### 2026-05-04 02:07 CST — Bridge selector added

#### Goal
Make bridge mode selection available in the app instead of requiring devtools local storage edits.

#### Changed
- Added compact bridge controls to the top system strip: mode selector, Hermes command field, Apply button, and profile mapping disclosure.
- Updated `useBridgeSnapshot()` so Apply saves bridge config and rebuilds the selected bridge immediately.
- Kept task submission disabled while a new bridge is loading.
- Updated `README.md` to describe the in-app selector.

#### Works
- Users can switch `mock`, `auto`, and `real` from Guild Hall without opening devtools.
- `real` mode still fails visibly when Hermes cannot run; it does not fall back to mock.
- `auto` remains the only mode that can fall back to mock.

#### Still Mocked / Derived
- Browser-only dev mode still cannot execute real Hermes because Tauri commands are unavailable.
- Auto fallback still uses MockHermesBridge when health checks fail.

#### Validation
- `bun run lint`: passed.
- `bun run verify:web`: passed; Tauri config check, TypeScript, 31 tests / 136 assertions, and Vite production build passed.
- `bun run dev -- --port 1422`: launched Vite at `http://127.0.0.1:1422/` because `1420` was already occupied.
- `curl -I http://127.0.0.1:1422/`: returned HTTP 200.

### 2026-05-04 02:35 CST — Real bridge switched to Hermes API

#### Goal
Replace the normal real bridge subprocess path with the Hermes API server.

#### Researched
- Primary local source: `/Users/plutoless/.hermes/hermes-agent/gateway/platforms/api_server.py`.
- `GET /health` returns JSON with `status` and `platform`.
- `POST /v1/runs` accepts `input`, optional `instructions`, optional `previous_response_id`, optional `conversation_history`, and optional `session_id`; it returns `202` with `run_id` and `status`.
- `GET /v1/runs/{run_id}/events` returns SSE blocks with `data: {...}` payloads. Useful events include `message.delta`, `tool.started`, `tool.completed`, `reasoning.available`, `run.completed`, and `run.failed`.
- `/v1/runs` does not expose a Hermes profile parameter, so Guild profile mapping is not sent.
- Fallback endpoints exist (`/v1/chat/completions`, `/v1/responses`), but the bridge uses `/v1/runs` first because it exposes structured lifecycle events.

#### Changed
- Replaced `hermesCommand` bridge config with `hermesApiBaseUrl`, defaulting to `http://127.0.0.1:8642`.
- Added `src/bridge/hermesApiClient.ts` for API health checks, `/v1/runs` submission, SSE parsing, and API error extraction.
- Refactored `RealHermesBridge` to use the API client instead of a Tauri subprocess runner.
- Removed the normal Tauri subprocess command module and Rust invoke handlers.
- Updated the top system strip bridge control from command input to API base URL input.
- Updated `README.md`, `docs/HERMES_INTEGRATION_PLAN.md`, and `docs/COMPLETION_AUDIT.md` to describe the API-first bridge.

#### Works
- `real` mode checks Hermes availability through API health.
- `real` mode submits Pet and Quest Board tasks through the Hermes API client.
- `real` mode never falls back to mock; API health or run failures surface in task, pet, timeline, and system status.
- `auto` mode remains the only path that may fall back to mock, with the API failure reason visible.
- Browser/Vite and Tauri/native both use HTTP fetch for real mode. CORS or network failures surface through health/run error messages.

#### Still Mocked / Derived
- Mock mode and auto fallback still use MockHermesBridge lifecycle, artifacts, report content, blocked state, and provider errors.
- Guild role assignment remains Guild-owned; the Hermes API currently does not expose profile selection on `/v1/runs`.
- Blocked state remains Guild-maintained because `/v1/runs` events do not expose a stable blocked signal.
- Real task artifacts are still Guild-generated from final API output.

#### Validation
- Added failing tests first for API config, API health, real no-fallback behavior, auto fallback visibility, API task submission, API failure surfacing, and removal of subprocess language from normal real logs.
- `bun test src/bridge/bridgeFactory.test.ts`: passed after implementation; 8 tests / 46 assertions.
- `bun run verify:web`: passed; Tauri config check, TypeScript, 32 tests / 142 assertions, and Vite production build passed.
- `cargo fmt --check`: passed.
- `cargo check` in `src-tauri`: passed after removing subprocess invoke handlers.
- `curl -sS http://127.0.0.1:8642/health`: failed to connect, indicating no local Hermes API server was running during this pass; no model task was submitted.
- Stopped the previously running Vite dev server on port `1422`.

### 2026-05-04 02:12 CST — Native pet window stacking and drag fixed

#### Goal
Stop the native Pet Mode window from covering the Guild Hall window and make the undecorated pet window movable.

#### Root Cause
- `src-tauri/tauri.conf.json` set the `pet` window `alwaysOnTop` flag to `true`.
- `scripts/check-tauri-config.mjs` enforced that always-on-top behavior as a v0 expectation.
- Pet dragging relied only on `data-tauri-drag-region`; the app did not explicitly call Tauri's `startDragging()` window API or declare the corresponding capability.

#### Changed
- Set the native `pet` window `alwaysOnTop` flag to `false`.
- Updated the Tauri config checker to require the pet window not be pinned always-on-top.
- Added `startPetWindowDrag()` using `@tauri-apps/api/window.getCurrentWindow().startDragging()`.
- Wired the drag handler only for the actual `/?mode=pet` window, not the embedded pet panel in Guild Hall.
- Added `src-tauri/capabilities/default.json` with `core:window:allow-start-dragging` plus the existing window focus/show permissions needed by the Hall button.

#### Validation
- `bun run verify:web`: passed; Tauri config check, TypeScript, 32 tests / 142 assertions, and Vite production build passed.
- `cargo fmt --check`: passed.
- `cargo check` in `src-tauri`: passed.
- `bun run tauri:dev`: compiled and launched `target/debug/hermes-guild` with the updated config.
- Stopped the Tauri dev process and Vite dev server after the native launch check.

### 2026-05-04 02:45 CST — Native Hermes API proxy added

#### Goal
Stop real bridge health checks from failing in native mode when Hermes API is healthy but rejects WebView-origin browser fetches.

#### Root Cause
- `curl http://127.0.0.1:8642/health` returned HTTP 200.
- Requests with WebView-like `Origin` headers returned HTTP 403 from Hermes API.
- The native app used browser `fetch()` from the React WebView, so WebKit surfaced the CORS rejection as `Load failed`.

#### Changed
- Added `NativeHermesApiClient`, which uses Tauri `invoke()` instead of browser `fetch()` when `__TAURI_INTERNALS__` is present.
- Added a Rust `hermes_api_request` command using `reqwest` for native HTTP GET/POST.
- Kept `FetchHermesApiClient` for browser/Vite mode.
- Kept the existing Hermes API response parsing, SSE parsing, task completion, and report-card behavior in TypeScript.
- Added focused tests for native health checks, native `/v1/runs` + SSE reads, browser HTTP errors, and SSE comment handling.

#### Validation
- `bun test src/bridge/hermesApiClient.test.ts src/bridge/bridgeFactory.test.ts`: passed; 12 tests / 55 assertions.
- `bun run verify:web`: passed; Tauri config check, TypeScript, 36 tests / 151 assertions, and Vite production build passed.
- `cargo fmt --check`: passed.
- `cargo check` in `src-tauri`: passed.
- `curl -sS http://127.0.0.1:8642/health`: returned `{"status": "ok", "platform": "hermes-agent"}` before native launch.
- `bun run tauri:dev`: compiled and launched `target/debug/hermes-guild` with the native proxy command registered.

## Scope Guard
Deferred:
- multiple pets
- auto-claim
- party quests
- XP/levels
- Tavern
- Skill Deck
- Infirmary
- voice input
- full Hermes WebUI parity, gateway UI, memory UI, skill management, workspace browser, and multi-agent orchestration

## Remaining Gaps
- Pet position persistence is bridge-mocked, not native-persisted.
- Hermes integration notes for deeper runtime/WebUI parity remain deferred: `docs/HERMES_NOTES.md` and `docs/HERMES_WEBUI_ANALYSIS.md`.
- Live Hermes progress is limited to selected `/v1/runs` SSE events; artifacts beyond final API output, provider health details, and profile availability are minimal or derived in the real bridge.
- Direct native webview content introspection remains limited by desktop automation access.
- Completion audit is documented in `docs/COMPLETION_AUDIT.md`.
- Native verification handoff is documented in `docs/NATIVE_VERIFICATION.md`.
