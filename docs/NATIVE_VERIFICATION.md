# Native Verification

Use this checklist after running the Tauri app with:

```bash
bun run tauri:dev
```

## Expected Windows

- `main`: transparent Hermes companion window.
- `pet`: companion route loaded from `/?mode=pet`.
- `appearance`: Appearance panel loaded from `/?panel=appearance`.
- `companions`: Companions panel loaded from `/?panel=companions`.
- `settings`: Settings panel loaded from `/?panel=settings`.

All windows should be frameless, transparent, always on top, and non-resizable unless the Tauri config is intentionally changed.

## Manual Checks

- The default companion appears with the bundled avatar frames.
- Dragging the companion moves it when dragging is enabled.
- Clicking the companion opens chat.
- Right-clicking the companion opens the context menu.
- Companions opens the Companions panel.
- Appearance opens the Appearance panel.
- Settings opens the Settings panel.
- Companion visibility toggles show and hide the relevant companion window.
- Appearance scale changes update the selected companion.
- Settings toggles update dragging, speech bubbles, click-through behavior, and bridge mode.
- Real mode shows an unavailable/error state if Hermes is not available.
- Auto mode clearly indicates when it is using mock output.

## Non-Goals

The native pass only verifies the current companion windows, panels, settings, and chat surface.
