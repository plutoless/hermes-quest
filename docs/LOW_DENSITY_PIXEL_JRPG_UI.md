# Low Density Pixel JRPG UI Direction

## Goal

Redesign Hermes Guild as a low-density desktop-native pixel JRPG companion workbench.

The previous designs were too dense and too close to game HUD / concept board style. The new direction should feel like an actual desktop app that can be used every day.

The target is:

A calm desktop app with pixel JRPG flavor.

Not:

- full game interface
- dense dashboard
- concept board
- fantasy skin over SaaS UI
- multi-panel strategy HUD

## Product Loop To Preserve

The existing v0 loop must remain intact:

Pet entry -> profile assignment -> quest execution -> timeline visibility -> report card review.

The existing RealHermes bridge must keep working.

Do not break:

- real mode
- auto mode
- explicit test/dev mock harnesses
- RealHermes run submission
- RealHermes event reading
- Quest Report Card generation
- Review approve / revise flow
- visible integration truth

## Preferred Visual Direction

Use the latest preferred low-density direction.

The best reference direction is the generated style with:

- one active agent card
- one active quest
- right-side quest report / review panel
- clean desktop sidebar or light navigation
- parchment panels
- navy title bar
- muted gold trim
- pixel avatar
- readable body text
- approve / revise clearly visible
- integration truth shown as a small status block

Prefer this over the previous dense concept-board variants.

## Core Design Principle

One screen should have one main focus.

Do not show everything at once.

The user should understand these in 5 seconds:

1. Who is active?
2. What quest is active?
3. What happened recently?
4. Is there something to review?
5. Is the bridge real / auto / unavailable?

## Information Density Rules

- Maximum 3 main areas visible at once.
- Maximum 1 active companion shown prominently.
- Maximum 1 active quest shown prominently.
- Maximum 3-5 quest log entries visible by default.
- Maximum 1 compact review/result card visible by default.
- Integration truth must be visible but small.
- No large resource HUDs.
- No fake currencies unless already part of real app data.
- No XP / gold / gems overload.
- No large maps, dungeon boards, ship dashboards, or strategy terminals.
- No multi-panel concept-board layout.
- No overly decorative backgrounds behind important text.
- Body text must remain readable.

## Recommended Main Window Structure

Use a simple desktop app layout:

```text
┌──────────────────────────────────────────────┐
│ Hermes Guild                         Status  │
├──────────────────────────────────────────────┤
│ Header / Guild Hall summary                  │
├───────────────┬────────────────┬─────────────┤
│ Active Agent  │ Active Quest    │ Quest Log   │
│               │                │ Review      │
├───────────────┴────────────────┴─────────────┤
│ Integration Truth                             │
├──────────────────────────────────────────────┤
│ Command input                         Send   │
└──────────────────────────────────────────────┘
```

Alternative accepted structure:

```text
┌──────────────────────────────────────────────┐
│ Hermes Guild                         Status  │
├───────────────┬──────────────────────────────┤
│ Active Agent  │ Quest Report / Review         │
│ Current Quest │ Quest Log Highlights          │
├───────────────┴──────────────────────────────┤
│ Integration Truth                             │
├──────────────────────────────────────────────┤
│ Command input                         Send   │
└──────────────────────────────────────────────┘
```

## Required Areas

### 1. Active Companion

Show one active agent clearly.

Must include:

- pixel avatar
- name
- role
- current state
- short traits or focus
- current task relation

### 2. Active Quest

Show one active quest as the center of the screen.

Must include:

- quest title
- short brief
- current objective or step
- progress
- primary action

### 3. Quest Log

Quest log should be compact.

Show only recent 3-5 events.

### 4. Review / Result

Review should be visible and useful.

It should include:

- latest result summary
- output artifact preview
- quality / confidence / status if available
- approve button
- revise / request changes button

### 5. Integration Truth

Integration truth must remain visible but compact.

Must show:

- bridge mode
- execution source
- real / auto / unavailable status
- fallback if any

Do not hide truth behind fantasy language.

Do not imply full Hermes profile routing if it is not implemented.

### 6. Command Input

The bottom command input is important.

It should feel like a JRPG command box / desktop command bar.

Must include:

- input field
- placeholder
- send button
- optional quick actions

## Style Rules

Use subtle pixel borders, pixel avatar, parchment cards, navy / cream / muted gold palette, soft panel shadows, retro headings, readable body font, and small decorative corners.

Avoid dense game HUDs, map screens, big fantasy background art, noisy resource bars, excessive animation, unreadable pixel body text, cyberpunk neon, and childish mobile-game styling.

## Acceptance Criteria

- The app feels like a real desktop app, not a concept board.
- The UI is much less dense than previous versions.
- The JRPG pixel style is visible but restrained.
- User can understand current companion, active quest, latest log, and review status in 5 seconds.
- The command input is easy to find.
- Integration truth is visible and honest.
- RealHermes bridge still works.
- real / auto behavior still works.
- explicit test/dev mock harnesses still work.
- Review approve / revise still works.
- README is updated if UI instructions changed.
- EXECUTION_LOG is updated with what changed and validation results.
- build/typecheck/lint/test are run if available.
