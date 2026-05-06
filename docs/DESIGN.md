# Hermes Companion Design

## Summary

Hermes Companion is a desktop-native companion app for Hermes. It provides lightweight companions that sit on the desktop, show simple state, and open quick chat without making the user switch into a full dashboard.

The product value is fast desktop access to Hermes-backed assistance with honest provider state. The current product direction is companion-first: companion windows, companion management, appearance controls, settings, and chat.

Keep the design focused on the desktop companion surface.

## Product Surface

### Companion Window

The companion window is a transparent, frameless, always-on-top Tauri window. The avatar is the primary surface and should remain easy to drag, click, and recognize at small sizes.

Core behavior:

- Display the selected companion avatar.
- Support click-to-open chat.
- Support right-click access to Companions, Appearance, and Settings.
- Support dragging unless click-through or dragging settings disable it.
- Show short speech bubbles when enabled.
- Keep long assistant replies out of the tiny bubble and direct the user to chat.
- Reflect simple states such as idle, thinking, talking, hidden, and error.

### Companions Panel

The Companions panel manages visible desktop companions.

Core behavior:

- List available companions.
- Select the active companion.
- Toggle companion visibility.
- Open or hide native companion windows when running in Tauri.
- Add local companion entries using the existing default appearance and local provider defaults.

Multiple companion instances are part of the current desktop companion surface. They are independent desktop helpers.

### Appearance Panel

The Appearance panel controls how the selected companion looks and animates.

Core behavior:

- Edit the companion display name.
- Toggle visibility.
- Adjust scale.
- Choose an animation state.
- Show the active visual source.
- Keep generated/uploaded appearance paths honest when they are placeholders or not yet wired.

The bundled Hermes sprite frames are the default production-ready visual path.

### Settings Panel

The Settings panel controls runtime behavior.

Core behavior:

- Toggle dragging.
- Toggle speech bubbles.
- Toggle click-through behavior.
- Select bridge mode: `mock`, `real`, or `auto`.
- Select the Hermes connection target: Local or Managed.
- Save or clear the Managed bearer token when Managed is selected.
- Show provider/bridge status in clear language.

Real mode must fail visibly when Hermes is unavailable. Auto mode may fall back to mock behavior, but the UI must say that it is using local mock output.

Bridge mode and connection target are separate. Bridge mode controls whether the provider is mock, real, or auto fallback. Connection target controls where real Hermes API calls go:

- Local uses the local Hermes API and defaults to `http://127.0.0.1:8642`.
- Managed uses the build-configured `VITE_HERMES_MANAGED_API_BASE_URL` and the locally saved bearer token.
- Custom server is reserved in the configuration schema for later and is intentionally not exposed in the first Settings UI pass.

When Managed has no configured URL or no token, Settings and provider status should state that requirement and the bridge should not send Hermes API requests.

### Chat

Chat is the main interaction. It should be quick, direct, and available from the desktop companion.

Core behavior:

- Send user text to the selected provider.
- Use Hermes bridge output when real mode is active and available.
- Use local mock responses only when mock mode is selected or auto mode falls back.
- Show errors clearly when sending fails.
- Avoid implying that mock output came from Hermes.

## Technical Shape

Use the existing Tauri 2 + React app structure.

Important implementation boundaries:

- React owns companion state, panels, chat UI, and browser fallbacks.
- Tauri owns native windows, transparent always-on-top behavior, panel show/hide commands, and local API bridge commands.
- The bridge layer owns Hermes availability and provider calls.
- Local storage may persist companion state and bridge configuration.

The UI should depend on companion-level objects and provider status, not raw Hermes internals.

## Current Constraints

- Keep the product companion-first and compact.
- Do not add dashboard workflows, task management surfaces, or review workflows.
- Do not add scoring, progression, or historical metrics.
- Do not add automatic routing, assignment, queues, or collaboration semantics.
- Do not hide missing Hermes behind fake production data.
- Do not introduce a game engine or heavy animation framework unless the current React/Tauri path cannot support a concrete companion requirement.

## Acceptance Criteria

- The app launches in browser dev mode.
- The native Tauri config defines transparent companion and panel windows.
- A user can open chat from the companion.
- A user can manage companions from the Companions panel.
- A user can edit appearance settings from the Appearance panel.
- A user can edit runtime settings and bridge mode from the Settings panel.
- Mock, real, and auto bridge states are visible and understandable.
- Active docs describe the companion product without obsolete roadmap language.
