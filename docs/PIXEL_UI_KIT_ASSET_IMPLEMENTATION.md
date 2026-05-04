# Pixel UI Kit Asset Implementation

## Goal

Use the generated high-resolution pixel-art asset sheets to build a reusable Pixel JRPG UI Kit for Hermes Guild.

Do not treat the asset sheets as final UI screenshots.

Treat them as source reference sheets for extracting, cropping, and implementing reusable assets.

## Source Asset Sheets

Use the generated image assets in the project, including:

- pixel art UI design reference chart
- retro pixel art UI kit guide
- Hermes Guild UI icon catalog
- Hermes Guild character and mascot asset sheet

Keep source sheets outside the production repo unless they are needed for a short-lived extraction task.

Then create extracted/cropped implementation assets under:

```text
src/assets/pixel-ui/
  frames/
  buttons/
  inputs/
  badges/
  icons/
  avatars/
  mascots/
  textures/
```

## Implementation Principle

Do not simulate the whole style with generic CSS borders.

Use actual pixel assets where useful.

Use CSS for layout and states, but use asset-based UI chrome for:

- panel frames
- title bars
- section headers
- buttons
- inputs
- badges
- icons
- avatars
- mascot states

## Required Asset Extraction

Extract or recreate clean reusable assets from the sheets.

Minimum required assets:

### Frames

- parchment panel 9-slice source
- dark panel 9-slice source
- inset panel frame

### Buttons / Inputs

- primary gold button frame
- secondary navy button frame
- approve green button frame
- revise red button frame
- ghost button frame
- command input frame
- textarea parchment frame
- dropdown frame

### Badges / Chips

- idle badge
- running badge
- review badge
- error badge
- approved badge
- real badge
- mock badge
- auto badge
- fallback badge
- role chips

### Icons

- guild hall
- quest board
- review
- quest
- quest log
- report
- companion
- settings
- diagnostics
- bridge real
- bridge mock
- bridge auto
- Hermes available
- Hermes unavailable
- no fallback
- returned
- approved
- revise
- error
- warning
- search
- close
- minimize
- maximize
- dropdown arrow
- chevron
- plus
- send
- document
- scroll
- seal
- feather pen
- spark

### Character / Mascot

- Hermes Builder avatar: idle, running, needs review, error
- Hermes Scout avatar: idle, running, needs review, error
- Hermes Scribe avatar: idle, running, needs review, error
- Hermes Gatherer avatar: idle, running, needs review, error
- Hermes Owl mascot: idle, running, needs review, error

If exact cropping is hard, create approximate extracted assets first, but keep filenames stable.

## Asset Processing Rules

- Keep original source sheets outside production assets.
- Do not overwrite source sheets during extraction.
- Crop reusable assets into transparent PNGs where possible.
- Preserve pixel sharpness.
- Avoid blurry scaling.
- Prefer integer scaling.
- Use `image-rendering: pixelated` for pixel assets.
- Name assets clearly and consistently.

Example filenames:

```text
frames/panel-parchment-9slice.png
frames/panel-dark-9slice.png

buttons/button-primary.png
buttons/button-secondary.png
buttons/button-approve.png
buttons/button-revise.png

icons/quest-board.png
icons/review.png
icons/bridge-real.png
icons/hermes-available.png

avatars/builder-idle.png
avatars/builder-running.png
avatars/builder-needs-review.png
avatars/builder-error.png

mascots/owl-idle.png
mascots/owl-running.png
mascots/owl-needs-review.png
mascots/owl-error.png
```

## CSS Requirements

Create or update:

```text
src/styles/pixel-assets.css
```

Use asset-based CSS for resizable components.

Use CSS `border-image` / `border-image-slice` for 9-slice panels where feasible.

Example:

```css
.pixel-panel--parchment {
  border-style: solid;
  border-width: 18px;
  border-image-source: url("../assets/pixel-ui/frames/panel-parchment-9slice.png");
  border-image-slice: 18 fill;
  border-image-repeat: stretch;
  image-rendering: pixelated;
}
```

All pixel images should use:

```css
.pixel-art,
.pixel-icon,
.pixel-avatar,
.pixel-frame {
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}
```

Do not apply pixelated rendering to normal body text.

## Required React Components

Build or refactor these components under:

```text
src/ui/pixel/
```

Required components:

- PixelAppWindow
- PixelPanel
- PixelTitleBar
- PixelSectionHeader
- PixelButton
- PixelInput
- PixelTextarea
- PixelSelect
- PixelBadge
- PixelChip
- PixelIcon
- PixelAvatar
- PixelMascot
- PixelQuestCard
- PixelQuestLog
- PixelReviewCard
- PixelTruthStrip
- PixelCommandBar

The components should use extracted assets where useful, with CSS fallback if assets are missing.

## Showcase Page

Add a review page:

```text
/pixel-ui-showcase
```

or equivalent dev route.

The showcase must display:

- all panel variants
- button states
- input states
- badges
- chips
- icons
- avatars
- mascot states
- sample quest card
- sample review card
- sample truth strip
- sample command bar

The showcase is mandatory.

If the UI kit does not look good in isolation, do not spread it across the app.

## Apply To One Screen First

After the UI kit and showcase exist, apply it only to the main Guild Hall screen.

Do not redesign all pages in this pass.

Guild Hall should use:

- PixelAppWindow
- PixelPanel
- PixelAvatar
- PixelQuestCard
- PixelQuestLog
- PixelReviewCard
- PixelTruthStrip
- PixelCommandBar

## Preserve Behavior

Do not break:

- RealHermes bridge
- mock mode
- real mode
- auto mode
- task submit
- review approve / revise
- integration truth visibility
- existing data flow

## Acceptance Criteria

This task is complete when:

- source sheets are stored in the repo
- extracted reusable assets exist with stable names
- Pixel UI Kit components exist
- `/pixel-ui-showcase` displays the kit clearly
- Guild Hall uses the asset-based kit
- pixel assets render sharply
- panels/buttons/icons no longer look like generic CSS-only cards
- RealHermes behavior is preserved
- validation commands are run
- README explains how to view the showcase
- EXECUTION_LOG records changes, decisions, validation results, and remaining gaps
