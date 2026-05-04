# Web Fidelity Pass

## Goal

The design direction is acceptable, but the current web implementation does not match the intended quality.

This pass is not another design exploration.

This pass is a high-fidelity implementation pass for one focused screen:

Main Window / Guild Hall.

The goal is to make the web implementation feel close to the preferred low-density pixel JRPG desktop-app style.

## Current Problem

The previous implementation likely failed because it translated the image direction too loosely.

Do not just copy colors.

Do not use generic cards with pixel colors.

Do not create a SaaS dashboard with fantasy labels.

The implementation must capture:

- desktop app window feeling
- pixel-art JRPG panel structure
- parchment cards
- navy title bar
- muted gold trim
- soft low-density layout
- active companion card
- active quest card
- compact quest log
- compact review result
- integration truth strip
- bottom command input

## Scope

Only focus on the main Guild Hall / Main Window screen.

Do not redesign all pages in this pass.

Do not add product scope.

Do not add more variants.

Do not implement maps, ship dashboards, dungeon terminals, party rosters, fake XP systems, or new RPG mechanics.

## Target Screen Structure

Implement this screen structure:

```text
┌──────────────────────────────────────────────┐
│ Hermes Guild                         Status  │
├──────────────────────────────────────────────┤
│ Guild Hall / short status summary             │
├───────────────┬────────────────┬─────────────┤
│ Active        │ Active Quest    │ Quest Log   │
│ Companion     │                │ Review      │
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

## Required Visual Result

The main screen should feel like:

- a real desktop app
- a low-density pixel JRPG workbench
- a calm companion interface
- a focused task/review surface
- premium but practical

It should not feel like:

- a web landing page
- a generic SaaS dashboard
- a dense game HUD
- a concept board
- a fantasy wallpaper over normal components

## Visual Requirements

### 1. App Window Shell

The app should look like a desktop app window.

Required:

- dark navy title bar
- app name
- window controls
- subtle gold trim
- consistent outer border
- optional small status area
- no browser-page feeling

Use `PixelAppWindow` or equivalent.

### 2. Pixel Panel System

Use the Pixel UI Kit from `docs/PIXEL_UI_KIT.md`.

Panels should have:

- parchment / cream background
- muted gold or pixel-style border
- subtle corner treatment
- readable text
- enough padding
- consistent title/header treatment

Avoid:

- generic rounded SaaS cards
- plain gray panels
- random one-off card styles
- overly heavy shadows

### 3. Active Companion Card

Required:

- one prominent pixel avatar area
- agent name
- role
- current state
- focus / traits
- current task relationship

If pixel avatar assets are not available, use an intentional placeholder that still feels like a JRPG avatar/emblem.

Do not show a full party roster.

Do not add fake combat stats.

### 4. Active Quest Card

Required:

- quest title
- short brief
- objectives or current step
- progress
- primary action

This card should be the center of the screen.

It should feel like a JRPG quest card, but still operate like a task card.

### 5. Quest Log + Review

Right side should contain:

- compact quest log with 3-5 entries
- compact review/result card
- approve / revise actions if a result exists

Do not create a huge timeline dashboard.

Do not show too many events by default.

### 6. Integration Truth Strip

Required:

- bridge mode
- execution source
- fallback status
- real/mock/auto truth if available

Must be visible but not dominant.

This is operational truth, not decoration.

Do not imply full Hermes profile routing if it is not implemented.

### 7. Command Input

Required:

- bottom input
- placeholder
- send button
- optional quick-action button

The command input should feel like a JRPG command box and a desktop command bar.

Good placeholders:

```text
Ask Hermes to do something...
```

or:

```text
What shall we do today?
```

## Fidelity Requirements

This pass should be judged by screenshot quality.

Pay attention to:

- overall composition
- spacing
- typography scale
- line height
- text readability
- panel proportions
- border consistency
- title/header treatment
- color consistency
- background contrast
- hover states
- focus states
- button affordance
- empty states
- loading/running states
- error states
- desktop app proportions

## Implementation Requirements

Use the Pixel UI Kit components where possible.

If the kit does not exist yet, build the necessary parts first:

- PixelAppWindow
- PixelPanel
- PixelButton
- PixelInput
- PixelBadge
- PixelAvatar
- ActiveCompanionCard
- ActiveQuestCard
- QuestLogPanel
- ReviewResultCard
- IntegrationTruthStrip
- CommandInputBar

Then apply them to the main Guild Hall screen.

Do not spread effort across all pages.

One high-fidelity main screen is better than many shallow pages.

## Data / Functionality Preservation

Do not break:

- RealHermes bridge
- mock mode
- real mode
- auto mode
- pet -> quest -> timeline -> report card -> review loop
- visible integration truth
- approve / revise flow
- error handling

If any data is still mocked, label it honestly.

If profile routing is not real, do not imply it is real.

## Main Screen Content

Use real existing app state where available.

If placeholders are needed, use coherent sample content:

### Active Companion

```text
Hermes
Pathfinder of Tasks
Status: On Quest
Focus: Research & Synthesis
```

### Active Quest

```text
Market Research Brief
Compile insights on competitor pricing and positioning.
Progress: 68%
```

### Quest Log

```text
Researched 12 competitor websites and pricing pages.
Extracted key positioning statements and feature highlights.
Compiled pricing snapshot and differentiators table.
Drafted insights and recommendations outline.
```

### Review / Result

```text
market-research-brief.md
Well-structured brief with clear insights.
Approve
Revise
```

### Integration Truth

```text
Bridge Mode: Real
Execution Source: Local Bridge
Fallback: None
```

## Anti-Patterns

Do not:

- just recolor
- make another design board
- create eight variants
- add dense resource counters
- add XP/gold/gems
- add maps or dungeons
- add big illustrated backgrounds behind text
- use unreadable pixel font for paragraphs
- make everything equally prominent
- redesign unrelated pages before the main screen is good

## Acceptance Criteria

This pass is successful when:

- the main screen no longer looks like generic web UI
- the screen feels like a desktop app window
- pixel JRPG flavor is visible but restrained
- the layout is low-density and readable
- active companion is clear
- active quest is clear
- compact log/review is clear
- integration truth is visible
- command input is easy to find
- the implementation is structurally close to the preferred low-density generated design
- RealHermes bridge is not broken
- mock/real/auto modes are not broken
- approve/revise flow is not broken
- build/typecheck/lint/test are run if available
- README and EXECUTION_LOG are updated if needed

## Final Instruction

Do not spread effort across all pages.

Make one main screen good first.

Do not simulate pixel style with plain generic cards.

Use a reusable Pixel UI Kit and make the main Guild Hall screen feel like a real low-density pixel JRPG desktop app.
