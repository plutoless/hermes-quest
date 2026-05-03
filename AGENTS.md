# Hermes Guild Agent Instructions

## Product Direction

Hermes Guild is a desktop-native RPG workbench for AI agents. It is not a generic admin dashboard with fantasy styling. The product should make Hermes agents feel playable, assignable, reviewable, and maintainable while preserving serious work workflows.

The core framing is:

- **Pet Mode**: user-selected desktop companions for profile-specific communication, task status, and return reports.
- **Guild Hall Mode**: a focused dashboard for managing profiles, quests, task details, and review.

Use the working product name **Hermes Guild** unless the user chooses otherwise.

## Non-Negotiable Principles

- RPG concepts must map to real Hermes state or behavior. Avoid fake stats, decorative levels, or card UI that does not represent useful data.
- The game layer is an interaction model, not just a skin. In v0, it should make task assignment, progress tracking, and review easier.
- Workflows stay efficient and serious. Do not add map traversal, cutscenes, or heavy game ceremony that slows down work.
- Pet Mode must be high-frequency useful: selected profile pets, quick input, status feedback, progress report, open Guild Hall, and task return cards.
- Review is a first-class workflow. Hermes saying "done" is not enough; users need approve, revise, and traceability.
- Handoff/Tavern is part of the broader product identity, but it must not be built before the core task/review loop works.

## RPG To Hermes Mapping

Use this mapping consistently across product, UI, and implementation:

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

## Real Stats

Prefer semi-game, semi-real attributes:

- Planning
- Execution
- Research
- Judgement
- Reliability
- Speed
- Context Discipline
- Communication

For v0, stats should come from simple profile presets and be marked as configured signals. Later versions can derive stats from task history, user ratings, success rate, rework rate, and drift/blockage signals.

## Recommended Stack

For v0, prefer:

- Tauri 2 for the native desktop shell, transparent windows, tray, always-on-top behavior, global shortcuts, local filesystem access, sidecars, and notifications.
- React for dashboard UI and business workflows.
- PixiJS, Rive, Lottie, or similar for character animation and 2D game-feel.
- Framer Motion for lightweight UI transitions and interaction polish.
- A Hermes Bridge / Adapter layer between the UI and Hermes internals.

Do not choose Godot for v0 unless the user explicitly redirects the product toward a more game-native implementation. Web UI speed and Hermes integration matter more for the first version.

## MVP Priority

Build v0 around one complete loop:

1. User selects which Hermes profiles appear as desktop pets.
2. User talks to a pet, which routes the message or task to that specific profile by default.
3. The message creates a quest assigned to that pet/profile.
4. Guild Hall shows the task in progress.
5. Task detail records assignment, progress, artifacts, and errors.
6. Completed work appears in Review as a report card.
7. User approves or asks for revision.

The hard v0 chain is:

> Pet entry -> profile assignment -> quest execution -> timeline visibility -> report card review.

Unassigned queue and automatic claim are optional v0 features. Do not let them delay the core task/review loop.

Initial pages:

- Guild Hall / Home
- Agents / Characters
- Quest Board
- Review

Later pages:

- Tavern / Handoff
- Skill Deck
- Infirmary
- Archive / Library

## Implementation Guardrails

- Keep v0 small: 1-3 user-selected profile pets, three profile cards, Quest Board, task detail, and review.
- Each desktop pet maps to one Hermes profile and must show that profile's real status.
- Pet-created tasks are assigned to the clicked profile by default.
- Quest Board tasks must support direct assignment. Preferred profile/role and unassigned queue are optional in v0.
- Automatic pickup, if included in v0, must use a simple rule based on availability and role/skill match. Avoid building a complex scheduler.
- Use a Hermes Bridge API that exposes game-friendly objects instead of letting UI components depend directly on low-level Hermes internals.
- Use event streams for live status. Pet Mode and Guild Hall should react to the same task and system events.
- Represent assumptions separately from facts in reviews.
- Do not add decorative features, Tavern, Skill Deck, Infirmary, XP, loot, party quests, voice, complex pet animations, or complex auto-scheduling before the task/review loop works.
- When designing UI, favor dense, readable operational surfaces with RPG accents over oversized marketing layouts.
- Desktop pet animations should correspond to actual states: idle, available, thinking, executing, queued, blocked, waiting for user, error, complete.

## Hermes Integration Reality

Before treating an RPG state as real, identify its source:

- Guild-maintained state: pinned profiles, desktop position, task brief/goals/non-goals, assignment mode, review status, approve/revise actions, and user-facing timeline records.
- Hermes-provided or bridge-derived state: profile identity, active session, execution logs, model/tool errors, artifact path, completion signal, and profile availability.
- Guild-generated state: report card, facts/assumptions/known gaps, RPG stat display, quest summary, and timeline normalization.

If Hermes does not expose a signal yet, either route it through the bridge as a clearly derived state or leave the feature out of v0. Avoid UI that appears live but is not grounded in Hermes or Guild-owned state.

## Suggested Domain Objects

Frontend-facing objects should remain stable and game-readable:

- `Agent`: id, name, class/role, status, availability, pinned desktop state, current task, skills, stats, health, equipment, last report.
- `Task`: id, title, assignee, assignment mode, preferred profile/role, claimed-by profile, type, state, progress, artifacts, timeline, review status.
- `Skill`: id, name, rarity/category, description, trigger, cooldown or usage limits, enabled state.
- `SystemStatus`: gateway status, provider health, logs summary, warnings.

Key events:

- `task_started`
- `task_queued`
- `task_claimed`
- `task_progress`
- `task_blocked`
- `task_completed`
- `review_required`
- `gateway_error`
- `skill_triggered`
- `agent_available`
- `agent_idle`
- `profile_pinned`
- `profile_unpinned`
