# Pet Mode Redesign

## Goal

Redesign Hermes Guild's floating window from a chat/dialog-style widget into a true desktop pet / companion widget.

The main app UI is acceptable for now. This pass should focus only on Pet Mode.

Pet Mode should feel like:

- a small desktop companion
- character-first
- lightweight
- always nearby
- useful but not intrusive
- visually consistent with the Pixel JRPG UI system

Pet Mode should not feel like:

- a mini chat app
- a small dashboard
- a floating form
- a reduced version of Guild Hall
- a diagnostics panel
- a giant dialog box

## Core Principle

Pet Mode is companion-first, interface-second.

The character should be the center of attention. The interface should appear only when needed.

Default state should feel like a desktop pet. Expanded state should feel like a small companion card. Deep work should open the main Hermes Guild window.

## Product Loop To Preserve

Do not break the existing product loop:

Pet entry -> profile assignment -> quest execution -> timeline visibility -> report card review.

Pet Mode may trigger this loop, but it should not contain the full loop.

Keep deep workflows in the main app:

- Guild Hall
- Quest Board
- Review Chamber
- detailed timeline
- diagnostics
- settings
- Hermes bridge configuration

## Current Problem

The current floating widget still looks like a dialog box or mini chat window.

Problems:

- the panel is too dominant
- the character is not the main visual focus
- it feels like a UI widget, not a companion
- it exposes too much interface by default
- it does not have clear collapsed / expanded behavior
- it does not express pet states strongly enough
- it feels disconnected from desktop pet expectations

## Desired Pet Mode States

Pet Mode should support these states:

```text
idle
thinking
running
needs_review
error
```

Each state should be expressed through small visual cues:

- pose
- status badge
- icon
- tiny speech bubble
- ring / glow / pulse
- small motion treatment

Do not express state by turning the widget into a large information panel.

## Window Model

Pet Mode should ideally be a separate floating widget window.

If technically feasible in the current desktop stack, use:

- frameless window
- always-on-top behavior
- draggable surface
- transparent or visually lightweight background
- compact default size
- separate from the main app window

If platform-specific behavior is difficult, implement a web fallback that visually behaves like a floating pet widget.

## Interaction Model

Pet Mode has three levels.

## Level 1 - Collapsed Pet

This is the default state.

Required:

- companion character / pixel avatar as the main element
- small status badge
- optional tiny speech bubble
- compact footprint
- no full input box
- no large panel
- no timeline
- no diagnostics

Behavior:

- click: expand to companion card
- double click: open Guild Hall
- drag: move widget
- right click or small menu: show secondary options if needed

## Level 2 - Expanded Companion Card

This appears after clicking the pet.

Required content:

- companion name
- role
- current status
- current task summary or "No active quest"
- 1-3 quick actions

Suggested quick actions:

- Idle: New Quest, Open Guild Hall
- Running: View Progress, Open Guild Hall
- Needs Review: Review, Open Guild Hall
- Error: View Issue, Open Guild Hall

Rules:

- no long chat history
- no full timeline
- no settings
- no bridge diagnostics
- no large form
- no giant input by default

## Level 3 - Main Window Handoff

Any deeper workflow should open the main app.

Open the main app for:

- creating a detailed quest
- viewing full task timeline
- reviewing returned reports
- changing bridge mode
- viewing diagnostics
- settings
- multi-step edits

Pet Mode should provide entry points, not replace the app.

## Visual Direction

Pet Mode should use the existing Pixel JRPG UI system.

Use:

- pixel avatar / sprite
- compact navy frame
- parchment mini-card
- muted gold trim
- small status badge
- tiny speech bubble
- subtle glow / pulse
- readable text
- same design language as Guild Hall

Avoid:

- generic chat bubble UI
- large rectangle dialog
- debug panel
- full-width input field by default
- heavy background frame
- huge card shadow
- busy HUD decorations

## Character Requirements

Do not redesign the character.

Use the current accepted Brass / Hermes companion identity. Avatar identity is already acceptable. The issue is placement and behavior, not character design.

Avatar rules:

- same face
- same hair / accessories
- same outfit silhouette
- same visual identity across states
- only state cues may change
- maintain AvatarFrame alignment
- keep transparent background
- no screenshot-tile background

## AvatarFrame Requirements

Pet Mode must use the shared AvatarFrame / PixelAvatarFrame component.

Requirements:

- fixed frame size
- consistent inner safe area
- centered image horizontally and vertically
- object-fit: contain or equivalent
- object-position: center center
- image-rendering: pixelated
- no crop errors
- no border touching
- no shifted avatar content

## Pet State Design

Idle means no active quest or waiting for user input. Use a relaxed pose, Ready / Idle badge, and short copy such as `Ready for a quest.`

Thinking means the user submitted something and the agent is preparing. Use a small ellipsis bubble, soft pulse, and copy such as `Thinking...`

Running means the agent is executing a task. Use a focused treatment, running badge, subtle pulse, and copy such as `Working on your quest.`

Needs Review means a quest has returned and requires human review. Use an attention badge, report icon, and copy such as `1 quest is ready for review.`

Error means a task or bridge failed. Use a compact warning badge and copy such as `Something needs attention.` Do not show long raw errors in Pet Mode.

## Component Plan

Create or refine these components:

```text
PetWidget
PetCharacter
PetStatusBadge
PetSpeechBubble
PetExpandedCard
PetQuickActions
PetWindowChrome
```

Optional:

```text
PetDragHandle
PetStateRing
PetMiniMenu
```

## Size Guidance

Collapsed Pet:

```text
width: 96-140px
height: 110-160px
```

Expanded Card:

```text
width: 260-340px
height: 180-260px
```

Avoid making the expanded card as large as a chat window.

## Copy Guidelines

Use short, companion-like copy.

Good:

```text
Ready for a quest.
Working on your quest.
1 report is ready.
Need your review.
Open the Guild Hall?
```

Avoid:

```text
Enter a task below to start a new task execution session.
Hermes API health request failed at localhost...
Runtime bridge selected implementation MockHermesBridge...
```

Long diagnostic or technical copy belongs in the main window.

## Truth / Bridge Status In Pet Mode

Pet Mode may show bridge status, but only compactly.

Examples:

```text
Real
Auto
Needs attention
```

Do not show full diagnostics. If bridge state matters, clicking the status should open the main window diagnostics/details.
Do not show mock as a normal runtime fallback; unavailable Hermes state should read as needs attention, unavailable, or error.

## Behavior Requirements

Collapsed:

- character visible
- status visible
- click expands
- double click opens Guild Hall
- no input field by default

Expanded:

- companion card visible
- quick actions visible
- optional one-line task summary
- close/collapse control visible
- no large chat history
- no full dashboard

Main Window Handoff:

- New Quest -> open Quest Board or compact command flow
- View Progress -> open current task detail
- Review -> open Review Chamber
- View Issue -> open diagnostics or task error detail
- Open Guild Hall -> open main window

## Non-Goals

Do not implement in this pass:

- full chat history in Pet Mode
- full Quest Board inside Pet Mode
- full Review Chamber inside Pet Mode
- diagnostics panel inside Pet Mode
- voice input
- multiple pets
- party quests
- XP / levels
- complex animation system
- new character redesign
- broad main window redesign

## Implementation Priority

Phase 1 - Structure:

- identify current floating widget implementation
- separate Pet Mode from dialog/chat UI assumptions
- create PetWidget collapsed / expanded state
- preserve existing open-main-window behavior

Phase 2 - Visual:

- implement character-first collapsed state
- implement lightweight expanded companion card
- use Pixel JRPG UI styling
- fix avatar centering through shared AvatarFrame

Phase 3 - State Mapping:

```text
no active quest -> idle
task submitted but not running -> thinking
task running -> running
task needs review -> needs_review
task error -> error
```

Phase 4 - Actions:

```text
New Quest
View Progress
Review
Open Guild Hall
View Issue
```

Phase 5 - Validation:

- verify collapsed state
- verify expanded state
- verify all pet states
- verify main window handoff
- verify avatar alignment
- verify no main app behavior broke

## Acceptance Criteria

This pass is successful when:

- collapsed Pet Mode looks like a desktop pet, not a dialog box
- expanded Pet Mode looks like a lightweight companion card, not a mini dashboard
- the character is the main visual focus
- the widget is compact and unobtrusive
- no full input box appears by default
- no large chat panel appears by default
- states idle / thinking / running / needs_review / error are visually distinct
- quick actions open the correct main app areas
- avatar identity is unchanged
- avatar placement is centered and consistent
- current main app UI is not broadly redesigned
- RealHermes bridge, real/auto behavior, explicit test/dev mock harnesses, submit, approve/revise flow still work
- EXECUTION_LOG is updated with changes and validation results

## Final Instruction

Do not make Pet Mode a smaller version of the app.

Do not make it a chat box.

Make it a real pixel companion that lives on the desktop and opens the main app only when deeper work is needed.
