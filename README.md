# Hermes Guild

Hermes Guild is a desktop-native RPG workbench for AI agents. v0 proves one loop:

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
- `auto`: tries real Hermes first and falls back to mock when Hermes is unavailable.

The default mode is `auto`. The top system strip includes the bridge selector, Hermes API base URL field, and Apply button. It also shows:

- selected mode: `mock`, `real`, or `auto`
- active implementation: `mock`, `real`, or `loading`
- Hermes availability: `available`, `unavailable`, or `unchecked`
- fallback reason, only when auto mode falls back

Changing the selector writes bridge config to browser/Tauri local storage under `hermes-guild.bridge-config` and rebuilds the active bridge immediately. You can also seed the same config in dev tools:

```js
localStorage.setItem('hermes-guild.bridge-config', JSON.stringify({
  bridgeMode: 'auto',
  hermesApiBaseUrl: 'http://127.0.0.1:8642'
}))
```

Use `bridgeMode: 'mock'` to force the mock bridge. Use `bridgeMode: 'real'` to fail visibly instead of falling back when Hermes cannot run. Only `auto` mode may fall back to mock.

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
- In mock mode, profile switcher for mock profiles Lyra / Researcher, Brass / Builder, and Sable / Reviewer.
- In real mode, profile switcher for Hermes-mapped Guild roles: Hermes Researcher, Hermes Builder, and Hermes Reviewer.
- Pet task input creates a quest through the selected bridge and assigns it to the active profile.
- Guild Hall shows active profile, active quest, pending reviews, and character cards.
- Quest Board shows direct task creation, optional advanced brief fields, task list, detail, artifacts, blocked/error states, and timeline.
- Mock lifecycle events drive thinking/running/needs-review states.
- Review shows Quest Report Cards with artifacts, facts, assumptions, known gaps, and review items.
- Approve marks a report approved.
- Revise creates a new mock execution pass for the same profile.
- Block button emits a visible mock blocked state.
- Error button emits a visible mock gateway error.
- Auto bridge mode falls back to mock when native Hermes is not available.
- Real bridge mode can run Hermes API tasks when the Hermes API server is available.

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
