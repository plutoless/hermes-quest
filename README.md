# Hermes Guild

Hermes Guild is a desktop-native pixel-art JRPG workbench for AI agents. v0 proves one loop:

```text
Pet entry -> profile assignment -> quest execution -> timeline visibility -> report card review
```

## Run

Install JavaScript dependencies:

```bash
bun install
```

Run the React development app:

```bash
bun run dev
```

Build and type-check:

```bash
bun run build
bun run lint
```

Run mock bridge tests:

```bash
bun run test
```

Check the Tauri config shape without launching native runtime:

```bash
bun run check:tauri-config
```

Run the web-side verification suite:

```bash
bun run verify:web
```

Check native Tauri prerequisites:

```bash
bun run check:native
```

Native Tauri target, once Rust/Cargo and Tauri prerequisites are installed:

```bash
bun run tauri:dev
```

## GitHub Automation

Pushes and pull requests run `.github/workflows/ci.yml`, which installs Bun, Rust, and Tauri Linux prerequisites, then runs:

```bash
bun run verify:web
cargo fmt --check
cargo check --locked
```

Pushing a version tag creates a GitHub Release and uploads native bundles for macOS, Windows, and Linux:

```bash
git tag v0.1.0
git push origin v0.1.0
```

## Bridge Modes

Hermes Guild now has three bridge modes:

- `mock`: keeps the local MockHermesBridge loop.
- `real`: uses the Hermes API server.
- `auto`: tries real Hermes first and should surface unavailable/error when Hermes is unavailable. Mock is test/dev-harness only, not a normal runtime fallback.

The default mode is `auto`. The production Guild Hall keeps bridge truth compact: a titlebar status chip plus a small Integration Truth strip. Bridge configuration is tucked behind the titlebar status details instead of appearing as an always-visible Apply-style control. The visible truth data includes:

- selected mode: `mock`, `real`, or `auto`
- active implementation: `mock`, `real`, or `loading`
- Hermes availability: `available`, `unavailable`, or `unchecked`
- unavailable/error reason when a real Hermes source is missing
- profile data source: Guild-defined roles
- execution source: bridge loading, Real Hermes API, explicit test/dev mock harness, or unavailable

Changing the mode in bridge status details and pressing `Save` writes bridge config to browser/Tauri local storage under `hermes-guild.bridge-config` and rebuilds the active bridge. You can also seed the same config in dev tools:

```js
localStorage.setItem('hermes-guild.bridge-config', JSON.stringify({
  bridgeMode: 'auto',
  hermesApiBaseUrl: 'http://127.0.0.1:8642'
}))
```

Use `bridgeMode: 'mock'` only for tests, fixtures, and explicit development harnesses. Use `bridgeMode: 'real'` to fail visibly when Hermes cannot run. Auto mode should not silently substitute mock data.

Real mode calls:

```text
GET  <hermesApiBaseUrl>/health
POST <hermesApiBaseUrl>/v1/runs
GET  <hermesApiBaseUrl>/v1/runs/{run_id}/events
```

In browser/Vite mode, these calls use `fetch()` and therefore require the Hermes API server to allow the dev origin with CORS. In native Tauri mode, Hermes Guild uses a Rust `hermes_api_request` command for these HTTP calls, so local Hermes API access is not blocked by WebView-origin CORS.

Hermes `run.completed` output becomes the Quest Report Card summary. API errors and failed run events are surfaced on the pet, task detail timeline, and system strip.

On Ubuntu 24.04, the missing native prerequisites reported by `tauri info` are Rust/Cargo, WebKitGTK 4.1, and rsvg2. A typical setup path is:

```bash
sudo apt-get update
sudo apt-get install -y cargo rustc pkg-config libwebkit2gtk-4.1-dev librsvg2-dev
```

Use `docs/NATIVE_VERIFICATION.md` for the native pass/fail checklist after those prerequisites are installed.

## What Works

- One active Pet Mode profile.
- Reusable Pixel UI Kit layer for the main Guild Hall surface: pixel app window, asset-framed panels, buttons, inputs, badges, avatar, quest card, log list, review card, truth strip, and command bar.
- Low-density pixel JRPG visual treatment: one cohesive desktop app window, one focused Guild Hall active companion, one active quest, compact quest report/review panel, Quest Board entry, quest log timeline, mission-result report card, and Review Chamber.
- 8 reviewable JRPG visual variants selectable in-app or by URL.
- In explicit test/dev mock harnesses, profile switcher for mock profiles Lyra / Researcher, Brass / Builder, and Sable / Reviewer.
- In real mode, profile switcher for Hermes-mapped Guild roles: Hermes Researcher, Hermes Builder, and Hermes Reviewer.
- Pet task input creates a quest through the selected bridge and assigns it to the active profile.
- Guild Hall shows one active companion, one active quest, a compact returned-report panel with approve/revise actions, recent quest log highlights, visible integration truth, and a bottom command input.
- The empty active quest state includes suggested prompt chips that fill the command input without creating a task until Send is pressed.
- Character cards show role/class, current state, current quest, traits, equipment, and a truth label that Guild roles do not imply live Hermes profile routing.
- Quest Board shows direct task creation, optional advanced brief fields, task list, detail, artifacts, blocked/error states, and quest log timeline.
- Mock lifecycle events drive thinking/running/needs-review states only in explicit test/dev harnesses.
- Review shows Quest Report Cards with artifacts, facts, assumptions, known gaps, review items, approve/revise actions, and real-vs-mock output provenance.
- Approve marks a report approved.
- Revise creates a new execution pass for the same profile.
- Mock blocked/error lifecycle methods remain in the bridge and tests; production-visible debug buttons are not shown on the default Guild Hall.
- Auto bridge mode should surface unavailable/error when native Hermes is not available.
- Real bridge mode can run Hermes API tasks when the Hermes API server is available.

## Pixel UI Review

The focused high-fidelity screen is the default Guild Hall at:

```text
/?variant=skyship-command-deck
```

The unified Quest Board screen can be opened directly for review at:

```text
/?variant=skyship-command-deck&view=board
```

The reusable Pixel UI Kit showcase is available at:

```text
/pixel-ui-showcase
```

The kit direction is documented in `docs/PIXEL_UI_KIT.md`; the asset extraction plan is documented in `docs/PIXEL_UI_KIT_ASSET_IMPLEMENTATION.md`; the one-screen fidelity pass is documented in `docs/WEB_FIDELITY_PASS.md`.

Extracted reusable assets are stored under:

```text
src/assets/pixel-ui/frames/
src/assets/pixel-ui/buttons/
src/assets/pixel-ui/inputs/
src/assets/pixel-ui/badges/
src/assets/pixel-ui/icons/
src/assets/pixel-ui/avatars/
src/assets/pixel-ui/mascots/
src/assets/pixel-ui/textures/
```

Generated source sheets and design reference boards are not committed to the production repo. Keep extracted, transparent, reusable UI assets here; avoid checking in prompt reference boards, screenshot sheets, `.DS_Store`, or unused cropped fragments.

`src/styles/pixel-assets.css` applies the extracted assets with CSS `border-image` / `border-image-slice` for resizable panel, button, input, and badge chrome, plus `image-rendering: pixelated` for pixel assets.

Guild Hall and Quest Board now share the same production-style desktop window, app header, compact bridge status, pixel panels, status strip, and command/control treatment. Debug-style controls such as the old `Hall / Board / Review / Error / Block` tab row and the large Pet Mode side panel are not part of the first screen.

The production screens intentionally avoid using noisy source-sheet labels or embedded UI text from cropped assets. Extracted assets provide reusable chrome, icons, avatars, badges, and controls; readable app text is rendered by React/CSS. Navigation strips and section headers use clean CSS pixel rules where cropped source assets would expose ghost labels or visual noise.

Standalone icon, avatar, and mascot PNGs are cleaned as transparent RGBA assets so they can render on both navy and parchment surfaces. The cleanup helper is `scripts/cleanup-pixel-assets.py`; it flood-fills edge backgrounds, trims alpha bounds, and removes small source-sheet label fragments while keeping stable filenames.

Avatar rendering uses a shared `PixelAvatarFrame` / `PixelAvatar` safe area: fixed frame, centered transparent sprite, contained background sizing, hidden overflow, and pixelated rendering. This keeps the existing character identity while aligning idle/running/needs-review/error states in the same frame.

## What Is Mocked

- Hermes runtime execution in `mock` mode and in `auto` mode fallback.
- Agent availability and lifecycle events.
- Blocked/error lifecycle states.
- Report card generation in `mock` mode.
- Artifact records in `mock` mode.
- Gateway/provider error events in `mock` mode.
- Pet position persistence.

## What Is Real

- Real mode invokes Hermes through the local Hermes API server.
- Guild agent ids remain Guild-owned role assignments. They are not sent as Hermes profile parameters because `/v1/runs` does not expose a profile field.
- Pet and Quest Board submissions call the selected bridge's task submission path.
- Hermes run output and selected SSE events are converted into task timeline entries and a Quest Report Card.
- Hermes API failures are surfaced as task, pet, timeline, and system errors.

The real bridge is intentionally minimal: no Hermes WebUI parity, skill management, memory UI, gateway UI, workspace browser, Tavern, Infirmary, or multi-agent orchestration.

## JRPG Variant Preview

The default UI opens on `04 · Skyship Command Deck`, now used as the low-density desktop-native pixel JRPG companion workbench direction. To keep the default screen focused, preview the older variant set by direct URL:

| # | Variant | How to view |
| --- | --- | --- |
| 01 | Royal Guild Hall | `/?variant=royal-guild-hall` |
| 02 | Magitech Workshop | `/?variant=magitech-workshop` |
| 03 | Moon Crystal Sanctuary | `/?variant=moon-crystal-sanctuary` |
| 04 | Skyship Command Deck | `/?variant=skyship-command-deck` |
| 05 | Arcane Archive Library | `/?variant=arcane-archive-library` |
| 06 | Mercenary Camp | `/?variant=mercenary-camp` |
| 07 | Dungeon Strategy Terminal | `/?variant=dungeon-strategy-terminal` |
| 08 | Cozy Inn Guild | `/?variant=cozy-inn-guild` |

Pet-only review also supports variants, for example:

```text
/?mode=pet&variant=cozy-inn-guild
```

The low-density direction is documented in `docs/LOW_DENSITY_PIXEL_JRPG_UI.md`. It intentionally favors one active companion, one active quest, one compact review/result surface, and a small integration truth block over the earlier dense concept-board/HUD layout.
