<goal>
Make Hermes Guild profile-context routed chat work end to end. Selecting a Hermes profile in Pet or Guild context must bind new chat/task execution to that profile, route through the best verified source in precedence order, and surface the real route used without modifying Hermes source code or relying on a separately started Hermes dashboard service.
</goal>

<context>
Read these files first:
- `AGENTS.md`
- `SPEC.md`
- `docs/API_CONTRACT.md`
- `docs/HERMES_CAPABILITY_MATRIX.md`
- `docs/HERMES_INTEGRATION_PLAN.md`
- `docs/EXECUTION_LOG.md`
- `src/types.ts`
- `src/bridge/types.ts`
- `src/bridge/hermesApiClient.ts`
- `src/bridge/hermesApiClient.test.ts`
- `src/bridge/hermesProfileClient.ts`
- `src/bridge/hermesProfileClient.test.ts`
- `src/bridge/hermesSidecarClient.ts`
- `src/bridge/hermesSidecarClient.test.ts`
- `src/bridge/realHermesBridge.ts`
- `src/bridge/bridgeFactory.ts`
- `src/bridge/bridgeFactory.test.ts`
- `src/App.tsx`
- `src/App.pet.test.ts`
- `sidecar/hermes_guild_sidecar.py`
- `sidecar/tests/`
- `src-tauri/src/lib.rs`

Read-only Hermes references. Do not edit these files:
- `/Users/plutoless/.hermes/hermes-agent/gateway/platforms/api_server.py`
- `/Users/plutoless/Documents/hermes-webui/api/routes.py`
- `/Users/plutoless/Documents/hermes-webui/api/streaming.py`
- `/Users/plutoless/Documents/hermes-webui/api/profiles.py`
- `/Users/plutoless/Documents/hermes-webui/server.py`

Useful discovery commands:
```bash
git status --short
git -C /Users/plutoless/.hermes/hermes-agent status --short
rg "runTask|HermesApiRunTaskInput|ProfileContext|profileRouting|executionRouting|/v1/runs|capabilities|profiles|sidecar|Pet quick chat" src sidecar docs
curl -s --max-time 2 http://127.0.0.1:8642/health
curl -s --max-time 2 http://127.0.0.1:8642/v1/profiles
curl -s --max-time 2 http://127.0.0.1:8642/v1/profile/active
curl -s --max-time 2 http://127.0.0.1:8642/v1/capabilities
hermes --help
hermes profile --help
hermes profile list
```
</context>

<constraints>
- Never edit, patch, monkey-patch, vendor, or write tests into Hermes source from this project.
- Do not require users to start `hermes dashboard` or another standalone dashboard service for normal Guild execution.
- Do not use protected dashboard APIs as the normal message execution route.
- Use source precedence for real signals and execution: public official REST > stable official CLI > safe read-only local Hermes state > Hermes Guild Python sidecar > Guild-owned workflow state > unavailable.
- Mock is test-only and must not be a runtime fallback.
- Do not use `hermes profile use` or any global active-profile mutation for per-task or per-session routing.
- Do not send unsupported `profile`, `profile_id`, `profile_name`, or `X-Hermes-Profile` data to `/v1/runs`.
- Public REST selected-profile fields may be sent only after gateway health/capability/profile metadata proves routing support.
- CLI execution may be used only when a stable official per-command profile mechanism is discovered and it does not mutate global active state.
- Local state may provide metadata/evidence; it must not be used to fake execution routing.
- Python sidecar execution may be used only when it can call a verified official CLI/import mechanism without editing Hermes source, is loopback-only, and returns structured route evidence.
- Profile selection affects new messages/tasks only; do not rewrite existing task/session profile history after profile switches.
- Pet chat bubbles must show only user text, actual Hermes returned output/progress text, and concise errors. Do not reintroduce greeting, sending, accepted, report-ready, `Quest accepted`, or `Returned output:` wrapper text.
- Preserve unrelated dirty and untracked files.
- Do not broaden scope into profile creation/editing, multi-pet, multi-agent orchestration, Tavern, Skill Deck, Infirmary, or decorative RPG stats.
</constraints>

<done_when>
- `SPEC.md` and `GOAL.md` define profile-context routed chat as the active goal and state that Hermes source code must not be modified.
- Hermes source checkout status is checked and remains unmodified by this work.
- Pet/Guild profile selection creates or updates a real `ProfileContext` for new chat/task execution, including profile id/name, profile identity source, route source/mode, session id when applicable, verification status, and unavailable reason when applicable.
- Pet messages and Quest Board tasks both pass selected profile context into bridge execution.
- Switching the active profile affects only new work; existing tasks, reports, timeline entries, and session records preserve their original selected profile context.
- Public REST `/v1/runs` sends selected profile context only when capability metadata proves request/session profile routing support.
- Unsupported public REST gateways receive no unsupported profile fields or profile headers.
- CLI route discovery is implemented and tested or rejected with exact probe evidence from official `hermes` command help/output.
- Local-state route usage is implemented only for safe read-only metadata/evidence, or explicitly rejected for execution with exact evidence.
- Python sidecar selected-profile run support is implemented and tested when a verified official route exists; otherwise sidecar run endpoints return structured unsupported responses with the exact blocker.
- Routed chat works end to end through the best verified source available on the installed Hermes, or the UI shows a precise `profile routing unavailable` state after REST, CLI, local-state, and sidecar routes have been checked.
- Task timeline, report card, Integration Truth/System Status, and relevant docs show selected profile, actual route source/mode, Hermes run id when present, and unavailable reason when relevant.
- Pet chat displays no app-authored lifecycle wrapper text and shows raw Hermes output/progress/error only.
- `docs/API_CONTRACT.md`, `docs/HERMES_CAPABILITY_MATRIX.md`, `docs/HERMES_INTEGRATION_PLAN.md`, and `docs/EXECUTION_LOG.md` are updated with the final route behavior, source evidence, and remaining gaps.
- `bun test src/bridge/hermesApiClient.test.ts` passes.
- `bun test src/bridge/bridgeFactory.test.ts` passes.
- `bun test src/bridge/hermesProfileClient.test.ts` passes.
- `bun test src/bridge/hermesSidecarClient.test.ts` passes.
- `bun test src/App.pet.test.ts` passes.
- `python3 -m unittest discover sidecar/tests` passes.
- `bun run verify:web` passes.
- `cd src-tauri && cargo fmt --check` passes if native code changes.
- `cd src-tauri && cargo check` passes if native code changes.
</done_when>

<workflow>
1. Check `git status --short` and identify unrelated work to preserve.
2. Check Hermes source status with `git -C /Users/plutoless/.hermes/hermes-agent status --short`; do not edit that checkout.
3. Read the spec, API contract, capability matrix, integration plan, execution log, bridge types, bridge clients, app code, sidecar code, and tests.
4. Probe installed Hermes public REST health/profile/capability endpoints and record exact results.
5. Inspect Hermes WebUI and Hermes gateway code as read-only references for session/profile-context behavior.
6. Inspect official Hermes CLI help/output for selected-profile execution mechanisms. Record exact evidence before implementing any CLI route.
7. Design the smallest `ProfileContext` and route-resolution changes that fit existing bridge/domain patterns.
8. Add or update focused failing tests for profile context propagation, route precedence, unsupported REST omission, profile switching history preservation, sidecar/CLI behavior, and Pet chat wrapper regressions.
9. Implement route resolution in the bridge: public REST first, then verified CLI/local-state/sidecar mechanisms, then explicit unavailable.
10. If a verified CLI route exists, implement it with bounded argument handling and no shell interpolation.
11. If sidecar execution is needed and verifiable, implement loopback-only sidecar run endpoints and TypeScript client support; otherwise keep structured unsupported responses.
12. Wire Pet and Quest Board chat/task submission through the same profile-context route.
13. Update task timeline/report/system status UI so it reports actual route evidence without polluting Pet chat bubbles.
14. Update docs and execution log with probes, route decisions, and any remaining unavailable gaps.
15. Run focused tests, fix failures, then run broad web and native checks required by the changed files.
16. Audit every `done_when` item before final response.
</workflow>

<verification_loop>
Focused web checks:
```bash
bun test src/bridge/hermesApiClient.test.ts
bun test src/bridge/bridgeFactory.test.ts
bun test src/bridge/hermesProfileClient.test.ts
bun test src/bridge/hermesSidecarClient.test.ts
bun test src/App.pet.test.ts
```

Sidecar checks:
```bash
python3 -m unittest discover sidecar/tests
python3 sidecar/hermes_guild_sidecar.py --self-test
```

Full web validation:
```bash
bun run verify:web
```

Native validation, required if `src-tauri` changes:
```bash
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

Manual UI check when a dev server is available:
- Open `/?mode=pet&variant=skyship-command-deck&pet=expanded`.
- Confirm input is empty and focused.
- Select a real non-default Hermes profile if available.
- Send a Pet message.
- Confirm the new task/report records the selected profile, route source/mode, and Hermes run id when present.
- Confirm Pet chat shows only user text and raw Hermes output/progress/error.
- Confirm no `Quest accepted`, `Returned output:`, greeting, report-ready, or fake route text appears in chat bubbles.
- Confirm switching the profile and sending another message does not rewrite the first task's profile context.
</verification_loop>

<execution_rules>
- Check git status before edits.
- Preserve unrelated user changes.
- Prefer `rg` over `grep` when available.
- Use `apply_patch` for manual code/doc edits.
- Read context files before implementation.
- Batch independent file reads in parallel when the runtime supports it.
- Run focused tests before broad tests.
- Do not paper over failures.
- Do not widen scope.
- Keep the final answer concise.
- Do not edit files outside this repo unless the user explicitly asks for that exact file change.
- Treat `/Users/plutoless/.hermes/hermes-agent` and `/Users/plutoless/Documents/hermes-webui` as read-only references.
</execution_rules>

<output_contract>
Final response should include:
- Hermes source was not modified, or any accidental Hermes edits were reverted
- Hermes Guild files changed
- verified route source used for selected-profile chat, or exact reason routing remains unavailable
- profile context behavior implemented for Pet and Quest Board
- verification commands and results
- remaining gaps, especially any missing Hermes public REST/CLI capability
</output_contract>
