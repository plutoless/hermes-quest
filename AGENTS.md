# Hermes Guild Agent Instructions

## Product Direction

Hermes Guild is a desktop-native RPG workbench for AI agents. It is not a generic admin dashboard with fantasy styling. The product should make Hermes agents feel playable, assignable, reviewable, and maintainable while preserving serious work workflows.

The core framing is:

- **Pet Mode**: one active desktop companion in v0 for profile-specific communication, task status, and return reports. Multiple simultaneous pets are v0.5.
- **Guild Hall Mode**: a focused dashboard for managing profiles, quests, task details, and review.

Use the working product name **Hermes Guild** unless the user chooses otherwise.

Primary product spec: `docs/DESIGN.md`.

Implementation reference brief: `docs/REFERENCES.md`.

## Non-Negotiable Principles

- RPG concepts must map to real Hermes state or behavior. Avoid fake stats, decorative levels, or card UI that does not represent useful data.
- The game layer is an interaction model, not just a skin. In v0, it should make task assignment, progress tracking, and review easier.
- Workflows stay efficient and serious. Do not add map traversal, cutscenes, or heavy game ceremony that slows down work.
- Pet Mode must be high-frequency useful: one active profile pet in v0, quick input, status feedback, progress report, open Guild Hall, and task return cards.
- Review is a first-class workflow. Hermes saying "done" is not enough; users need approve, revise, and traceability.
- Handoff/Tavern is part of the broader product identity, but it must not be built before the core task/review loop works.

## RPG To Hermes Mapping

Use this mapping consistently across product, UI, and implementation:

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

## Traits Before Stats

For v0, do not present preset values as measured performance stats. Use **Traits**, **Affinity**, or **Role Profile** language.

Prefer semi-game, semi-real trait dimensions:

- Planning
- Execution
- Research
- Judgement
- Reliability
- Speed
- Context Discipline
- Communication

For v0, traits should come from simple profile presets and be marked as configured signals. Later versions can derive real stats from task history, user ratings, success rate, rework rate, and drift/blockage signals.

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

1. User launches one active desktop pet.
2. User selects the active Hermes profile for that pet.
3. User talks to the pet, which routes the message or task to that active profile by default.
4. The message creates a quest assigned to that profile.
5. Guild Hall shows the task in progress.
6. Task detail records assignment, progress, artifacts, and errors.
7. Completed work appears in Review as a Quest Report Card.
8. User approves or asks for revision.

The hard v0 chain is:

> Pet entry -> profile assignment -> quest execution -> timeline visibility -> report card review.

Multiple desktop pets, unassigned queue, preferred assignment, and automatic claim are v0.5 features. Do not let them delay the core task/review loop.

Initial pages:

- Guild Hall / Home
- Quest Board
- Review

Agents / Characters can start as a section inside Guild Hall. A dedicated page is v0.5 unless profile management becomes necessary earlier.

Later pages:

- Tavern / Handoff
- Skill Deck
- Infirmary
- Archive / Library

## Implementation Guardrails

- Keep v0 small: one active desktop pet, profile switcher, three profile cards, Quest Board, task detail, and review.
- The desktop pet maps to the active Hermes profile and must show that profile's real status.
- Pet-created tasks are assigned to the active profile by default.
- Quest Board tasks must support direct assignment only in v0. Preferred profile/role, unassigned queue, and automatic pickup are v0.5.
- Use a Hermes Bridge API that exposes game-friendly objects instead of letting UI components depend directly on low-level Hermes internals.
- Use a shared event source for live status. v0 may start with a local bridge event emitter before WebSocket/SSE is warranted. Pet Mode and Guild Hall should react to the same task and system events.
- Represent assumptions separately from facts in reviews.
- Do not add decorative features, Tavern, Skill Deck, Infirmary, XP, loot, party quests, voice, complex pet animations, or complex auto-scheduling before the task/review loop works.
- When designing UI, favor dense, readable operational surfaces with RPG accents over oversized marketing layouts.
- Desktop pet animations should correspond to actual states: idle, thinking, running, blocked, needs review, and error.
- Quest creation should stay lightweight: one main task input, with goals, non-goals, context, and definition of done behind an advanced disclosure.
- Quest Report Card is the core reward loop. Rewards must map to real work objects: summary document, handoff card, decision, risk warning, open question, artifact, or follow-up task.

## Hermes Integration Reality

Before treating an RPG state as real, identify its source:

- Guild-maintained state: active profile, desktop position, task brief/goals/non-goals, direct assignment, review status, approve/revise actions, and user-facing timeline records.
- Hermes-provided or bridge-derived state: profile identity, active session, execution logs, model/tool errors, artifact path, completion signal, and profile availability.
- Guild-generated state: Quest Report Card, facts/assumptions/known gaps, trait display, quest summary, and timeline normalization.

If Hermes does not expose a signal yet, either route it through the bridge as a clearly derived state or leave the feature out of v0. Avoid UI that appears live but is not grounded in Hermes or Guild-owned state.

## Suggested Domain Objects

Frontend-facing objects should remain stable and game-readable:

- `Agent`: id, name, class/role, status, availability, active pet state, current task, skills, traits, health, equipment, last report.
- `Task`: id, title, assignee, brief, type, state, progress, artifacts, timeline, review status.
- `Skill`: id, name, rarity/category, description, trigger, cooldown or usage limits, enabled state.
- `SystemStatus`: gateway status, provider health, logs summary, warnings.

Key events:

- `task_started`
- `task_progress`
- `task_blocked`
- `task_completed`
- `review_required`
- `review_approved`
- `revision_requested`
- `gateway_error`
- `agent_idle`
- `active_profile_changed`
