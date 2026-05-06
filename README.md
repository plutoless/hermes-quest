# Hermes Companion

Hermes Companion is a desktop-native companion app for Hermes. It gives the user lightweight desktop companions that can stay visible while they work, open quick chat, and route messages through either a local mock provider or the Hermes bridge.

The current product is the desktop companion surface: companion windows, companion picker, appearance controls, settings, and chat.

## Run

Install dependencies:

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

Run tests:

```bash
bun run test
```

Check the Tauri config shape:

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

Run the native Tauri app after Rust/Cargo and Tauri prerequisites are installed:

```bash
bun run tauri:dev
```

## What Works

- Transparent, frameless, always-on-top companion windows.
- A default Hermes companion with bundled sprite frames from `portrait/v2-transparent/`.
- Companion management through the Companions panel.
- Appearance controls for name, visibility, scale, animation, and source selection.
- Settings controls for dragging, speech bubbles, click-through behavior, and bridge mode.
- Quick chat from the desktop companion.
- Browser fallback windows for companion, appearance, companions, and settings panels when Tauri is unavailable.
- Native Tauri panel windows for companion, appearance, companions, and settings.
- `mock`, `real`, and `auto` bridge modes for chat provider selection.
- Local and Managed Hermes connection targets for real Hermes API calls.

## Bridge Modes

Hermes Companion has three bridge modes:

- `mock`: uses local companion responses.
- `real`: requires the Hermes bridge and fails visibly if Hermes is unavailable.
- `auto`: uses Hermes when available and otherwise uses local mock behavior.

Mock output is acceptable for local development and explicit test harnesses. Real mode should not silently substitute mock output when Hermes is unavailable.

Real mode currently calls the local Hermes API through the bridge code. In browser/Vite mode, those calls use `fetch()` and may require CORS support from the Hermes API server. In native Tauri mode, the app can use the Rust `hermes_api_request` command so local API access is not blocked by WebView-origin CORS.

## Hermes Connection Targets

Bridge mode decides provider/fallback behavior. The Hermes connection target decides where real Hermes API requests go:

- `local`: calls the local Hermes API, defaulting to `http://127.0.0.1:8642`.
- `managed`: calls a build-configured managed Hermes server and sends the saved bearer token as `Authorization: Bearer <token>`.
- `custom`: reserved in config/types for a later pass and not exposed in the Settings UI yet.

Set the managed server base URL at build time with `VITE_HERMES_MANAGED_API_BASE_URL`. Hermes Companion does not hard-code a production managed URL. If Managed is selected without that URL or without a token, the bridge reports the missing requirement before making Hermes API requests.

## Native Notes

The native app uses Tauri 2 with transparent undecorated windows. On Ubuntu 24.04, the missing native prerequisites reported by `tauri info` are typically Rust/Cargo, WebKitGTK 4.1, and rsvg2:

```bash
sudo apt-get update
sudo apt-get install -y cargo rustc pkg-config libwebkit2gtk-4.1-dev librsvg2-dev
```

Use `docs/NATIVE_VERIFICATION.md` for the native pass/fail checklist.
