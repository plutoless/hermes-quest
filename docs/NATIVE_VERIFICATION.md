# Native Tauri Verification

This checklist is for the first environment where Tauri prerequisites are installed.

## Prerequisites

On Ubuntu 24.04:

```bash
sudo apt-get update
sudo apt-get install -y cargo rustc pkg-config libwebkit2gtk-4.1-dev librsvg2-dev
```

Then run:

```bash
bun install
bun run check:native
bun run verify:web
bun run tauri:dev
```

Port `1420` must be free. Vite uses `strictPort: true` so Tauri always loads the configured `devUrl`.

## Expected Windows

- `main`: normal decorated Guild Hall window.
- `pet`: compact Pet Mode window loaded from `/?mode=pet`.

## Pass Criteria

- `bun run check:native` reports all prerequisites available.
- Port `1420` is available for the Vite dev server.
- `bun run tauri:dev` launches without `cargo metadata` or WebKitGTK errors.
- The `pet` window is small, undecorated, transparent-capable, and always on top.
- The `pet` window shows only active profile, profile switcher, input, Send, and Hall controls.
- The Hall action from the pet focuses or shows the `main` window.
- Sending a pet task creates a quest assigned to the active profile.
- The `main` window shows the same quest in Guild Hall and Quest Board.
- The task timeline updates through mock lifecycle events.
- Quest Board advanced brief fields can be entered and appear in Task Detail.
- Completed work appears in Review as a Quest Report Card.
- Approve and Revise work in the native runtime.
- The Block action surfaces visible pet/task/system blocked state.
- The Error action surfaces visible pet/task/system error state.

## Known v0 Native Limits

- Pet position is bridge-mocked, not persisted through native window storage.
- Native tray and global shortcut are not implemented in v0.
- Real Hermes execution is not integrated.

## Record Results

After verification, append a checkpoint to `docs/EXECUTION_LOG.md` with:

- OS/session details.
- `bun run check:native` result.
- `bun run verify:web` result.
- `bun run tauri:dev` result.
- Which pass criteria were verified.
- Screenshots or notes for any transparent-window/platform issues.
- Any remaining native blockers.
