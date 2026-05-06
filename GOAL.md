<goal>
Wire Hermes Guild Pet Mode end to end so real Hermes profiles appear as companions, selected companions can open/show profile-specific native windows, and chat sent to each companion routes to that companion's Hermes profile.
</goal>

<context>
Read these files first:

- `SPEC.md`
- `AGENTS.md`
- `docs/DESIGN.md`
- `docs/API_CONTRACT.md`
- `docs/HERMES_CAPABILITY_MATRIX.md`
- `src/App.tsx`
- `src/types.ts`
- `src/hooks/useBridgeSnapshot.ts`
- `src/bridge/types.ts`
- `src/bridge/realHermesBridge.ts`
- `src/bridge/mockHermesBridge.ts`
- `src/bridge/bridgeFactory.ts`
- `src/bridge/hermesApiClient.ts`
- `src/bridge/hermesProfileClient.ts`
- `src/bridge/hermesProfileRunClient.ts`
- `src/App.pet.test.ts`
- `src/bridge/bridgeFactory.test.ts`
- `src/bridge/hermesProfileClient.test.ts`
- `src/bridge/hermesProfileRunClient.test.ts`
- `package.json`

Inspect native window code before implementation:

- `rg -n "window|WebviewWindow|tauri|panel=|label|showPanelWindow|hidePanelWindow" src src-tauri`
- `rg --files src-tauri`

Useful discovery commands:

- `rg -n "CompanionsPopover|selectedCompanion|createCompanionChatProvider|handleSubmit|PanelWindowShell" src/App.tsx`
- `rg -n "HermesBridgeApi|Agent|Task|profileContext|setActiveProfile|createTask" src src/bridge docs/API_CONTRACT.md`
- `rg -n "profileRouting|HermesProfile|hermes_profile_run|/v1/profiles" src/bridge src-tauri docs`
</context>

<constraints>
- Preserve unrelated working-tree changes.
- Do not patch Hermes source code.
- Do not use `hermes profile use` or mutate a global sticky Hermes profile to route one message.
- Do not silently present mock profiles as real in real mode. If real profile metadata is unavailable, show a concrete unavailable/source state.
- Keep mock/dev behavior only for tests and explicit mock mode.
- Keep profile context stable on existing tasks and reports after the user switches companion/profile.
- Avoid broad UI redesign. Only add UI needed for real profile/source/unavailable state and multi-companion control.
- Keep Hermes Guild product constraints from `AGENTS.md` and `docs/DESIGN.md`: real Hermes state first, serious operational workflow, no fake stats or unrelated RPG surfaces.
- Multiple companion windows must not all route through a single mutable `selectedCompanionId`; each chat surface needs stable companion/profile identity.
</constraints>

<done_when>
- In real/auto-real mode, `CompanionsPopover` displays real Hermes profiles from bridge snapshot/profile metadata when available, instead of the hard-coded Hermes/Astra/Orion roster.
- If real profile metadata is unavailable, the Companions UI shows a clear unavailable/source state and does not silently substitute mock profiles as real.
- Selecting/showing at least two companions creates or shows multiple native profile-specific pet/chat windows, or an equivalent existing native-window pattern where each visible window is tied to a distinct companion/profile.
- Hiding a companion closes or hides only that companion's native pet/chat window without deleting the profile.
- Sending chat from companion/profile A routes to profile A, and sending chat from companion/profile B routes to profile B; route evidence preserves the profile id/name in task `profileContext`, Hermes run input, or logged/native route metadata.
- Unsupported selected-profile routing does not send unsupported REST profile fields and surfaces routing unavailable instead of pretending success.
- Existing explicit mock mode and current tests still work.
- New or updated tests cover real profile-to-companion mapping, multi-companion identity preservation, and per-profile chat routing for two different profiles.
- `bun run lint` passes.
- `bun run test` passes.
- Native manual verification confirms: real profiles visible in Companions, at least two profile-specific windows are shown, and two messages sent to different profiles produce distinct routing evidence.
</done_when>

<workflow>
1. Run `git status --short` and identify unrelated changes to preserve.
2. Read the context files listed above. Inspect existing bridge snapshot shape, profile metadata sources, companion runtime state, chat submit path, and native window helpers.
3. Map current data flow:
   - real Hermes profiles/agents in bridge snapshot,
   - companion roster in `App.tsx`,
   - selected companion/window state,
   - chat submission into `createCompanionChatProvider` / bridge task or run routing.
4. Design the smallest data model change that binds each companion to a stable Hermes profile id/name/source while preserving local appearance/visibility settings.
5. Implement real profile hydration for the Companions dialog:
   - use bridge profile/agent data when real metadata exists,
   - preserve explicit mock mode behavior,
   - surface unavailable/source state when real profiles are missing.
6. Implement profile-specific native window behavior:
   - inspect and reuse existing Tauri window patterns,
   - ensure each visible companion can map to a stable window label or route,
   - ensure closing/hiding one companion affects only that companion.
7. Implement per-profile chat routing:
   - pass stable companion/profile identity from each chat surface,
   - ensure bridge task/run input uses that profile,
   - preserve route evidence in `profileContext` or run metadata.
8. Add or update focused tests for profile mapping, multi-companion identity, and two-profile chat routing.
9. Run `bun run lint`; fix regressions.
10. Run `bun run test`; fix regressions.
11. Perform native manual verification with real Hermes profile metadata if available. Capture exact evidence for:
    - real profile names in Companions,
    - multiple profile-specific windows,
    - profile A and profile B message routing.
12. Audit the final diff against every `done_when` item before declaring completion.
</workflow>

<verification_loop>
Automated commands:

- `bun run lint`
- `bun run test`

Focused test expectations to add or confirm:

- Real bridge profile metadata produces companion rows with real profile names.
- Profile unavailable state does not masquerade as mock profile data in real mode.
- Two selected/visible companions keep separate profile ids/names.
- Chat sent from two companion contexts routes to two distinct profile ids/names.
- Unsupported REST profile routing omits unsupported `profileId`, `profile_id`, `profileName`, and `profile_name` request fields.

Native/manual checks:

- Start the app through the repo's existing Tauri/native workflow.
- Open Companions and confirm real Hermes profiles are visible when Hermes exposes profile metadata.
- Select/show two profiles and confirm two native profile-specific windows or equivalent distinct native companion windows.
- Send one message to each profile.
- Verify route evidence in UI, bridge snapshot, logs, task `profileContext`, or Hermes run input shows each message used the intended profile.
- Confirm no code path calls `hermes profile use`.

If real Hermes profile metadata is not available locally, use existing bridge/client test doubles for automated evidence and clearly report which native manual checks could not be fully completed.
</verification_loop>

<execution_rules>
- Check git status before edits.
- Preserve unrelated user changes.
- Prefer `rg` over `grep` when available.
- Use `apply_patch` for manual code edits.
- Read context files before implementation.
- Batch independent file reads in parallel when possible.
- Run focused tests before broad tests.
- Do not paper over failures.
- Do not widen scope.
- Keep the final answer concise.
- Follow `AGENTS.md`: Hermes Guild is a desktop-native RPG workbench for AI agents, not a generic admin dashboard with fantasy styling.
- Respect Hermes source precedence from `docs/API_CONTRACT.md` and `docs/HERMES_CAPABILITY_MATRIX.md`.
- Do not mark completion until each `done_when` item has concrete evidence from tests, code inspection, native/manual checks, or a clearly reported unavailable local dependency.
</execution_rules>

<output_contract>
Final artifacts should include:

- Updated profile/companion/chat/native window implementation files, likely in `src/App.tsx`, `src/types.ts`, `src/hooks/useBridgeSnapshot.ts`, `src/bridge/*`, and/or `src-tauri/*` depending on inspection.
- Updated or new tests proving real profile-to-companion mapping and per-profile chat routing.

Final response must include:

- Summary of changed data flow.
- Evidence for each of the three user requirements:
  1. real profiles in Companions,
  2. multiple profile-specific native windows,
  3. correct per-profile chat routing.
- Results for `bun run lint` and `bun run test`.
- Native manual verification results, or exact blockers if local real Hermes/native checks could not be completed.
</output_contract>
