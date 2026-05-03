# Hermes Guild v0 PRD

## Goal

Build a runnable Tauri + React desktop app that proves this loop:

Pet entry -> profile assignment -> quest execution -> timeline visibility -> report card review.

## Source of Truth

Priority:
1. `docs/DESIGN.md`
2. `docs/AGENT_RULES.md`
3. `docs/PRD.md`
4. `docs/REFERENCES.md`
5. `docs/EXECUTION_LOG.md`

## v0 Includes

- One active desktop pet.
- Active profile switcher.
- Text task input from pet.
- Pet opens Guild Hall.
- 3 mock Hermes profiles: Researcher, Builder, Reviewer.
- Mock Hermes Bridge first.
- Direct assignment only.
- Quest Board.
- Task Detail with timeline.
- Quest Report Card.
- Review approve/revise flow.
- Basic error state.

## v0 Excludes

- Multiple pets.
- Auto-claim.
- Party quests.
- XP/levels.
- Tavern.
- Skill Deck.
- Infirmary.
- Voice input.
- Full Hermes integration.

## Acceptance Criteria

- App launches locally.
- One pet window appears.
- Pet can open Guild Hall.
- User can select active profile.
- User can submit text task from pet.
- Task is assigned to active profile.
- Guild Hall shows the task.
- Quest Board shows task list and detail.
- Task detail shows timeline progress.
- Mock execution completes.
- Quest Report Card appears in Review.
- User can approve.
- User can revise and rerun.
- Error state is visible.
- README explains how to run and what is mocked.
