# Hermes Guild v0 References

This file is the reference brief for implementation agents. Do not treat these references as product shapes to copy.

Hermes WebUI shows how to expose Hermes in a browser. WindowPet shows how to make a desktop pet. Tauri shows how to ship native desktop windows. Hermes Guild must combine these lessons, but copy none of their product shapes.

The product shape is:

```text
desktop pet as task entry + guild hall as quest/review workbench
```

Before implementation, read these references enough to reconcile them with `docs/DESIGN.md`, but keep reference analysis time-boxed. Notes should be short, action-oriented, and only capture implementation decisions or unknowns that affect the first vertical slice. Do not spend more than one implementation pass on reference analysis before starting the Tauri pet shell spike. Do not spend the Goal session completing all optional reference notes before implementation; reference notes should unblock implementation, not replace it.

## 0. Primary Product Spec

**Reference:** [`docs/DESIGN.md`](./DESIGN.md)

This is the source of truth.

The implementation must preserve the v0 loop:

```text
Pet entry -> profile assignment -> quest execution -> timeline visibility -> report card review
```

The RPG layer must map to real Hermes state and capability. Do not create fake game mechanics that hide operational truth. The design doc defines Pet Mode, Guild Hall Mode, RPG mapping, v0 scope, Hermes integration boundaries, task timeline, review flow, and acceptance criteria.

Use it for:

- Product scope.
- UX loop.
- Data model intent.
- Acceptance criteria.
- What belongs in v0 vs v0.5.

Do not use it as permission to build every page immediately.

The v0 implementation should prioritize:

```text
one active pet
direct assignment
real Hermes bridge for normal runtime
mock bridge only for tests and explicit development harnesses
Quest Board
Task Timeline
Review / Quest Report Card
```

## 1. Hermes Agent Official Repo

**Reference:** <https://github.com/NousResearch/hermes-agent>

Hermes Agent is the runtime Hermes Guild is building around. Its repo and docs are the most important technical reference for what the frontend should eventually connect to.

Hermes exposes concepts relevant to Hermes Guild, including:

- CLI entry point.
- Messaging gateway.
- Tools and toolsets.
- Skills system.
- Memory and user profiles.
- MCP integration.
- Cron scheduling.
- Context files.
- Architecture and CLI reference.

The README lists `hermes` for the interactive CLI, `hermes gateway` for the messaging gateway, `hermes doctor` for diagnostics, and shared commands such as `/new`, `/model`, `/skills`, `/stop`, `/platforms`, and `/status`.

### What to study

Study Hermes for:

1. **Profile / agent identity**
   - How Hermes represents profile, personality, session, and workspace.
   - Which fields can be safely surfaced as a Guild Character.

2. **Task execution signals**
   - How to detect running, stopped, failed, completed, or blocked work.
   - Whether progress can be read from logs, events, sessions, or CLI state.

3. **Skills**
   - How skills are listed, invoked, enabled, or inspected.
   - v0 should display basic skill cards only if data is easy to obtain.

4. **Gateway and doctor**
   - Use `hermes gateway` and `hermes doctor` as future references for Infirmary.
   - v0 only needs enough error visibility to show pet/task failure.

5. **Session and context**
   - Learn how Hermes stores sessions and context so the bridge can later map them into Guild tasks.

### What not to copy

Do not simply wrap the Hermes CLI in a prettier terminal.

Hermes Guild is not a CLI clone. It is a task/quest workbench where Hermes profiles become assignable agents with reviewable outputs.

### Required v0 output after reading

Create or update:

```text
docs/HERMES_NOTES.md
```

Template:

```md
# Hermes Runtime Notes

## Concepts we can map to Guild
- Profile:
- Session:
- Skill:
- Gateway:
- Doctor:
- Workspace:
- Context:

## Signals available now
- Running:
- Completed:
- Error:
- Stopped:
- Skills:
- Artifacts:

## Unknowns / Need spike
- ...
```

## 2. Hermes WebUI

**Reference:** <https://github.com/nesquena/hermes-webui>

Hermes WebUI is the most relevant existing Hermes UI reference. It is useful because it shows one approach for exposing existing Hermes runtime/session/workspace behavior through a browser UI without turning Hermes into a forked product.

### What to study

Study Hermes WebUI for:

1. **Hermes integration approach**
   - How it talks to existing Hermes without requiring a fork.
   - How it bridges CLI/session data into UI.

2. **Session model**
   - How sessions are listed, imported, persisted, and resumed.
   - Which parts could map Hermes sessions into Guild quests.

3. **Workspace browser**
   - How it previews files and detects Git state.
   - Useful later for Artifacts, but not required for v0.

4. **Profile/model/workspace controls**
   - How it makes Hermes runtime controls accessible without hiding them.

5. **Security and deployment**
   - Understand its local/remote boundary before reusing anything.

### What not to copy

Do not copy its layout.

Hermes WebUI is a chat/session/workspace UI. Hermes Guild is a desktop-native RPG workbench with pet entry, quest lifecycle, and review.

Do not make Hermes Guild into:

```text
left sessions
center chat
right files
```

That would lose the product differentiation.

### What to borrow

Borrow integration lessons:

```text
existing Hermes runtime
session bridge
workspace awareness
profile/model controls
no fork requirement
```

### Required v0 output after reading

Create or update:

```text
docs/HERMES_WEBUI_ANALYSIS.md
```

Template:

```md
# Hermes WebUI Analysis

## Useful integration patterns
- ...

## Useful data sources
- ...

## Session bridge notes
- ...

## Workspace/file browser notes
- ...

## What Hermes Guild must not copy
- ...

## Possible reuse / adapter ideas
- ...
```

## 3. Tauri v2 Desktop Shell

**References:**

- <https://v2.tauri.app/learn/window-customization/>
- <https://v2.tauri.app/reference/javascript/api/namespacewindow/>
- <https://v2.tauri.app/learn/system-tray/>

Tauri is the recommended native shell for v0.

Tauri's window customization docs cover custom titlebars, transparent windows, size constraints, and changing window configuration through `tauri.conf.json`, JavaScript APIs, or Rust window APIs. The Tauri v2 Window API includes methods such as `setAlwaysOnTop`, `setDecorations`, `setSize`, `setPosition`, and `setIgnoreCursorEvents`, which are relevant to a floating desktop pet.

### What to study

Study Tauri for:

1. **Transparent pet window**
   - Transparent background.
   - No decoration.
   - Always on top.
   - Small size.
   - Position persistence.

2. **Dashboard window**
   - Normal decorated or custom dashboard window.
   - Open from pet.
   - Focus/restore behavior.

3. **System tray**
   - App runs in background.
   - Open Guild Hall.
   - Quit.
   - Switch active profile later.

4. **Global shortcut**
   - Optional v0.
   - Can open pet input or Guild Hall.

5. **Filesystem access**
   - Local config, mock data, task logs, and later Hermes workspace/artifacts.

### What to spike first

Before building product UI, implement a technical spike:

```text
SP001 — Tauri pet shell spike
- transparent always-on-top pet window
- draggable pet area
- no OS window border
- dashboard window opens from pet
- tray icon can show/hide dashboard
- pet position persists across restart
```

### Known caution

Transparent desktop windows and click-through behavior can be platform-sensitive. Do not assume macOS, Windows, and Linux behave the same. The first implementation task must verify this on target platforms before building complex pet behavior.

### Required v0 output after reading

Create:

```text
docs/TAURI_SPIKE_PLAN.md
```

Template:

```md
# Tauri Spike Plan

## Window requirements
- Pet window:
- Guild Hall window:
- Tray:
- Shortcut:

## Platform risks
- macOS:
- Windows:
- Linux:

## Spike tasks
- SP001:
- SP002:
- SP003:

## Done when
- ...
```

## 4. Desktop Pet / Overlay References

**Reference:** <https://github.com/SeakMengs/WindowPet>

WindowPet is a Tauri + React pet overlay app available for Windows, macOS, and Linux. Its README lists mechanics such as adding pets, custom pets, dragging pets, click-through pets, auto-start, auto-update, multiple pets, taskbar behavior, settings, and animation state selection.

This is a useful reference for desktop pet mechanics.

### What to study

Study it for:

- Floating pet window.
- Pet dragging.
- Click-through behavior.
- Multiple pet support.
- Animation state switching.
- Settings window.
- Cross-platform desktop overlay gotchas.

### What not to copy

Do not copy the product goal.

Hermes Guild's pet is not a decorative companion. It is a task entry point and status surface for a real Hermes profile.

Pet state must map to real task states:

```text
Idle
Thinking
Running
Needs Review
Error
```

Do not add random pet behaviors unless they communicate work state.

### Optional output after reading

Create:

```text
docs/PET_REFERENCES.md
```

Template:

```md
# Desktop Pet Reference Notes

## Useful mechanics
- transparent window:
- drag:
- click-through:
- animation states:
- multi-pet:

## Risks for Hermes Guild
- ...

## v0 pet design decision
- one active pet:
- profile switcher:
- task input:
- state animations:
```

## 5. Agent Workbench / Mission Control References

Use these as conceptual references, not UI references.

Suggested references:

- GitHub Agent HQ / agent mission-control style products.
- Mission Control-style agent task dashboards.
- OpenClaw/OpenAkita-style agent systems if needed.

### What to study

Study these for:

- How multiple agents are represented.
- How running tasks are surfaced.
- How agent state/progress is shown.
- How humans interrupt, revise, or approve.
- How task handoff is represented.

### What not to copy

Do not copy enterprise dashboard style.

Hermes Guild should feel like:

```text
RPG workbench
guild hall
quest board
report card review
```

not:

```text
generic SaaS admin console
agent table
chat sidebar
linear clone
```

### Optional output after reading

Create:

```text
docs/AGENT_WORKBENCH_REFERENCES.md
```

Template:

```md
# Agent Workbench References

## Patterns worth borrowing
- ...

## Patterns to avoid
- ...

## How Hermes Guild differs
- Pet entry:
- Quest lifecycle:
- Review chamber:
- RPG mapping:
```

## Required Pre-Implementation Docs

Before product UI coding, only these files are mandatory:

```text
docs/TAURI_SPIKE_PLAN.md
docs/API_CONTRACT.md
docs/PRD.md
docs/TASKS.md
docs/EXECUTION_LOG.md
```

Before real Hermes integration, create or update:

```text
docs/HERMES_NOTES.md
docs/HERMES_WEBUI_ANALYSIS.md
```

Other reference notes, including `docs/PET_REFERENCES.md` and `docs/AGENT_WORKBENCH_REFERENCES.md`, are optional. Create them only when they unblock a concrete implementation choice.

`docs/API_CONTRACT.md` should define the first Hermes Bridge interface before UI components depend on runtime details.

`docs/PRD.md` should keep the stable product goal, v0 scope, and acceptance criteria short enough for long-horizon Goal execution.

`docs/TASKS.md` should be the Codex Goal milestone plan. Use checkboxes and keep each task small enough to finish, validate, and log while still allowing continuous milestone execution.

`docs/EXECUTION_LOG.md` should record status checkpoints and important scope decisions, especially anything deferred to v0.5.

## Reference Priority

First priority:

1. `docs/DESIGN.md`
2. <https://github.com/NousResearch/hermes-agent>
3. <https://github.com/nesquena/hermes-webui>
4. <https://v2.tauri.app/learn/window-customization/>
5. <https://v2.tauri.app/reference/javascript/api/namespacewindow/>

Second priority:

1. <https://github.com/SeakMengs/WindowPet>
2. <https://v2.tauri.app/learn/system-tray/>
3. Agent workbench / mission-control references.

Third priority:

1. OpenClaw/OpenAkita-style agent systems.

Only study third-priority references for agent operating models. Do not use them to expand v0 scope.
