# Pixel UI Kit

## Goal

Build a reusable asset-based Pixel JRPG UI Kit for Hermes Guild.

The current problem is that the web implementation looks like a generic dashboard with changed colors. The fix is not to keep tweaking page CSS. The fix is to create a proper pixel-style UI kit first, then build the main screen from those components.

The UI kit should make Hermes Guild feel like:

- a low-density desktop-native pixel JRPG companion workbench
- a calm desktop app
- a premium JRPG menu interface
- usable for daily work
- visually distinct from generic SaaS dashboards

It should not feel like:

- a dense game HUD
- a concept board
- a full game screen
- a fantasy wallpaper over normal cards
- a dashboard with pixel colors only

## Product Context

Hermes Guild is an AI-agent desktop app.

The current v0 loop must remain intact:

Pet entry -> profile assignment -> quest execution -> timeline visibility -> report card review.

The existing RealHermes bridge must keep working.

This UI Kit pass must not break:

- mock mode
- real mode
- auto mode
- RealHermes run submission
- RealHermes event reading
- Quest Report Card generation
- Review approve / revise flow
- visible integration truth

## Core Principle

Do not simulate pixel JRPG UI using only colors, border radius, and shadows.

Pixel JRPG quality comes from a visual system:

- pixel-style panel frames
- consistent border language
- intentional corners
- icon assets
- avatar assets
- title bar treatment
- command box treatment
- readable typography
- restrained pixel texture
- consistent status badges
- low-density layout

The UI kit should make future screens easier to build consistently.

## Implementation Strategy

Create a reusable UI layer before redesigning full pages.

Suggested structure:

```text
src/
  ui/
    pixel/
      PixelAppWindow.tsx
      PixelPanel.tsx
      PixelButton.tsx
      PixelInput.tsx
      PixelBadge.tsx
      PixelAvatar.tsx
      PixelSectionHeader.tsx
      PixelQuestCard.tsx
      PixelLogList.tsx
      PixelReviewCard.tsx
      PixelTruthStrip.tsx
      PixelCommandBar.tsx
      index.ts

  styles/
    pixel-theme.css

  assets/
    pixel-ui/
      frames/
      icons/
      avatars/
      textures/
```

If the existing repo uses a different structure, adapt to it, but keep the concept of a reusable pixel UI layer.

## Asset-Based Styling

Prefer asset-based styling over plain CSS-only simulation.

Use one or more of:

- CSS `border-image`
- 9-slice style PNG frames
- SVG pixel corners
- small pixel ornament assets
- pixel icons
- pixel avatar assets
- subtle parchment/noise textures

Use CSS-only fallback if assets are unavailable, but still structure components so real assets can be added later.

### Pixel Rendering

All pixel assets should render sharply.

Use:

```css
image-rendering: pixelated;
image-rendering: crisp-edges;
```

Apply this to:

- pixel avatars
- icons
- frame images
- decorative textures
- small sprites

Do not apply pixelated rendering to normal text.

## Typography

Use hybrid typography.

### Headings / Labels

Can use:

- pixel-style font
- retro-inspired font
- small caps with pixel feeling
- letter-spaced section labels

### Body Text

Must remain highly readable.

Use a normal UI font for:

- quest brief
- log entries
- review summaries
- output previews
- configuration text
- error messages

Do not use a hard-to-read pixel font for long paragraphs.

## Visual Direction

Use a restrained low-density pixel JRPG desktop style.

Preferred palette:

- dark navy title bar
- cream / parchment panels
- muted gold borders
- warm beige background
- restrained blue accents
- green for healthy / real / success
- amber for warning / mock
- red only for errors
- optional soft lavender / crystal accent

Avoid:

- neon cyberpunk
- oversaturated fantasy colors
- too many icons
- noisy resource bars
- dense game HUD
- huge scene backgrounds
- large pixel maps
- fake currencies
- fake XP systems

## Required UI Kit Components

### 1. PixelAppWindow

Purpose:
Create the desktop app shell.

Must include:

- dark navy title bar
- app name
- optional subtitle
- window controls
- subtle gold trim
- clear app boundary
- content area

Should feel like a native desktop window, not a browser page.

Props can include:

```ts
type PixelAppWindowProps = {
  title: string;
  subtitle?: string;
  status?: React.ReactNode;
  children: React.ReactNode;
};
```

### 2. PixelPanel

Purpose:
Reusable parchment / pixel panel.

Must include:

- cream/parchment background
- pixel-inspired border
- muted gold trim
- consistent padding
- optional title/header
- optional icon
- optional compact mode

Avoid generic rounded SaaS card styling.

Props can include:

```ts
type PixelPanelProps = {
  title?: string;
  icon?: React.ReactNode;
  variant?: "parchment" | "dark" | "inset" | "review";
  compact?: boolean;
  children: React.ReactNode;
};
```

### 3. PixelButton

Purpose:
JRPG-inspired action buttons.

Variants:

- primary
- secondary
- success
- danger
- ghost

Must support:

- hover
- active
- disabled
- focus-visible

Use for:

- Send
- Continue Quest
- Approve
- Revise
- Open Log
- View Report

### 4. PixelInput

Purpose:
Command input / text input.

Must include:

- dark or parchment input style
- clear focus state
- readable placeholder
- optional command-box styling

Should feel like a JRPG command box but still behave like a normal input.

### 5. PixelBadge / StatusBadge

Purpose:
Compact status labels.

Must support statuses:

- idle
- thinking
- running
- blocked
- needs_review
- error
- approved
- real
- mock
- auto
- fallback

Badges must be readable and consistent.

### 6. PixelAvatar

Purpose:
Agent avatar display.

For now, use:

- existing avatar asset if available
- generated placeholder sprite
- initials/emblem fallback

Must feel intentional, not like a generic user avatar.

Should support state styling:

- idle
- running
- needs_review
- error

### 7. PixelSectionHeader

Purpose:
Small JRPG-style section headers.

Use for:

- Active Companion
- Active Quest
- Quest Log
- Review & Result
- Integration Truth
- Command

Must be visually consistent.

### 8. PixelQuestCard

Purpose:
Active quest / quest summary.

Must include:

- title
- brief
- current step or objective
- progress
- state badge
- primary action

Should feel like a JRPG quest card but still operate like a task card.

### 9. PixelLogList

Purpose:
Compact quest log / recent events.

Must show only 3-5 visible entries by default.

Each entry should include:

- icon or marker
- title
- short detail
- timestamp or relative time
- status/source badge if useful

Do not make it a giant timeline dashboard.

### 10. PixelReviewCard

Purpose:
Quest result / report card.

Must include:

- summary
- artifact preview if available
- facts / assumptions / gaps if available
- approve action
- revise action
- source/provenance if available

Should feel like a small quest result card, not a huge analytics report.

### 11. PixelTruthStrip

Purpose:
Compact integration truth.

Must show:

- bridge mode
- active implementation / execution source
- real / mock / auto
- fallback reason if any

This must stay visible and honest.

Do not hide truth behind fantasy language.

Example content:

```text
Integration Truth
Bridge Mode: Real
Execution Source: Local Bridge
Fallback: None
```

### 12. PixelCommandBar

Purpose:
Bottom command input.

Must include:

- input
- send button
- optional quick action
- optional active agent hint

Good placeholders:

```text
Ask Hermes to do something...
```

or:

```text
What shall we do today?
```

## UI Kit Showcase

Add a showcase route, page, or developer-only screen if feasible.

Suggested path:

```text
/pixel-ui-showcase
```

or an internal route / component preview if routing is different.

The showcase should display:

- PixelAppWindow
- PixelPanel variants
- PixelButton variants
- PixelInput
- PixelBadge statuses
- PixelAvatar states
- PixelQuestCard
- PixelLogList
- PixelReviewCard
- PixelTruthStrip
- PixelCommandBar

The showcase is important because it lets us review whether the pixel style works before spreading it across the app.

If adding a route is hard, create a component or story-like page reachable in the app.

## High-Fidelity Requirements

Pay close attention to:

- spacing
- panel proportions
- typography scale
- border consistency
- status badge consistency
- hover states
- focus states
- readable text
- desktop-app feel
- low density
- visual rhythm

The goal is not to create more decoration.
The goal is to make the main UI feel designed and reusable.

## Accessibility / Usability

Even with pixel styling:

- text must be readable
- buttons must have clear affordance
- focus states must be visible
- contrast must be acceptable
- the command input must be easy to find
- error states must be obvious
- integration truth must be legible

## Acceptance Criteria

This UI kit pass is successful when:

- A reusable pixel UI component layer exists.
- The components do not look like generic SaaS cards.
- Pixel styling is not just color changes.
- The showcase page or preview clearly demonstrates the design system.
- Components are usable in the main Guild Hall screen.
- Text remains readable.
- The UI kit does not break app behavior.
- RealHermes bridge is not broken.
- mock / real / auto modes are not broken.
- build/typecheck/lint/test are run if available.

## Final Instruction

Build the UI kit first.

Do not spread effort across all pages.

Do not create a dense game HUD.

Do not just recolor existing components.

Make a reusable low-density pixel JRPG desktop UI system that can support the main Hermes Guild screen.
