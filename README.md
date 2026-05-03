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

On Ubuntu 24.04, the missing native prerequisites reported by `tauri info` are Rust/Cargo, WebKitGTK 4.1, and rsvg2. A typical setup path is:

```bash
sudo apt-get update
sudo apt-get install -y cargo rustc pkg-config libwebkit2gtk-4.1-dev librsvg2-dev
```

Use `docs/NATIVE_VERIFICATION.md` for the native pass/fail checklist after those prerequisites are installed.

## What Works

- One active Pet Mode profile.
- Profile switcher for Lyra / Researcher, Brass / Builder, and Sable / Reviewer.
- Pet task input creates a quest assigned to the active profile.
- Guild Hall shows active profile, active quest, pending reviews, and character cards.
- Quest Board shows direct task creation, optional advanced brief fields, task list, detail, artifacts, blocked/error states, and timeline.
- Mock lifecycle events drive thinking/running/needs-review states.
- Review shows Quest Report Cards with artifacts, facts, assumptions, known gaps, and review items.
- Approve marks a report approved.
- Revise creates a new mock execution pass for the same profile.
- Block button emits a visible mock blocked state.
- Error button emits a visible mock gateway error.

## What Is Mocked

- Hermes runtime execution.
- Agent availability and lifecycle events.
- Blocked/error lifecycle states.
- Report card generation.
- Artifact records.
- Gateway/provider error events.
- Pet position persistence.

The Tauri window configuration is scaffolded for a normal Guild Hall window and a transparent always-on-top pet window, but native behavior still needs verification in a Rust/Tauri-capable environment.
