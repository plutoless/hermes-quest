# Agent Execution Rules

## Core Goal
Build Hermes Guild v0 around this loop:

Pet entry -> profile assignment -> quest execution -> timeline visibility -> report card review.

`docs/DESIGN.md` is the product source of truth. If project instructions conflict, follow this priority:
1. `docs/DESIGN.md`
2. `docs/AGENT_RULES.md`
3. `docs/PRD.md`
4. `docs/REFERENCES.md`
5. `docs/EXECUTION_LOG.md`

## Codex Goal Rule
This project is intended to run as a Codex Goal / long-horizon implementation task.

The agent should work continuously through the milestone plan in `docs/TASKS.md`.

During execution:
- read `docs/PRD.md`, `docs/TASKS.md`, `docs/DESIGN.md`, and this file
- work through tasks in milestone order
- keep the app runnable after each milestone
- update checkboxes in `docs/TASKS.md` as tasks are completed
- append progress notes and decisions to `docs/EXECUTION_LOG.md`
- run relevant build/test/lint commands after meaningful changes
- keep diffs scoped to the active milestone
- do not stop after each single task unless blocked or the Goal is complete

At the end of each milestone:
- update `docs/EXECUTION_LOG.md` with what works, what is mocked, decisions, files changed, test results, and next milestone
- update `README.md` if run instructions or mocked behavior changed
- continue to the next milestone if unblocked

## Execution Ledger
Maintain `docs/EXECUTION_LOG.md` throughout the work.

`docs/EXECUTION_LOG.md` is not the only long-term memory. `docs/TASKS.md` is the milestone plan, `docs/PRD.md` is the stable v0 target, and `docs/EXECUTION_LOG.md` is the shared status, decision, and progress log.

`docs/EXECUTION_LOG.md` must track:
- current objective
- current milestone
- decisions
- progress notes
- blockers
- scope changes
- remaining gaps

Update it whenever you start, finish, block, drop, or change a task or milestone.

## Scope Rules
v0 includes:
- one active desktop pet
- direct profile assignment
- mock Hermes Bridge first
- Guild Hall
- Quest Board
- task timeline
- report card
- review approve/revise flow
- basic error state

v0 excludes:
- multiple pets
- auto-claim
- party quests
- XP/levels
- Tavern
- Skill Deck
- Infirmary
- voice input
- full Hermes integration

## Decision Rule
Do not silently change scope or architecture.

If you make an important product, UX, technical, or architecture decision, record it in EXECUTION_LOG.md before continuing.

## Working Rule
Prefer a small working vertical slice over many unfinished pages.

Success means the pet -> quest -> timeline -> report card -> review loop feels real, coherent, and runnable.
