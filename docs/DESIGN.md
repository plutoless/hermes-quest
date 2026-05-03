# Hermes Guild v0 Design

## Summary

Hermes Guild is a desktop-native RPG workbench for AI agents. The product turns Hermes into playable, assignable, reviewable coworkers: a desktop pet for quick interaction and a guild hall for serious agent work management.

One-sentence positioning:

> Hermes Guild is a native desktop RPG-style AI Agent workbench: a profile-aware desktop pet for assigning quests, plus a guild hall for tracking progress and reviewing returned work.

The key rule is that the game layer must map to real Hermes capability and state. RPG is the interaction language; the v0 product value is task execution, review, and operational visibility.

## Product Shape

### Pet Mode

Pet Mode v0 is one small persistent desktop companion. The pet represents the current active Hermes profile, and the user can switch that active profile from the pet or Guild Hall.

Multiple simultaneous desktop pets are a v0.5 feature. v0 should not spend its complexity budget on multi-window layout, window grouping, profile routing between multiple pets, or pet group chat.

Core capabilities:

- One floating transparent desktop pet window.
- Drag-to-position behavior.
- Profile switcher for Researcher, Builder, and Reviewer.
- Click the pet to talk to the active profile by default.
- Shortcut to open input for the active pet.
- Optional push-to-talk later.
- Open Guild Hall from the pet.
- Show the active profile's real Hermes state through simple animation.
- Return with a task report card when work is ready.

Pet states should map to real events:

| Pet state | Meaning |
| --- | --- |
| Idle | No active task, ready for input |
| Thinking | Planning, reading context, or waiting on model response |
| Running | Task is executing |
| Blocked | Task needs user input or cannot proceed |
| Needs Review | Deliverable is ready for review |
| Error | Gateway, provider, tool, or task failure |

Profile switching should be lightweight. Guild Hall still shows 3 configured characters, but only one profile is active in the desktop pet at a time.

### Guild Hall Mode

Guild Hall is the focused operational dashboard. It should feel like an RPG guild without sacrificing dashboard efficiency.

v0 pages:

- **Guild Hall / Home**: active agent, active quest, pending reviews, and 3 character summary cards.
- **Quest Board**: task intake, task list, task detail, progress, artifacts, and timeline.
- **Review**: completed work waiting for approve or revise.

Agents / Characters can start as a section inside Guild Hall. A dedicated page is only needed once profile management becomes complex.

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
| Traits | Configured role strengths, constraints, and later performance signals |
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

### Traits

For v0, avoid presenting preset values as measured performance stats. Use **Traits** or **Role Profile** language instead of numeric stats.

Example:

```text
Researcher
Strong: Research, Context Discipline
Weak: Speed
Best for: competitive analysis, long-form synthesis
Avoid: code execution
```

Possible trait dimensions:

- Planning.
- Execution.
- Research.
- Judgement.
- Reliability.
- Speed.
- Context Discipline.
- Communication.

Long-term performance signal sources:

- Profile preset.
- Task history.
- User ratings.
- Task success rate.
- Rework rate.
- Drift or blockage frequency.
- Accepted outputs.

For v0, use simple profile preset traits only and clearly mark them as configured signals. Do not derive historical performance stats until enough real task data exists.

## MVP Scope

v0 should prove one complete chain:

> A user clicks the desktop pet, says one task, the active Hermes profile does the work, Guild Hall shows progress, the result returns as a Quest Report Card, and the user approves or revises it.

The v0 target is intentionally narrower than the full product vision:

> Pet entry -> profile assignment -> quest execution -> timeline visibility -> report card review.

Features that do not prove this loop should be optional or deferred.

### Included In v0

- Tauri desktop app.
- One active desktop pet window.
- Profile switcher on the pet.
- Text task input from the pet.
- Shortcut or pet action to open Guild Hall.
- Pet conversation routed to the active profile by default.
- Basic live state display for idle, thinking, running, blocked, needs review, and error.
- 3 configurable Hermes agent profiles.
- Guild Hall with active agent, active quest, pending reviews, and 3 character summary cards.
- Agent cards with role, traits, basic skills, current status, and current task.
- Quest Board with create task, task list, task detail, and direct assignment.
- Task detail with brief, assignee, lifecycle state, progress notes, artifacts, errors, and timeline.
- Task states: idle, thinking, running, blocked, needs_review, error, and approved.
- Quest Report Card generation for completed tasks.
- Review panel with completed deliverables, facts, assumptions, known gaps, approve, and revise.
- Error visibility shared by the pet and task detail.

### Optional In v0

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
- Full character management page.
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
| Active profile | Guild-maintained profile selection state |
| Task running state | Hermes-provided or wrapped by the bridge |
| Progress events | Hermes event if available; otherwise normalized from execution logs |
| Artifacts | Hermes output path or agreed workspace artifact directory |
| Error state | Hermes/tool/provider error if available; otherwise log-derived |
| Skill triggered | Hermes signal if available; otherwise omit from v0 UI |
| Review summary | Guild-generated from task output, logs, and explicit agent return format |
| Profile availability | Hermes session state if available; otherwise coarse bridge-derived busy/idle status |

### Data Boundaries

Guild-maintained state:

- Active profile.
- Desktop pet position.
- Task title, brief, goals, and non-goals.
- Direct assignment.
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

- Quest Report Card.
- Facts, assumptions, and known gaps.
- Trait display.
- Quest summary.
- Timeline normalization.

## Technical Architecture

Use **Tauri 2 + React** for v0.

Recommended layers:

- **Tauri shell**: native windows, transparent pet windows, always-on-top behavior, tray, global shortcut, local filesystem access, notifications, and optional sidecar.
- **React app**: Guild Hall dashboard, profile selection, task workflows, review, and state views.
- **Animation layer**: PixiJS, Rive, Lottie, or similar for pet and character animations; Framer Motion for UI transitions.
- **Hermes Bridge / Adapter**: normalizes Hermes internals into frontend game objects and events.
- **Event stream**: start with a local bridge event emitter if Hermes integration is unstable; WebSocket or SSE can replace it when live signals are ready.

The UI should not depend directly on raw Hermes internals. The bridge should expose stable game-readable objects.

### Frontend Objects

`Agent`

- `id`
- `name`
- `class` or `role`
- `status`
- `availability`
- `activeInPet`
- `currentTask`
- `skills`
- `traits`
- `health`
- `equipment`
- `lastReport`

`Task`

- `id`
- `title`
- `assignee`
- `brief`
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

- `active_profile_changed`
- `agent_idle`
- `task_started`
- `task_progress`
- `task_blocked`
- `task_completed`
- `review_required`
- `review_approved`
- `revision_requested`
- `gateway_error`

Each event should include enough task and agent identifiers for the UI to update without guessing.

### Assignment Rules

v0 only needs direct assignment:

- Pet-created tasks are assigned to the active profile.
- Quest Board-created tasks require the user to choose a profile.
- If the profile is busy, the task can wait behind that profile's current work without exposing a full queueing system.

Preferred assignment, unassigned queue, and automatic claiming are v0.5 features.

## Interaction Requirements

### Quest Creation

The user can create a quest from Pet Mode or Quest Board. A quest created by talking to the pet is assigned to the active profile by default. A quest created on the Quest Board is directly assigned to a chosen profile.

Default input should stay light:

- Main input: "What should this agent do?"
- Advanced fields are collapsed by default.

The task should capture:

- Brief.
- Assigned profile.
- Optional goals.
- Optional non-goals.
- Optional context or attachments.
- Optional definition of done.

### Task Timeline

Every task should show a readable execution trace:

- Created.
- Assigned.
- Started.
- Progress updates.
- Blockers.
- Artifacts produced.
- Completion.
- Review action.

### Review

Completed work must enter review instead of disappearing into notifications.

The Quest Report Card is the core reward loop. It should feel like RPG quest completion while remaining grounded in real work.

Report cards should separate:

- What the agent claims it completed.
- Artifacts.
- Facts.
- Assumptions.
- Known gaps.
- Recommended next action.
- Review items such as decisions, risks, and open questions.

Example report card:

```text
Quest Completed: Prepare newbro demo brief

Reward:
- Demo Brief Scroll
- Codex Handoff Card
- 2 Confirmed Decisions
- 1 Open Question
- 1 Risk Warning

Performance:
- Clarity: A
- Completeness: B
- Needs Human Review: Yes
```

Rewards must map to real artifacts or review objects:

- Scroll = summary document.
- Handoff Card = next-agent prompt or continuation context.
- Decision = decision log item.
- Risk Warning = review item.
- Open Question = follow-up task or unresolved question.

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
- The single active pet should remain compact and movable so the desktop does not become cluttered.

## Core Demo Script

1. User launches Hermes Guild.
2. Desktop shows one active pet, currently set to Builder.
3. User opens the pet profile switcher and sees Researcher, Builder, and Reviewer.
4. User keeps Builder selected and enters: "Help me prepare a newbro demo brief."
5. Builder pet enters Thinking, then Running.
6. Guild Hall shows the active agent, active quest, and current progress.
7. User opens Quest Board task detail and sees timeline and artifacts.
8. Task completes and Builder returns with a Quest Report Card.
9. Review shows the deliverable, rewards, facts, assumptions, known gaps, and suggested next action.
10. User clicks Revise and asks: "Make it shorter for a 5 minute demo."
11. The task re-enters Running.
12. The updated report returns and the user approves it.

## Roadmap

### v0

- Pet Mode.
- One active desktop pet.
- Pet profile switcher.
- Guild Hall / Home.
- Quest Board.
- Task Detail / Timeline.
- Review panel.

### v0.5

- Multiple desktop pets.
- Profile desktop pinning.
- Simple automatic Quest Board pickup by available profiles.
- Preferred assignment.
- Dedicated Agents / Characters page.
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
- A user can switch which Hermes profile the desktop pet represents.
- A desktop pet routes conversation to the active profile.
- Pet Mode reflects the task lifecycle using real status.
- Guild Hall shows the same task and agent state.
- Quest Board supports task creation and task detail inspection.
- Task timeline records created, assigned, started, progress, artifact, error, completion, and review events.
- Completed work appears in Review.
- Completed work produces a Quest Report Card with real rewards, artifacts, facts, assumptions, known gaps, and recommended next action.
- Review supports approve and revise.
- Errors surface on the pet and task detail rather than only generic failures.
- The RPG layer makes the workflow clearer or more engaging without hiding operational truth.
