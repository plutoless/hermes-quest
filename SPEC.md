# Hermes Desktop Companion v0 Remake Spec

## Goal

Remake the product around `docs/v0-remake-prd.md`: a borderless desktop AI companion whose primary interface is the floating Hermes character, not a dashboard or task workbench.

The PRD supersedes the previous Guild Hall / Quest Board / Review Chamber product direction for v0 normal runtime. Keep the Hermes communication bridge where useful, but expose it through a small chat-provider adapter for the companion experience instead of through dashboard, task-board, or review workflows.

The visual target is `docs/design.png`. The implementation should match its product language: elegant mature anime concierge, white/silver/lavender palette, visible desktop/background, translucent detached popovers, compact controls, speech bubble, and bottom input capsule.

## Product Boundary

Option A is user-approved: the PRD becomes the source of truth for v0.

Normal product runtime must be companion-first:

- floating Hermes character
- speech bubble
- lightweight input bar
- Companions popover
- Appearance popover
- compact Settings popover

Normal product runtime must not include:

- Guild Hall dashboard
- Quest Board
- Review Chamber
- pixel/JRPG dashboard variants
- left sidebar or full navigation shell
- task board, timeline, report card, artifact center, or profile management surfaces

Existing Hermes bridge/client/sidecar/native communication code can remain if it is still useful for chat execution, health checks, or future compatibility. It should not force dashboard product concepts into the user-facing v0 companion UI.

## User-Visible Behavior

### First Launch

When the app opens:

1. A default Hermes companion appears in a transparent, frameless, always-on-top desktop window or overlay.
2. Hermes plays an idle animation.
3. A compact speech bubble appears with PRD-style greeting copy.
4. A slim input capsule appears near Hermes or near the lower center of the overlay with placeholder `Ask Hermes anything...`.
5. Clicking Hermes focuses the input.
6. Small detached controls allow opening Companions, Appearance, and Settings popovers.

### Daily Use

- Hermes floats above the desktop without a visible app frame.
- The user can drag Hermes when dragging is enabled.
- Position, scale, visibility, and settings persist locally.
- The user can click Hermes to chat.
- The user can show/hide companions through the Companions popover.
- The user can adjust appearance through the Appearance popover.
- The app never opens a dashboard by default.

### Chat Flow

1. User clicks Hermes.
2. Input appears and focuses.
3. User enters text and presses Enter or send.
4. Input clears.
5. Hermes switches to `think`.
6. If response takes more than 500ms, show a short thinking bubble.
7. The configured provider returns a response.
8. Hermes switches to `talk` and shows the response in the speech bubble.
9. After timeout, Hermes returns to `idle`.

Chat history stays minimal in v0. A full chat page is out of scope.

## Core Components

### Desktop Companion Runtime

Requirements:

- transparent frameless window or equivalent overlay
- always-on-top support
- companion click interaction
- right-click or small control trigger
- drag positioning
- persisted position and scale
- state-based animation switching
- one or more visible companions in the local data model, with at least the default Hermes companion bundled

Preferred window model:

- one transparent overlay window that renders companion, bubble, input, and popovers together

If platform limitations make a full-screen transparent overlay impractical, the implementation may use a transparent frameless pet window as the v0 stepping stone, but it must still avoid dashboard chrome and make the companion the main surface.

### Speech Bubble

Requirements:

- small rounded frameless bubble
- visually attached to the companion with a tail or clear spatial relationship
- short messages only
- stays within screen bounds as practical
- fades in/out smoothly
- does not become a chat window

### Floating Input Bar

Requirements:

- compact capsule, not a panel
- placeholder `Ask Hermes anything...`
- supports Enter-to-send
- send button
- optional microphone icon placeholder
- auto-hides after inactivity when empty if implemented without harming usability

### Companions Popover

Requirements:

- detached glass popover
- list companion thumbnail, name, subtitle/status, visibility toggle
- select a companion for appearance editing
- `Add Companion` entry may be a placeholder in v0
- language uses `Companions`, `Show on desktop`, and similar presence-focused terms

### Appearance Popover

Requirements:

- detached compact panel matching `docs/design.png`
- selected companion portrait/preview
- name field
- show-on-desktop toggle
- size slider
- `Preset`, `Generate`, `Upload` tabs
- animation preview controls for `Idle`, `Talk`, `Think`, `Wave`
- sprite sheet preview using the 4x4 v0 format
- apply selected appearance to the desktop companion immediately

`Generate` and `Upload` may be placeholder flows if full generation/file handling is too large for the v0 remake, but placeholders must be honest and must not silently pretend assets were generated or uploaded.

### Settings Popover

Requirements:

- compact popover, not a settings app
- app-level settings only:
  - launch at startup
  - always on top
  - remember positions
  - allow dragging
  - show speech bubbles
  - quiet mode
  - click-through mode
  - low resource mode
- no provider dashboard, task workflow settings, tool registry, or profile management

## Data Model

Implement or adapt frontend-facing local objects equivalent to the PRD models:

```ts
export type CompanionStatus = "idle" | "thinking" | "talking" | "away" | "hidden";
export type AnimationState = "idle" | "talk" | "think" | "wave";
export type AppearanceSource = "preset" | "generated" | "uploaded";

export interface Companion {
  id: string;
  name: string;
  description?: string;
  visible: boolean;
  status: CompanionStatus;
  appearanceId: string;
  position: { x: number; y: number };
  scale: number;
  behavior: {
    allowDrag: boolean;
    showSpeechBubbles: boolean;
    idleAtScreenEdge?: boolean;
    clickThrough?: boolean;
  };
  agent?: {
    agentId?: string;
    provider?: string;
    model?: string;
  };
}

export interface CompanionAppearance {
  id: string;
  name: string;
  source: AppearanceSource;
  thumbnailUrl: string;
  spriteSheetUrl: string;
  frameWidth: number;
  frameHeight: number;
  rows: { idle: number; talk: number; think: number; wave: number };
  framesPerRow: number;
  fps: { idle: number; talk: number; think: number; wave: number };
  background?: { type: "transparent" | "chroma"; chromaKey?: string };
}
```

Persist locally:

- companions
- appearances
- positions
- scale
- visibility
- settings
- last selected companion

Browser/local storage is acceptable for web development. Tauri/local filesystem persistence is acceptable or preferred when the native shell path is touched.

## Sprite System

Support the PRD v0 standard:

- 4 rows x 4 columns
- 16 frames total
- row 0: idle
- row 1: talk
- row 2: think
- row 3: wave
- equal frame width and height
- transparent PNG/WebP preferred
- chroma key supported when transparency is unavailable, recommended key `#FF00FF`

The default Hermes preset must have enough bundled visual assets to render all four animation states. If a production sprite sheet is not available, implement a clear PRD-compatible preset placeholder that can be replaced by a real generated sheet without changing the component API.

## Chat Provider And Hermes Bridge

Keep the communication bridge with Hermes, but simplify the UI-facing contract:

```ts
export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

export interface ChatProvider {
  sendMessage(input: {
    companionId: string;
    messages: ChatMessage[];
  }): Promise<ChatMessage>;
}
```

Provider modes:

- `mock`: explicit local/demo mode with canned responses
- `hermes`: use existing Hermes bridge/client/sidecar routes where available

Mock mode is allowed by the PRD so the app works without a real AI backend, but it must be explicit in code/config/UI state and must not masquerade as real Hermes. Do not silently substitute mock responses when the user has selected real Hermes mode and Hermes is unavailable.

The old task/review bridge API may remain internally during the remake if removing it would create unnecessary risk, but normal companion UI must not expose quests, reports, task boards, or review chambers.

## Visual Requirements

Use `docs/design.png` as the concrete visual reference:

- Hermes character is the dominant interface
- desktop/background remains visible
- top-left product identity may be present but must not become navigation
- panels are detached glass popovers with subtle blur/shadow
- palette is white, silver, soft gray, lavender, and restrained violet
- typography is clean and mature
- controls are compact and stable
- no JRPG/pixel styling in the normal v0 product
- no full-screen dashboard shell
- no sidebar app navigation
- no decorative stats, levels, XP, loot, or fantasy dashboards

Responsive behavior should preserve the same mental model at smaller windows: companion and input remain primary, popovers stay compact, and text must not overlap controls.

## Likely Files

Read first:

- `AGENTS.md`
- `docs/v0-remake-prd.md`
- `docs/design.png`
- `src/App.tsx`
- `src/styles.css`
- `src/types.ts`
- `src/bridge/types.ts`
- `src/bridge/bridgeFactory.ts`
- `src/bridge/realHermesBridge.ts`
- `src/bridge/mockHermesBridge.ts`
- `src/hooks/useBridgeSnapshot.ts`
- `src-tauri/tauri.conf.json`
- `src-tauri/src/lib.rs`
- `src/App.pet.test.ts`
- `package.json`

Likely implementation areas:

- `src/App.tsx`
- `src/styles.css`
- `src/types.ts`
- new focused companion UI/components under `src/ui/` if useful
- bridge adapter files under `src/bridge/` if needed for `ChatProvider`
- `src-tauri/tauri.conf.json`
- `src-tauri/src/lib.rs`
- tests for chat flow, persistence, and route removal

Legacy pixel/JRPG assets and component files may be removed from normal runtime imports if no longer used. Avoid deleting large asset directories unless the implementation clearly no longer references them and doing so is low risk.

## Non-Goals

- Do not keep Guild Hall, Quest Board, Review Chamber, pixel/JRPG dashboard variants, or dashboard navigation in normal runtime.
- Do not implement task assignment, quest execution, timeline visibility, report card review, or artifact workflows in v0 remake.
- Do not build Tavern, Skill Deck, Infirmary, Archive, multi-agent orchestration, or marketplace surfaces.
- Do not build complex provider setup UI.
- Do not build a large chat history page.
- Do not build complex sprite generation or file management if compact placeholders satisfy the PRD v0.
- Do not choose Godot or rewrite the stack away from Tauri/React.
- Do not modify Hermes source outside this repository.

## Acceptance Criteria

User-approved `done_when` criteria:

- Default runtime launches as a borderless, transparent, always-on-top desktop companion experience, not a dashboard.
- Normal v0 UI contains only floating companion, speech bubble, input bar, Companions popover, Appearance popover, and compact Settings popover.
- Existing Guild Hall, Quest Board, Review Chamber, pixel/JRPG dashboard variants, and full app navigation are removed from normal product runtime.
- Hermes bridge/client/sidecar/native communication paths are preserved where useful behind a simple `ChatProvider` or equivalent adapter for companion chat.
- The companion supports click-to-chat, drag positioning, persisted position/scale/visibility/settings, and animation states: `idle`, `talk`, `think`, `wave`.
- Companion data and appearance data follow `docs/v0-remake-prd.md`, including 4x4 sprite sheet support and preset/upload/generate placeholders where generation/upload is not fully implemented.
- Mock/local mode works without Hermes and is explicit, not silently confused with real Hermes.
- Tauri config supports the companion-first transparent window model.
- Visual implementation tracks `docs/design.png`: Hermes character is the dominant interface, desktop/background remains visible, controls are detached glass popovers, the palette is white/silver/lavender, and the UI avoids JRPG/pixel/dashboard styling.
- `bun run verify:web` passes.
- Native checks pass if Tauri/Rust files change.
- Manual checks confirm no full dashboard UI appears by default, popovers stay compact, text does not overlap, and desktop companion interactions work.

## Verification Commands

Required focused checks should be adjusted to match final file boundaries, but start with:

```bash
bun test src/App.pet.test.ts
bun test src/bridge/bridgeFactory.test.ts
bun run verify:web
```

If native files change:

```bash
cd src-tauri && cargo fmt --check
cd src-tauri && cargo check
```

Manual/browser checks should use the local dev server:

```bash
bun run dev -- --port 1425
```

Inspect:

- `http://127.0.0.1:1425/`
- `http://127.0.0.1:1425/?mode=pet`
- any explicit development/demo route added for popover states

Manual pass criteria:

- default route is companion-first, not dashboard-first
- no Guild Hall / Quest Board / Review navigation appears in normal runtime
- Hermes companion can be clicked, dragged, and chatted with
- speech bubble, input capsule, Companions popover, Appearance popover, and Settings popover are usable
- popovers remain compact and detached
- visual hierarchy and palette track `docs/design.png`
- text does not overlap controls at tested desktop and constrained widths
- explicit mock mode works without Hermes
- real Hermes mode uses Hermes bridge or reports a concrete unavailable state without silent mock fallback
