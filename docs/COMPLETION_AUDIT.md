# Hermes Guild v0 Completion Audit

Audit date: 2026-05-03 23:07 CST

## Objective Restated

Build as much of Hermes Guild v0 as possible in milestone order, using a mock Hermes Bridge before real Hermes integration, while keeping the app runnable and maintaining execution documentation. The intended product loop is:

```text
Pet -> Quest -> Timeline -> Report Card -> Review
```

## Checklist

| Requirement | Evidence | Status |
| --- | --- | --- |
| Read `docs/PRD.md` | Reflected in PRD acceptance mapping below and execution log checkpoints. | Verified |
| Read `docs/DESIGN.md` | v0 scope, exclusions, trait language, and review flow are implemented without v0.5 features. | Verified |
| Read `docs/AGENT_RULES.md` | `docs/TASKS.md` milestone order followed and `docs/EXECUTION_LOG.md` maintained. | Verified |
| Read `docs/TASKS.md` | All T001-T025 checkboxes are completed. | Verified |
| Read `docs/REFERENCES.md` | Added required `docs/API_CONTRACT.md` and `docs/TAURI_SPIKE_PLAN.md`; deferred real Hermes notes per reference guidance. | Verified |
| Read `docs/EXECUTION_LOG.md` | Continued checkpoints and blocker/remaining-gap tracking. | Verified |
| Initial API contract | `docs/API_CONTRACT.md` defines `Agent`, `Task`, `TimelineEvent`, `Artifact`, `ReportCard`, and `BridgeEvent`. | Verified |
| Tauri + React scaffold | `package.json`, Vite/TS config, `src/`, and `src-tauri/` exist. | Verified |
| Tauri/native scaffold shape | `bun run check:tauri-config` validates window keys, Vite/Tauri dev URL alignment, Cargo manifest fragments, native entrypoint, build script, and v0 expectations. | Verified |
| Shared mock bridge state | App singleton persists mock snapshot to `localStorage`, broadcasts updates with `BroadcastChannel`, and has a storage-event fallback; test instances stay isolated; restored/remote snapshots are sanitized, tolerate non-object snapshots and malformed collections/system status/pet position, and restore the fixed v0 roster; remote terminal states stop local lifecycle timers. | Storage envelope, restore, storage-event fallback, task BroadcastChannel, active-profile BroadcastChannel, invalid profile sanitization, missing-roster restoration, malformed snapshot tolerance, BroadcastChannel timer reconciliation, and storage-fallback timer reconciliation paths verified by tests; native cross-window runtime unverified |
| App launches locally | `bun run dev` launches Vite; browser verification was performed. | Verified for web dev mode |
| One active pet | `src/App.tsx` renders Pet Mode; `/?mode=pet` renders only the compact pet surface. | Verified in browser route |
| Native desktop pet window | `src-tauri/tauri.conf.json` defines `pet` window with `transparent`, `decorations: false`, and `alwaysOnTop`; `check:tauri-config` validates keys exist in installed schema. | Scaffolded and schema-checked, not runtime-verified |
| Pet opens Guild Hall | Pet Hall action focuses Tauri `main` window when available and falls back to in-page Hall in browser dev mode. | Verified fallback; native unverified |
| Pet position persistence | Bridge exposes `petPosition`; app singleton syncs mocked position through BroadcastChannel and storage fallback; native window persistence is not implemented. | Mocked, tested, and documented |
| Mock agents | Researcher, Builder, Reviewer are seeded in `src/bridge/mockHermesBridge.ts`. | Verified by tests |
| Active profile selection | Pet/Guild Hall controls call `setActiveProfile`; bridge ignores unknown active profile ids; persistent bridge instances sync active profile changes through `BroadcastChannel`. | Verified by implementation/tests |
| Direct task creation | Pet and Quest Board call `createTask` with explicit assignee; bridge rejects unknown assignees; Quest Board supports optional advanced brief fields behind disclosure. | Verified by tests/browser |
| Lifecycle events | Mock bridge emits created, assigned, running/progress, blocked, completed, needs review, approved, agent idle, revision, and error states. | Verified by tests |
| Pet input creates task | `createPetQuest()` creates a pet task for the active agent. | Verified in browser |
| Guild Hall shows active profile/task/reviews | `GuildHall` renders active profile, active quest, pending review count, and character cards; bridge has local cross-webview sync for Tauri windows. | Verified in browser; native sync unverified |
| Quest Board shows task list/detail | `QuestBoard` and `TaskDetail` render task list, detail, artifacts, progress, advanced brief fields, and timeline. | Verified in browser, including task detail with 3 artifacts and 4 advanced brief fields |
| Timeline updates from bridge | Task timeline is stored in bridge snapshot and rendered in `TaskDetail`. | Verified by tests/browser, including 9 visible timeline entries after completion and revision request |
| Report card generation | `reportForTask()` creates report cards with artifacts, facts, assumptions, gaps, and review items. | Verified by tests/browser |
| Review approve | `approveReport()` updates task/report review state; Review actions only remain available and bridge-actionable for tasks still in `needs_review` with required review status. | Verified by tests/browser |
| Review revise/rerun | `requestRevision()` creates a revision task assigned to the same agent, preserves original advanced brief fields, and reruns lifecycle only when the original report is still actionable. | Verified by tests/browser |
| Blocked/error visible | `simulateBlocked()` and `simulateError()` set task, agent, timeline, reviewability, and system state; Block and Error buttons trigger those states. | Verified by tests and browser DOM inspection |
| README updated | `README.md` includes run commands, test command, mocked behavior, advanced intake, blocked/error controls, and native prerequisites. | Verified |
| Execution log maintained | `docs/EXECUTION_LOG.md` contains checkpoints, decisions, blockers, mocked state, test/build results, and gaps. | Verified |
| Web verification command | `bun run verify:web` runs Tauri config check, lint, tests, and production build. | Verified |
| Native prerequisite check | `bun run check:native` reports missing native prerequisites and setup command. | Verified blocker |
| Native verification handoff | `docs/NATIVE_VERIFICATION.md` defines post-prerequisite pass criteria and result logging, including advanced intake and blocked/error checks. | Verified |
| Relevant commands run | `bun run verify:web`, `bun run check:native`, `bun run tauri:dev`, timed `bunx tauri info`, `sudo apt-get update`. | Verified |
| Do not expand v0 scope | Deferred features remain in Scope Guard; no Tavern/Skill Deck/Infirmary/XP/multiple pet features built. | Verified |

## Command Evidence

- `bun run verify:web`: passed on 2026-05-03 23:07 CST; Tauri config check passed, lint passed, tests passed with 24 tests / 96 assertions, production build passed.
- `bun run check:tauri-config`: passed; installed Tauri schema contains the required window keys, Vite uses strict port 1420, Tauri dev URL matches, `pet` window matches v0 expectations, and native scaffold files match expected Tauri 2 entrypoints.
- `bun run build`: passed after the latest source changes.
- `bun run lint`: passed after the latest source changes.
- `bun run test`: passed with 24 tests and 96 assertions after adding non-object stored snapshot tolerance coverage.
- Browser check: `http://127.0.0.1:1422/?mode=pet` showed only Pet Mode controls.
- Browser flow check: on `http://127.0.0.1:1422/`, pet task -> mock completion -> Review -> revise -> rerun -> approve was exercised with agent-browser snapshots; Review action clicks were confirmed through DOM click evaluation after accessibility-ref clicks did not visibly trigger.
- Browser task detail check: Quest Board detail showed 3 artifacts and 9 visible timeline entries after completion and revision request.
- Browser error check: Error action changed the pet status to `Error`, task detail state to `ERROR`, displayed `Mock gateway error: provider response timed out.`, and updated the system strip.
- Browser advanced intake check: Quest Board advanced disclosure accepted goals, non-goals, context, and definition of done; created task detail displayed all 4 fields.
- Browser blocked check: Block action changed pet status to `Blocked`, task detail state to `BLOCKED`, added a blocked timeline entry, and updated the system strip.
- Browser blocked reviewability check: blocked task no longer appeared as a pending Review badge/actionable report.
- `bun run tauri:dev`: failed because `cargo` is not installed.
- `bun run check:native`: failed as expected on 2026-05-03 23:07 CST, reporting missing `cargo`, `rustc`, `rustup`, and `pkg-config`; WebKit/rsvg checks were skipped because `pkg-config` is missing.
- `timeout 15s bunx tauri info`: reported missing `webkit2gtk-4.1`, `rsvg2`, `rustc`, `Cargo`, and `rustup`; exited with timeout after printing environment details.
- `sudo apt-get update`: blocked by sudo password prompt.

## PRD Acceptance Mapping

| PRD acceptance criterion | Evidence | Status |
| --- | --- | --- |
| App launches locally | Vite dev server launches and browser checks pass. | Verified for web dev mode |
| One pet window appears | Pet-only route exists and Tauri config defines a pet window. | Scaffolded; native unverified |
| Pet can open Guild Hall | Hall action implemented with native focus attempt and browser fallback. | Partially verified |
| User can select active profile | Pet and Hall profile actions wired to bridge. | Verified |
| User can submit text task from pet | Pet input creates tasks. | Verified |
| Task is assigned to active profile | Bridge tests assert pet task assignee. | Verified |
| Guild Hall shows the task | Browser flow shows created tasks in Hall/Board. | Verified |
| Quest Board shows task list and detail | Implemented and browser-verified, including advanced brief fields behind disclosure. | Verified |
| Task detail shows timeline progress | Timeline rendered, bridge tests assert events, and browser task detail check showed visible timeline entries. | Verified |
| Mock execution completes | Bridge tests wait for completion and assert `needs_review`. | Verified |
| Quest Report Card appears in Review | Browser flow and tests verify reports. | Verified |
| User can approve | Bridge tests and browser flow approve report. | Verified |
| User can revise and rerun | Bridge tests and browser flow request revision and complete rerun. | Verified |
| Error state is visible | Error action, bridge error test, and browser DOM inspection verify pet/task/system error state. | Verified |
| README explains how to run and what is mocked | `README.md` updated. | Verified |

## Remaining Blocker

Native Tauri verification cannot be completed in this environment because required Linux/Tauri prerequisites are missing and `sudo` requires an interactive password. The next verification step is:

```bash
sudo apt-get update
sudo apt-get install -y cargo rustc pkg-config libwebkit2gtk-4.1-dev librsvg2-dev
bun run check:native
bun run tauri:dev
```

Only after that can the transparent always-on-top pet window, native Guild Hall focus action, and native pet positioning behavior be proven.

Use `docs/NATIVE_VERIFICATION.md` for the native pass/fail checklist after prerequisites are installed.
