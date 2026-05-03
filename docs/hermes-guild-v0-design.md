# Hermes Guild v0 Design

## Summary

Hermes Guild is a desktop-native RPG workbench for AI agents. The product turns Hermes into a set of playable, assignable, reviewable coworkers: selectable desktop pets for quick interaction and a guild hall for serious multi-agent work management.

One-sentence positioning:

> Hermes Guild is a native desktop RPG-style AI Agent workbench: normally selected Hermes profile pets on the desktop, instantly a guild hall for assigning quests, checking profiles, and reviewing work.

The key rule is that the game layer must map to real Hermes capability and state. RPG is the interaction language; the v0 product value is task execution, review, and operational visibility.

## Product Shape

### Pet Mode

Pet Mode is a set of small persistent desktop companions. Users choose which Hermes profiles appear on the desktop, and each visible pet maps to one profile with its own status and task state.

Core capabilities:

- Floating transparent windows for selected Hermes profiles.
- Drag-to-position behavior.
- Click a pet to talk to that profile by default.
- Shortcut to open input for the active or most recent pet.
- Optional push-to-talk later.
- Open Guild Hall from the pet.
- Show each profile's real Hermes state through animation.
- Return with a task report card when work is ready.

Pet states should map to real events:

| Pet state | Meaning |
| --- | --- |
| Idle | No active task, ready for input |
| Available | Profile can claim queued work |
| Thinking | Planning, reading context, or waiting on model response |
| Queued | A relevant task is waiting for pickup |
| Executing | Task is running |
| Waiting | Needs user input or review |
| Error | Gateway, provider, tool, or task failure |
| Complete | Deliverable is ready for review |

Pinned desktop profiles should be managed from Agents / Characters. v0 should support multiple pinned profile pets, while the default sample roster remains 3 profiles.

### Guild Hall Mode

Guild Hall is the focused operational dashboard. It should feel like an RPG guild without sacrificing dashboard efficiency.

v0 pages:

- **Guild Hall / Home**: online agents, active tasks, queued tasks, and pending reviews.
- **Agents / Characters**: 3 Hermes profiles as RPG badges with simple stats, role, status, basic skills, current task, and desktop pinning.
- **Quest Board**: task intake and task list with brief, goals, non-goals, assignment mode, queue state, progress, artifacts, and timeline.
- **Review**: completed work waiting for approve or revise.

Post-v0 pages:

- **Tavern / Handoff**: handoff cards that preserve what was done, what was not done, pitfalls, recommended next owner, and next prompt.
- **Skill Deck**: browse, enable, and later upgrade Hermes skills.
- **Infirmary**: diagnostics for gateway, provider, logs, failures, and system health.
- **Archive / Library**: project memory, docs, decision logs, templates, and historical tasks.

## RPG System Mapping

The interface should use RPG concepts only when they represent useful Hermes data.

| RPG concept | Hermes concept |
| --- | --- |
| Character / badge | Profile / Agent |
| Class | Agent role, such as Researcher, Reviewer, Ops, Writer, Doctor |
| Skill card | Hermes skill |
| Stats | Real ability dimensions and performance signals |
| Equipment | Model, tool permissions, data sources, workspace |
| Quest | User task |
| Raid | Long-running or multi-agent task |
| Battle log | Task timeline / execution trace |
| XP | Completed tasks, success rate, adopted outputs, user ratings |
| HP / condition | System health, load, availability |
| Energy | Context budget, attention, queue load |
| Tavern | Handoff area |
| Infirmary | Logs, diagnostics, provider/gateway health |
| Archive / Library | Memory, docs, decision log, historical tasks |
| Quest Board | Task intake and tracking |

### Stats

Use semi-game, semi-real stats:

- Planning
- Execution
- Research
- Judgement
- Reliability
- Speed
- Context Discipline
- Communication

Long-term stat sources:

- Profile preset.
- Task history.
- User ratings.
- Task success rate.
- Rework rate.
- Drift or blockage frequency.
- Accepted outputs.

For v0, use simple profile preset stats only and clearly mark them as configured signals. Do not derive historical performance stats until enough real task data exists.

## MVP Scope

v0 should prove one complete chain:

> A user can hand a task to a Hermes profile from a desktop pet, then watch it execute in Guild Hall, inspect the task lifecycle, and approve or revise the returned report card.

The v0 target is intentionally narrower than the full product vision:

> Pet entry -> profile assignment -> quest execution -> timeline visibility -> report card review.

Features that do not prove this loop should be optional or deferred.

### Included In v0

- Tauri desktop app.
- 1-3 desktop pet windows for user-selected Hermes profiles.
- Text task input.
- Shortcut or pet action to open Guild Hall.
- Profile pin/unpin controls from Agents / Characters.
- Pet conversation routed to the clicked profile by default.
- Basic live state display for idle, available, thinking, queued, executing, waiting, error, and complete.
- 3 configurable Hermes agent profiles.
- Agent cards with role, simple stats, basic skills, current status, and current task.
- Quest Board with create task, task list, task detail, and direct assignment.
- Task detail with brief, assignee/claimer, lifecycle state, progress notes, artifacts, errors, and timeline.
- Task states: created, running, blocked, completed, error, and review.
- Report card generation for completed tasks.
- Review panel with completed deliverables, facts, assumptions, known gaps, approve, and revise.
- Error visibility shared by the pet and task detail.

### Optional In v0

- Unassigned Quest Board queue.
- Simple auto-claim using the smallest possible availability and role rule.
- Global shortcut.
- Artifact preview.
- Desktop notification.
- Basic system health summary.

### Excluded From v0

- Full party or raid orchestration.
- Real XP/level progression beyond simple displayed signals.
- Complex skill cooldowns or upgrades.
- Advanced assignment policy tuning.
- Multi-profile group pet routing.
- Pet group chat.
- Complex desktop pet layout management.
- Dedicated Tavern page.
- Full handoff workflow.
- Skill Deck page.
- Loot/reward systems.
- Historical performance-derived stats.
- Rich archive search.
- Full infirmary workflow; v0 only needs enough error visibility to support task failures.
- Voice input.
- Complex pet animation system.
- Godot or full game-engine implementation.

## Hermes Integration Reality

Before implementation, v0 should identify which states are real Hermes signals, which are Guild-maintained product state, and which are Guild-generated summaries. This protects the core principle that the RPG layer maps to real work.

| UI need | v0 source expectation |
| --- | --- |
| Profile list | Hermes-provided if available; otherwise configured through the bridge |
| Selected profile | Guild-maintained pinned/profile selection state |
| Task running state | Hermes-provided or wrapped by the bridge |
| Progress events | Hermes event if available; otherwise normalized from execution logs |
| Artifacts | Hermes output path or agreed workspace artifact directory |
| Error state | Hermes/tool/provider error if available; otherwise log-derived |
| Skill triggered | Hermes signal if available; otherwise omit from v0 UI |
| Review summary | Guild-generated from task output, logs, and explicit agent return format |
| Profile availability | Hermes session state if available; otherwise coarse bridge-derived busy/idle status |

### Data Boundaries

Guild-maintained state:

- Pinned profiles.
- Desktop pet position.
- Task title, brief, goals, and non-goals.
- Assignment mode.
- Review status.
- Approve and revise actions.
- User-facing timeline records.

Hermes-provided or bridge-derived state:

- Profile identity.
- Active session.
- Execution logs.
- Model, tool, and permission errors.
- Artifact output path.
- Task completion signal.
- Profile availability, even if v0 starts with a coarse busy/idle signal.

Guild-generated state:

- Report card.
- Facts, assumptions, and known gaps.
- RPG stats display.
- Quest summary.
- Timeline normalization.

## Technical Architecture

Use **Tauri 2 + React** for v0.

Recommended layers:

- **Tauri shell**: native windows, transparent pet windows, always-on-top behavior, tray, global shortcut, local filesystem access, notifications, and optional sidecar.
- **React app**: Guild Hall dashboard, profile selection, task workflows, review, and state views.
- **Animation layer**: PixiJS, Rive, Lottie, or similar for pet and character animations; Framer Motion for UI transitions.
- **Hermes Bridge / Adapter**: normalizes Hermes internals into frontend game objects and events.
- **Event stream**: WebSocket or SSE for real-time updates shared by Pet Mode and Guild Hall.

The UI should not depend directly on raw Hermes internals. The bridge should expose stable game-readable objects.

### Frontend Objects

`Agent`

- `id`
- `name`
- `class` or `role`
- `status`
- `availability`
- `pinnedToDesktop`
- `desktopPosition`
- `currentTask`
- `skills`
- `stats`
- `health`
- `equipment`
- `lastReport`

`Task`

- `id`
- `title`
- `assignee`
- `assignmentMode`
- `preferredProfile`
- `preferredRole`
- `claimedBy`
- `type`
- `state`
- `progress`
- `artifacts`
- `timeline`
- `reviewStatus`

`Skill`

- `id`
- `name`
- `rarity` or `category`
- `description`
- `trigger`
- `cooldown` or usage signal
- `enabled`

`SystemStatus`

- `gatewayStatus`
- `providerHealth`
- `logsSummary`
- `warnings`

### Events

The bridge should emit events that both the pet and Guild Hall can consume:

- `profile_pinned`
- `profile_unpinned`
- `agent_available`
- `task_queued`
- `task_claimed`
- `task_started`
- `task_progress`
- `task_blocked`
- `task_completed`
- `review_required`
- `gateway_error`
- `skill_triggered`
- `agent_idle`

Each event should include enough task and agent identifiers for the UI to update without guessing.

### Assignment Rules

Quest Board tasks can be submitted in three modes:

- **Direct assignment**: user chooses a specific profile; the task waits for that profile if it is busy.
- **Preferred assignment**: user chooses a preferred profile or role; another matching available profile may claim it if the preferred one is busy.
- **Unassigned queue**: user posts the quest to the board; the first available suitable profile claims it.

For v0, direct assignment is required. Preferred assignment and unassigned queue are optional. Auto-claim should not become a scheduling project in v0.

If simple auto-claim is included, default behavior is:

- Prefer available profiles matching the requested profile, role, or skills.
- If multiple profiles match, choose the least-loaded available profile.
- If no profile matches or all matches are busy, keep the task queued and visibly waiting.
- When a profile claims a task, emit `task_claimed` and add the claim to the task timeline.

## Interaction Requirements

### Quest Creation

The user can create a quest from Pet Mode or Quest Board. A quest created by talking to a pet is assigned to that profile by default. A quest created on the Quest Board can be directly assigned, preferred for a profile/role, or left unassigned for auto-pickup.

The task should capture:

- Brief.
- Goals.
- Non-goals.
- Attachments or context references when available.
- Preferred assignee or role, if specified.
- Assignment mode.
- Claiming profile, once claimed.

### Task Timeline

Every task should show a readable execution trace:

- Created.
- Queued, if not immediately assigned.
- Claimed, if picked up automatically.
- Assigned.
- Started.
- Progress updates.
- Blockers.
- Artifacts produced.
- Completion.
- Review action.

### Review

Completed work must enter review instead of disappearing into notifications.

Review cards should separate:

- What the agent claims it completed.
- Artifacts.
- Facts.
- Assumptions.
- Known gaps.
- Recommended next action.

Available actions:

- Approve.
- Revise with instructions.

## Visual Direction

The visual style should be a workbench with RPG identity, not a marketing site or decorative fantasy dashboard.

Guidelines:

- Use dense, scannable dashboard surfaces.
- Keep task controls obvious and efficient.
- Use RPG concepts in names, cards, icons, animations, and state language.
- Avoid fake maps or long navigational ceremony.
- Pet animations should communicate real state.
- Completed tasks should feel like returned quest reports, not generic notifications.
- Multiple visible pets should remain compact and movable so the desktop does not become cluttered.

## Core Demo Script

1. User launches Hermes Guild.
2. Desktop shows 3 profile pets: Researcher, Builder, and Reviewer.
3. User clicks Builder and enters: "Help me prepare a newbro demo brief."
4. Builder pet enters Thinking, then Executing.
5. Guild Hall shows the quest on the Quest Board.
6. User opens Task Detail and sees timeline and progress.
7. Task completes and Builder returns with a report card.
8. Review shows the deliverable, artifacts, facts, assumptions, known gaps, and suggested next action.
9. User clicks Revise and asks: "Make it shorter for a 5 minute demo."
10. The task re-enters execution.
11. The updated report returns and the user approves it.

## Roadmap

### v0

- Pet Mode.
- Profile desktop pinning.
- Guild Hall / Home.
- Agents / Characters.
- Quest Board.
- Task Detail / Timeline.
- Review panel.

### v0.5

- Simple automatic Quest Board pickup by available profiles.
- Tavern / Handoff.
- Skill Deck.
- Infirmary page with richer diagnostics.
- Party quests with leader, support, and reviewer roles.
- XP and level tied to real performance data.
- Loot-style rewards such as summary scroll, code artifact, decision card, and handoff card.
- More atmospheric Tavern.

### Later

- Archive / Library.
- Better memory and decision-log search.
- Voice input.
- Richer character animation.
- Multi-agent raid orchestration.

## Acceptance Criteria

v0 is successful when:

- A user can start a task from the desktop pet.
- A user can select which Hermes profiles appear as desktop pets.
- A desktop pet routes conversation to its mapped profile.
- Pet Mode reflects the task lifecycle using real status.
- Guild Hall shows the same task and agent state.
- Quest Board supports task creation and task detail inspection.
- Task timeline records created, assigned, started, progress, artifact, error, completion, and review events.
- Completed work appears in Review.
- Completed work produces a report card with artifacts, facts, assumptions, known gaps, and recommended next action.
- Review supports approve and revise.
- Errors surface on the pet and task detail rather than only generic failures.
- The RPG layer makes the workflow clearer or more engaging without hiding operational truth.
