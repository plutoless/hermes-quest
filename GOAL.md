<goal>
Remake Hermes Guild v0 into the companion-first desktop product described by `docs/v0-remake-prd.md`, using `docs/design.png` as the visual target. The normal runtime must be a borderless transparent desktop companion experience with compact floating controls, not a Guild Hall/dashboard/task/review workbench. Preserve the Hermes communication bridge where useful by adapting it behind a simple companion chat provider.
</goal>

<context>
Read these files first:
- `AGENTS.md`
- `SPEC.md`
- `docs/v0-remake-prd.md`
- `docs/design.png`
- `src/App.tsx`
- `src/styles.css`
- `src/types.ts`
- `src/bridge/types.ts`
- `src/bridge/bridgeFactory.ts`
- `src/bridge/realHermesBridge.ts`
- `src/bridge/mockHermesBridge.ts`
- `src/hooks/useBridgeSnapshot.ts`
- `src-tauri/tauri.conf.json`
- `src-tauri/src/lib.rs`
- `src/App.pet.test.ts`
- `package.json`

Important product decision:
- Option A is user-approved. `docs/v0-remake-prd.md` supersedes the previous Guild Hall / Quest Board / Review Chamber product direction for v0 normal runtime.
- `docs/design.png` is the concrete visual reference for layout language, color, popovers, speech bubble, and input capsule.
- The Hermes communication bridge can stay, but the user-facing v0 UI should expose companion chat and presence controls, not task/review workflows.

Useful discovery commands:
```bash
git status --short
rg "Guild Hall|Quest Board|Review Chamber|pixel-ui-showcase|variant-|view=hall|view=board|view=review|mode=pet|createTask|approveReport|requestRevision|Pixel" src docs package.json
rg "bridge|HermesBridgeApi|ChatMessage|ChatProvider|runTask|submitTask|mock" src
rg "transparent|alwaysOnTop|decorations|pet|main" src-tauri/tauri.conf.json src-tauri/src/lib.rs
```
</context>

<constraints>
- Preserve unrelated user changes and existing dirty work.
- Keep the remake scoped to v0 companion-first runtime. Do not reintroduce dashboard navigation, task boards, review chambers, report cards, timelines, or artifact workflows into normal product UI.
- Do not delete or rewrite Hermes bridge/client/sidecar/native communication code merely because the dashboard UI is removed; keep useful communication paths and adapt them behind a small companion chat provider.
- Do not modify Hermes source outside this repository.
- Mock/local mode is allowed by the PRD only as an explicit mode. Do not silently fall back to mock when real Hermes mode is selected and Hermes is unavailable.
- Use language from the PRD in the UI: `Hermes`, `Companions`, `Appearance`, `Show on desktop`, `Preset`, `Generate`, `Upload`, `Sprite Sheet Preview`, `Settings`.
- Avoid old product language in normal runtime: `Guild Hall`, `Quest Board`, `Review Chamber`, `quests`, `reports`, `agents`, `workflow`, `mission control`, `provider dashboard`, `tool registry`.
- Visual direction must track `docs/design.png`: mature anime concierge, detached glass popovers, white/silver/lavender palette, visible desktop/background, compact controls, and no JRPG/pixel dashboard styling.
- Do not build a marketing or landing page.
- Do not choose Godot or rewrite away from the existing Tauri/React stack.
- Generated/uploaded appearance flows may be honest placeholders in v0 if full image generation/file handling would widen scope.
- Text and controls must not overlap on desktop or constrained viewport checks.
- If large legacy asset directories remain on disk, they must not be imported by normal runtime UI unless explicitly justified.
</constraints>

<done_when>
- `SPEC.md` and `GOAL.md` define the v0 companion remake, name `docs/v0-remake-prd.md` as the product source, and name `docs/design.png` as the visual target.
- Default runtime launches as a borderless, transparent, always-on-top desktop companion experience, not a dashboard.
- Normal v0 UI contains only the floating companion, speech bubble, input bar, Companions popover, Appearance popover, and compact Settings popover.
- Existing Guild Hall, Quest Board, Review Chamber, pixel/JRPG dashboard variants, and full app navigation are removed from normal product runtime.
- Hermes bridge/client/sidecar/native communication paths are preserved where useful behind a `ChatProvider` or equivalent companion-chat adapter.
- The companion supports click-to-chat.
- The companion supports drag positioning when dragging is enabled.
- Position, scale, visibility, selected companion, and app settings persist locally.
- The companion supports animation states `idle`, `talk`, `think`, and `wave`.
- Sending a message switches the companion through `think`, `talk`, and back to `idle` according to the PRD flow.
- Companion and appearance data follow the PRD model closely enough to support companion visibility, scale, position, behavior settings, appearance source, sprite sheet URL, frame size, row mapping, frames per row, and per-state fps.
- The implementation supports the v0 4x4 sprite sheet contract: row 0 idle, row 1 talk, row 2 think, row 3 wave, four frames per row.
- A default Hermes preset is bundled or represented by a clear PRD-compatible placeholder that can be replaced by a real sprite sheet without changing the component API.
- Companions popover lists companions with thumbnail, name, subtitle/status, visibility toggle, selection behavior, and an honest Add Companion placeholder or simple flow.
- Appearance popover includes portrait/preview, name field, show-on-desktop toggle, size slider, Preset/Generate/Upload tabs, animation preview controls, sprite sheet preview, and applies changes to the visible companion.
- Settings popover includes only app-level settings from the PRD: launch at startup, always on top, remember positions, allow dragging, show speech bubbles, quiet mode, click-through mode, and low resource mode.
- Mock/local mode works without Hermes and is explicit in code/config/UI state.
- Real Hermes mode uses the preserved Hermes bridge where available, or reports a concrete unavailable state without silent mock fallback.
- Tauri config supports the companion-first transparent window model.
- Visual implementation tracks `docs/design.png`: Hermes character is the dominant interface, desktop/background remains visible, controls are detached glass popovers, palette is white/silver/lavender, and normal UI avoids JRPG/pixel/dashboard styling.
- Runtime searches show no normal UI route or control labeled Guild Hall, Quest Board, Review Chamber, or pixel/JRPG variant navigation.
- `bun run verify:web` passes.
- If `src-tauri` files change, `cd src-tauri && cargo fmt --check` and `cd src-tauri && cargo check` pass.
- Manual browser checks confirm no full dashboard UI appears by default, popovers stay compact, text does not overlap, click/drag/chat interactions work, and explicit mock mode works without Hermes.
</done_when>

<workflow>
1. Check `git status --short` and identify unrelated dirty/untracked files to preserve.
2. Read the context files, then inspect current dashboard/pet routing in `src/App.tsx`, bridge contracts, styles, and Tauri window config.
3. Inventory normal runtime entry points and remove or isolate dashboard concepts from the default product route: Guild Hall, Quest Board, Review Chamber, pixel/JRPG variants, full app navigation, task detail, timeline, report cards, and artifact/review actions.
4. Design the smallest companion runtime architecture around local companion state, local appearance state, app settings, sprite animation state, and a UI-facing chat provider.
5. Add or update focused tests before behavior changes where practical. Cover default companion-first rendering, Pet/chat flow, explicit mock mode, no silent mock fallback in real mode, and absence of dashboard navigation from normal runtime.
6. Implement or refactor the UI into focused companion components: companion renderer, sprite animator, speech bubble, input capsule, Companions popover, Appearance popover, Settings popover, and compact controls.
7. Implement local persistence for position, scale, visibility, selected companion, appearances/settings, and last selected companion.
8. Adapt the existing Hermes bridge behind a `ChatProvider` or equivalent. Keep old bridge code if useful, but ensure normal UI creates chat messages rather than quest/task/review workflows.
9. Wire chat state transitions: idle/wave on click or launch, think on send, talk on response, idle after timeout, error state for failures.
10. Update Tauri configuration/native code for the companion-first transparent/frameless/always-on-top model. Prefer one transparent overlay window; if current pet-window architecture is the practical v0 stepping stone, make it the default product window and document the limitation.
11. Replace old visual direction with styling that tracks `docs/design.png`: glass popovers, soft blur/shadows, mature white/silver/lavender palette, clean typography, and no pixel/JRPG chrome.
12. Run focused tests and fix failures without weakening tests.
13. Run `bun run verify:web`; fix all failures.
14. If native files changed, run Tauri/Rust formatting and checks.
15. Start the dev server and perform manual browser checks for default route, pet route if still present, popover states, constrained width, mock mode, and real-Hermes-unavailable state.
16. Run final searches for forbidden normal-runtime labels/routes and confirm old dashboard concepts are not visible in normal product UI.
17. Audit every `done_when` item before responding.
</workflow>

<verification_loop>
Focused checks:
```bash
bun test src/App.pet.test.ts
bun test src/bridge/bridgeFactory.test.ts
```

Broad web validation:
```bash
bun run verify:web
```

Forbidden normal-runtime concept search:
```bash
rg "Guild Hall|Quest Board|Review Chamber|pixel-ui-showcase|variant-royal|variant-magitech|variant-sanctuary|variant-skyship|variant-archive|variant-camp|variant-dungeon|variant-inn|view=hall|view=board|view=review" src
```
Matches are acceptable only when they are tests asserting removal, archived docs, or deliberately isolated non-runtime compatibility code with no normal UI route.

Manual browser checks:
```bash
bun run dev -- --port 1425
```
Inspect:
- `http://127.0.0.1:1425/`
- `http://127.0.0.1:1425/?mode=pet`
- any explicit development/demo route added for popover states

Manual pass criteria:
- default route is companion-first, not dashboard-first
- no Guild Hall / Quest Board / Review navigation appears in normal runtime
- Hermes companion can be clicked, dragged, and chatted with
- speech bubble, input capsule, Companions popover, Appearance popover, and Settings popover are usable
- popovers remain compact and detached
- visual hierarchy and palette track `docs/design.png`
- text does not overlap controls at tested desktop and constrained widths
- explicit mock mode works without Hermes
- real Hermes mode uses Hermes bridge or reports a concrete unavailable state without silent mock fallback

Native checks, required if `src-tauri` files change:
```bash
cd src-tauri && cargo fmt --check
cd src-tauri && cargo check
```
</verification_loop>

<execution_rules>
- Check git status before edits.
- Preserve unrelated user changes.
- Prefer `rg` over `grep` when available.
- Use `apply_patch` for manual edits.
- Read context files before implementation.
- Batch independent file reads in parallel when possible.
- Run focused tests before broad tests.
- Do not paper over failures.
- Do not widen scope.
- Keep the final answer concise.
- Do not edit files outside this repo unless explicitly asked.
- Do not modify Hermes source outside this repository.
- Do not silently substitute mock data for real Hermes mode.
- If a dev server is started, report its local URL and do not leave unnecessary long-running sessions open when finalizing unless the user benefits from trying it.
</execution_rules>

<output_contract>
Final response should include:
- high-level files/modules changed
- confirmation that `docs/v0-remake-prd.md` and `docs/design.png` drove the implementation
- confirmation that normal runtime is companion-first and old dashboard/task/review UI is not visible by default
- how the Hermes bridge is preserved or adapted for companion chat
- whether mock/local mode and real-Hermes-unavailable behavior were verified
- verification commands run and results
- manual browser/native checks performed and any residual risks
- local dev URL if a server is left running for review
</output_contract>
