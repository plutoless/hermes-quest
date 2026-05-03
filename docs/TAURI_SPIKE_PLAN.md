# Tauri Spike Plan

## Window Requirements

- Pet window: small transparent undecorated window, always on top, draggable, one active profile only.
- Guild Hall window: normal dashboard window opened from the pet and tray.
- Tray: show Guild Hall, show/hide pet, quit.
- Shortcut: optional v0; can focus pet input or open Guild Hall if native shell setup is ready.

## Platform Risks

- macOS: transparency and always-on-top behavior need signing/notarization checks later.
- Windows: click-through and transparent hit testing can be inconsistent across GPU/drivers.
- Linux: transparency depends on compositor support; tray support varies by desktop environment.

## Spike Tasks

- SP001: configure a `pet` window with transparent background, no decorations, small dimensions, and always-on-top behavior.
- SP002: configure a `main` Guild Hall window and prove the pet can open/focus it.
- SP003: persist or mock pet position through the bridge until native filesystem persistence is verified.

## Done When

- `bun run dev` launches the React experience for development.
- `bun run tauri:dev` is documented as the native target once Rust and Tauri dependencies are installed.
- Pet Mode, Guild Hall, Quest Board, and Review consume the same bridge snapshot.
- Any unverified native behavior is recorded in `docs/EXECUTION_LOG.md` instead of treated as real.
