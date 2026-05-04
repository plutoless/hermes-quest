# Pet Mode Lightweight Overlay Polish Spec

## Goal

Refine Hermes Guild Pet Mode so the pet character remains the main visual anchor and the expanded chat becomes a lightweight transparent speech-bubble overlay.

The current Pet Mode behavior is directionally correct: collapsed mode is character-first, clicking opens chat, Send stays in Pet Mode, and Hermes/agent responses can appear as message bubbles.

This pass is visual and interaction polish for the floating Pet Mode surface. It should remove the remaining heavy panel feeling without changing the product loop or bridge behavior.

## User-Approved Requirements

- The pet character remains the main visual anchor.
- Chat should appear as a lightweight transparent speech bubble / overlay.
- Remove the heavy parchment panel background around the whole floating chat area.
- Do not make the floating UI look like a mini chat app or mini dashboard.
- Input should be lightweight and overlay-style, not embedded in a large panel.
- Actions like Review / Open / Progress / Issue should be small chips or lightweight action buttons, not big block buttons.

## Current Reality

Pet Mode currently has:

- transparent character-first collapsed state
- click-to-open expanded chat
- user and Hermes/agent message bubbles
- Send behavior that stays in Pet Mode
- best-available Hermes/bridge response bubbles from timeline/report/output sources
- explicit handoff actions for deeper workflows

The remaining problem is that the opened chat surface still has too much full-panel visual weight. It can read as a floating parchment card or compact mini app instead of a light speech-bubble overlay around the pet.

## Scope

In scope:

- Pet Mode expanded chat visual structure.
- Pet Mode CSS and small component markup changes where needed.
- Lightweight speech-bubble / overlay treatment.
- Lightweight overlay-style input.
- Small chip-style handoff actions.
- Screenshot/manual validation for collapsed, expanded, post-send, and report-output states.
- Validation and execution log updates.

Out of scope:

- Guild Hall redesign.
- Quest Board redesign.
- Review Chamber redesign.
- Broad Pixel UI Kit redesign.
- New character art, regenerated avatars, or sprite sheets.
- Bridge rewrite.
- Persistent long-term chat history.
- Full chat app behavior.
- Full dashboard/status panel inside Pet Mode.
- Full review workflow inside Pet Mode.
- Diagnostics/settings inside Pet Mode.
- Multiple pets.
- Voice input.
- Fake RPG stats, XP, levels, or game systems.

## User-Visible Behavior

### Collapsed Pet

Preserve current behavior:

- transparent desktop pet
- character-first
- no input visible by default
- no panel/card/dashboard visible by default
- click opens chat
- explicit handoff can open Guild Hall

### Expanded Pet Chat

Clicking the pet opens a compact overlay near the character.

The expanded surface should feel like:

- transparent or near-transparent speech-bubble UI
- light enough that the character remains dominant
- anchored to the pet
- compact message bubbles
- compact overlay input
- small action chips

It should not feel like:

- a parchment card around the whole chat area
- a mini chat application
- a mini dashboard
- a status panel
- a form widget
- a report card
- a reduced Guild Hall

Opening the chat must not move, push, resize, or recenter the pet character.

### Message Bubbles

Preserve the existing message behavior:

- user messages appear as user bubbles
- Hermes/agent messages appear as agent bubbles
- Send appends the user message
- Send keeps the user in Pet Mode
- Send does not automatically open Guild Hall or Quest Board
- Hermes/agent response bubble appears after Send
- progress/final-response bubbles can appear when available

The visual treatment should be lighter than a panel. Individual bubbles can use subtle translucent fills, small borders, or soft pixel accents, but the entire chat area should not sit inside a heavy parchment frame.

### Input

The input should feel like a lightweight overlay command control:

- compact
- visually subordinate to the pet and message bubbles
- no large enclosing panel
- no heavy block button treatment
- clear focus state
- Send remains obvious

### Actions

Review / Open / Progress / Issue actions should appear as:

- small chips
- tiny command buttons
- icon+text links
- lightweight action pills

They should not appear as large block buttons or dominate the floating widget.

Deep workflows still open the main app.

## Preservation Requirements

Do not break:

- transparent character-first collapsed Pet Mode
- current character identity and avatar assets
- AvatarFrame alignment
- current message bubble behavior after Send
- staying in Pet Mode after Send
- Hermes/agent response bubbles
- final output/report excerpts when available
- RealHermes bridge
- mock / real / auto modes
- pet submit flow
- approve / revise flow
- Hall/Pet native switching behavior

## Likely Files And Systems

Read first:

- `SPEC.md`
- `GOAL.md`
- `docs/PET_MODE_REDESIGN.md`
- `AGENTS.md`
- `src/App.tsx`
- `src/styles.css`
- `src/types.ts`
- `src/bridge/mockHermesBridge.ts`
- `src/bridge/realHermesBridge.ts`
- `src/ui/pixel/index.tsx`
- `src-tauri/tauri.conf.json`
- `src-tauri/src/lib.rs`
- `package.json`

Useful discovery commands:

```bash
rg "PetPanel|pet-chat|pet-message|pet-handoff|pet-window|createPetQuest" src
rg "mode=pet|show_hall_window|show_pet_window|tray|WindowEvent" src src-tauri
```

## Implementation Notes

- Prefer CSS/markup refinement over behavior rewrites.
- Keep the pet character positioned as the anchor.
- Remove or soften any wrapper that reads as a whole-card parchment panel.
- Use translucent speech-bubble layering for the chat area.
- Use small action chips instead of `PixelButton` block treatment if the current button styling feels too heavy.
- Keep raw bridge diagnostics out of Pet Mode.
- Keep text readable even with a lighter overlay.

## Edge Cases

- If many messages exist, keep the latest few visible without turning the overlay into a tall chat window.
- If output is long, continue truncating to a concise excerpt.
- If there is an error, show a short safe bubble and a lightweight Issue/Open chip.
- If the viewport/native pet window is constrained, prefer smaller bubbles and internal scrolling over pushing the pet character.
- If a visual treatment looks good in browser but fails on transparent native window, favor the native-window result.

## Verification

Run available automated validation:

```bash
bun run verify:web
cd src-tauri && cargo fmt --check
cd src-tauri && cargo check
```

Manual/browser validation:

- `/?mode=pet&variant=skyship-command-deck` for collapsed Pet Mode.
- `/?mode=pet&variant=skyship-command-deck&pet=expanded` for opened overlay.
- Post-send state showing user bubble and Hermes/agent response bubble.
- Completed/report state showing useful output excerpt.

Native validation where feasible:

- native startup shows only the transparent pet window.
- opening Hall hides Pet.
- minimizing or closing/hiding Hall shows Pet again.
- expanded chat overlay does not become a heavy panel on the native transparent window.

## Done When

This task is done only when all of the following are true:

- `/?mode=pet&variant=skyship-command-deck` still shows character-first transparent Pet Mode.
- Clicking the pet opens chat without moving, pushing, resizing, or recentering the character.
- Expanded chat no longer has a heavy parchment panel around the whole floating area.
- Chat appears as lightweight speech bubble / transparent overlay UI.
- The floating UI does not look like a mini chat app, mini dashboard, status card, or form panel.
- Input appears as a lightweight overlay command control.
- Review / Open / Progress / Issue actions are small chips or lightweight buttons, not big block buttons.
- User and Hermes/agent message bubbles remain distinct.
- Send stays in Pet Mode and does not open Hall or Quest Board.
- Hermes/agent response bubble still appears after Send.
- Final output/report excerpt still appears when available.
- RealHermes bridge, mock/real/auto modes, submit flow, and approve/revise flow remain intact.
- `docs/EXECUTION_LOG.md` records changes, screenshots/manual checks, validation commands, and remaining gaps.
- `bun run verify:web`, `cargo fmt --check`, and `cargo check` pass, or failures are documented exactly.
