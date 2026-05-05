# Hermes Desktop Pet v0 PRD

## 1. Product Summary

Hermes Desktop Pet is a borderless floating desktop AI companion app.

The core experience is **not** a dashboard, not an agent management console, and not a productivity workspace. Hermes should feel like an elegant AI concierge living directly on the user's desktop.

The app lets users:

1. See one or more AI companions floating on the desktop.
2. Click a companion to chat through a lightweight speech/input overlay.
3. Choose which companions appear on the desktop.
4. Customize each companion's appearance, including preset, generated, or uploaded sprite/avatar assets.
5. Preview and use simple animation states such as idle, talk, think, and wave.

The main interface is the character itself. All controls should appear as small, detached, frameless floating popovers.

---

## 2. Product Direction

### 2.1 One-line Positioning

Hermes is an elegant borderless desktop AI companion that floats above your desktop, lets you chat anytime, and lets you customize who appears and how they look.

### 2.2 Product Principles

#### 1. Character first, app second

The character is the main interface. The user should not feel like they opened a large application window.

#### 2. Borderless by default

Hermes should appear directly on the desktop without a visible app frame, title bar, sidebar, or heavy chrome.

#### 3. Ambient by default, expandable on demand

The companion stays quiet and lightweight by default. UI only expands when the user clicks, summons, or configures something.

#### 4. Configuration serves presence

Configuration exists only to answer:

- Who appears on my desktop?
- What do they look like?
- How do they behave visually?

Do not build a complex agent management system in v0.

#### 5. Mature anime concierge, not cute mascot

Visual style should follow the chosen direction:

- elegant mature anime concierge
- young-adult assistant
- calm, premium, intelligent
- silver/lavender Hermes identity
- not chibi
- not childish
- not overly cute
- not JRPG
- not cyber dashboard by default

---

## 3. Target User Experience

### 3.1 First Launch Experience

When the user opens Hermes for the first time:

1. A default Hermes companion appears floating on the desktop.
2. The companion plays an idle animation.
3. A lightweight speech bubble appears:

   > Good afternoon.  
   > Shall I help you with something today?

4. A slim input bar appears near the companion or near the lower center of the desktop:

   > Ask Hermes anything...

5. The user can click the companion to focus the chat input.
6. The user can open a small Companions popover to choose who appears.
7. The user can open a small Appearance popover to change the selected companion's look.

### 3.2 Normal Usage

In daily use:

- Hermes floats on top of the desktop.
- The user can drag the companion to a preferred position.
- The app remembers the companion position.
- The user can click the companion to chat.
- The user can show or hide companions.
- The user can customize appearance.
- The user should never be forced into a full-screen or full-dashboard interface.

### 3.3 Main Mental Model

The user is not “managing agents.”  
The user is choosing who lives on the desktop.

Use language like:

- Companions
- Show on desktop
- Appearance
- Preset
- Generate
- Upload
- Sprite preview

Avoid language like:

- Agent management
- Workspace
- Project
- Workflow
- Task board
- Provider dashboard
- Tool registry
- Mission control

---

## 4. Scope

## 4.1 In Scope for v0

### Desktop Companion Runtime

- Render one or more borderless companions on the desktop.
- Support transparent / frameless window mode.
- Support always-on-top behavior.
- Support dragging companions.
- Remember companion positions.
- Support companion scale / size.
- Support idle animation.
- Support state-based animation switching:
  - idle
  - talk
  - think
  - wave
- Support companion click to open chat input.
- Support right-click or small control trigger for companion options.

### Lightweight Chat

- Floating speech bubble.
- Floating input bar.
- Send text prompt to configured AI backend or mock AI response in local mode.
- Show assistant response in speech bubble.
- Switch animation state while responding:
  - user sends message -> think
  - assistant response streaming or showing -> talk
  - idle timeout -> idle
- Keep chat history minimal in v0.

### Companions Popover

- List available companions.
- Show small portrait / thumbnail.
- Show companion name.
- Show status or visibility.
- Toggle show/hide on desktop.
- Add Companion entry can exist as a placeholder or simple flow.

### Appearance Popover

- Show selected companion portrait / preview.
- Edit display name.
- Toggle Show on Desktop.
- Adjust size.
- Choose appearance source:
  - Preset
  - Generate
  - Upload
- Show animation preview states:
  - Idle
  - Talk
  - Think
  - Wave
- Show sprite sheet preview.
- Allow user to apply selected appearance.

### Sprite System

- Support a standard sprite sheet format.
- Recommended v0 format:
  - 4 rows x 4 columns
  - 16 frames total
  - Row 1: idle
  - Row 2: talk
  - Row 3: think
  - Row 4: wave
- Each frame should have equal width and height.
- Character should be centered in each frame.
- Support transparent PNG/WebP if available.
- Support chroma-key source images if transparency is not available.

### Settings

Only app-level settings:

- Launch at startup
- Always on top
- Remember positions
- Allow dragging
- Show speech bubbles
- Quiet mode
- Optional: Click-through mode
- Optional: Low resource mode

Settings should appear in a small popover or compact panel, not a large dashboard.

---

## 4.2 Out of Scope for v0

Do not implement these in v0:

- Full dashboard shell
- Left sidebar app navigation
- Project / workspace model
- Complex agent configuration
- Tool management
- Workflow system
- Task board
- Mission board
- Review chamber
- Timeline
- Artifact center
- Agent marketplace
- Provider dashboard
- Large chat history page
- Complex permissions
- Multi-agent orchestration UI
- JRPG UI frames
- Pixel-art UI chrome
- Large settings app

These may be considered later only after the desktop companion experience feels good.

---

## 5. Visual Design Requirements

## 5.1 Chosen Visual Direction

Use the direction from “方案 3”:

- borderless floating desktop companion
- elegant anime concierge
- mature, calm, premium
- soft office / studio desktop feeling
- frameless glass popovers
- minimal overlay controls
- white / lavender / soft gray palette
- low visual noise

### Character Design

Default Hermes companion:

- Young-adult anime assistant
- Long silver or silver-lavender hair
- Calm violet eyes
- Subtle wing / feather ornament
- Refined white and lavender outfit
- Composed and helpful expression
- Elegant concierge / operator personality
- No chibi proportions
- No plush mascot feeling
- No exaggerated kawaii face

### UI Style

- Frameless floating overlays
- Rounded glass panels
- Soft shadows
- Subtle blur
- Pale lavender accent color
- Clean typography
- Minimal icons
- Desktop background remains visible

### Layout Rule

The app must never look like a full app dashboard by default.

Correct:

```text
[desktop wallpaper]
        [floating Hermes character]
   [speech bubble]
        [input capsule]
             [tiny popover]
```

Incorrect:

```text
[full application window]
[left sidebar] [main panel] [settings panel]
```

---

## 6. Core UI Components

## 6.1 Floating Companion

### Description

The companion is the primary interface element. It floats above the desktop without a visible app frame.

### Requirements

- Render as a frameless transparent window or equivalent overlay.
- Must support transparent background.
- Must support drag positioning.
- Must support click interaction.
- Must support right-click or long-press menu.
- Must support animation states.
- Must support always-on-top.
- Must persist position and size.

### States

#### Idle

Default state. Companion gently animates.

#### Think

When processing user input.

#### Talk

When showing response.

#### Wave

When first launched, summoned, or clicked after being idle.

#### Hidden

Companion is not shown on desktop but remains available in Companions popover.

---

## 6.2 Speech Bubble

### Description

A small bubble near the companion for short assistant messages.

### Requirements

- Frameless rounded bubble.
- Tail should point toward the companion.
- Should be repositioned to stay within screen bounds.
- Should support short messages.
- Should fade in/out smoothly.
- Should not become a full chat window.

### Example Copy

Initial greeting:

```text
Good afternoon.
Shall I help you with something today?
```

Processing:

```text
Let me check.
```

Response:

```text
I found something useful.
```

Error:

```text
I could not complete that.
```

---

## 6.3 Floating Input Bar

### Description

A slim input capsule for chatting with Hermes.

### Requirements

- Appears when companion is clicked or summoned.
- Can be placed near companion or near bottom center.
- Placeholder:

```text
Ask Hermes anything...
```

- Supports text input.
- Supports Enter to send.
- Optional: microphone icon placeholder.
- Optional: summon shortcut hint.
- Should auto-hide after inactivity if empty.

### Behavior

1. User clicks companion.
2. Input bar appears and focuses.
3. User types message.
4. User presses Enter.
5. Input clears.
6. Companion switches to think animation.
7. Response appears in speech bubble.
8. Companion switches to talk animation.
9. After timeout, companion returns to idle.

---

## 6.4 Companions Popover

### Description

A small floating popover for choosing who appears on the desktop.

### Requirements

- Small detached overlay.
- No full app frame.
- No sidebar.
- Shows list of companions.
- Each row/card includes:
  - thumbnail
  - name
  - status or visibility indicator
  - eye toggle or switch
- Include Add Companion entry.

### Example UI Content

```text
Companions

Hermes    Visible
Lyra      Idle
Ori       Away

+ Add Companion
```

### Actions

- Toggle companion visibility.
- Select companion to edit appearance.
- Add new companion.

---

## 6.5 Appearance Popover

### Description

A small floating panel for customizing selected companion appearance.

### Requirements

Fields:

- Portrait preview
- Name field
- Show on Desktop toggle
- Size slider
- Preset / Generate / Upload tabs
- Animation preview
- Sprite sheet preview

### Example Structure

```text
Appearance

[portrait]
Name: Hermes
Show on Desktop: On
Size: 100%

[Preset] [Generate] [Upload]

Sprite Sheet
Idle (16)
[grid preview]
```

### Important Constraint

This panel should stay compact. It should not become a full character editor.

---

## 6.6 Settings Popover

### Description

App-level settings only.

### Requirements

Settings:

- Launch at startup
- Always on top
- Remember positions
- Allow dragging
- Show speech bubbles
- Quiet mode
- Click-through mode
- Low resource mode

Avoid agent or provider complexity in v0.

---

## 7. Companion Data Model

Use a simple local data model first. The implementation can later sync to cloud.

```ts
export type CompanionStatus = "idle" | "thinking" | "talking" | "away" | "hidden";

export type AnimationState = "idle" | "talk" | "think" | "wave";

export interface Companion {
  id: string;
  name: string;
  description?: string;
  visible: boolean;
  status: CompanionStatus;
  appearanceId: string;
  position: {
    x: number;
    y: number;
  };
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
```

For v0, `agent` can be optional or mocked.

---

## 8. Appearance Data Model

```ts
export type AppearanceSource = "preset" | "generated" | "uploaded";

export interface CompanionAppearance {
  id: string;
  name: string;
  source: AppearanceSource;
  thumbnailUrl: string;
  spriteSheetUrl: string;
  frameWidth: number;
  frameHeight: number;
  rows: {
    idle: number;
    talk: number;
    think: number;
    wave: number;
  };
  framesPerRow: number;
  fps: {
    idle: number;
    talk: number;
    think: number;
    wave: number;
  };
  background?: {
    type: "transparent" | "chroma";
    chromaKey?: string;
  };
}
```

Default v0 values:

```json
{
  "frameWidth": 512,
  "frameHeight": 512,
  "framesPerRow": 4,
  "rows": {
    "idle": 0,
    "talk": 1,
    "think": 2,
    "wave": 3
  },
  "fps": {
    "idle": 6,
    "talk": 8,
    "think": 6,
    "wave": 8
  }
}
```

---

## 9. App Settings Data Model

```ts
export interface AppSettings {
  launchAtStartup: boolean;
  alwaysOnTop: boolean;
  rememberPositions: boolean;
  allowDragging: boolean;
  showSpeechBubbles: boolean;
  quietMode: boolean;
  clickThrough: boolean;
  lowResourceMode: boolean;
  theme: "light" | "dark" | "system";
}
```

---

## 10. Sprite Sheet Specification

## 10.1 Standard Format

For v0, every generated or uploaded sprite sheet should be normalized into this format:

```text
4 rows x 4 columns
16 total frames
```

Rows:

```text
Row 0: idle
Row 1: talk
Row 2: think
Row 3: wave
```

Columns:

```text
Frame 0
Frame 1
Frame 2
Frame 3
```

### Requirements

- All frames equal size.
- Character centered in each frame.
- Same scale across frames.
- Same baseline across frames.
- Transparent background preferred.
- If transparent is unavailable, use chroma key.
- Recommended chroma key: `#FF00FF`.

---

## 10.2 GPT Image Generation Prompt Template

Use this prompt when generating a companion sprite sheet:

```text
Create a production-ready sprite sheet for a borderless desktop AI companion named Hermes.

Character style:
- elegant mature anime concierge
- young adult assistant, not chibi, not childlike
- long silver-lavender hair
- calm violet eyes
- subtle wing / feather hair ornament
- refined white and lavender outfit
- premium, composed, intelligent, helpful
- desktop companion character

Output requirements:
- one sprite sheet only
- 4 rows x 4 columns
- 16 frames total
- each frame same size
- character centered in each frame
- same scale in every frame
- same baseline in every frame
- clean silhouette
- no text inside the image
- no UI mockup
- no background scene
- flat pure magenta background #FF00FF for chroma key removal

Rows:
Row 1: idle animation, subtle breathing and calm expression
Row 2: talk animation, natural speaking expressions
Row 3: think animation, thoughtful expression and small hand gesture
Row 4: wave animation, gentle greeting wave

Style:
- clean 2D anime illustration
- crisp linework
- soft shading
- light lavender / white / silver palette
- suitable for desktop pet animation
```

---

## 11. Interaction Design

## 11.1 Click Companion

Trigger:

- User left-clicks visible companion.

Expected behavior:

1. Play wave animation briefly if idle.
2. Show/focus input bar.
3. Optionally show greeting speech bubble if no recent interaction.

---

## 11.2 Drag Companion

Trigger:

- User drags companion.

Expected behavior:

1. Companion follows cursor.
2. Speech bubble/input follows or temporarily hides.
3. On release, save new position.
4. If position is near edge, optionally snap softly.

---

## 11.3 Right-click Companion

Trigger:

- User right-clicks companion.

Expected menu:

```text
Chat
Appearance
Companions
Hide Hermes
Settings
Quit Hermes
```

Keep menu minimal.

---

## 11.4 Send Message

Trigger:

- User types message and presses Enter.

Expected behavior:

1. Input clears.
2. Companion state becomes `thinking`.
3. Show thinking speech bubble if response takes more than 500ms.
4. Send message to backend or mock handler.
5. On response, companion state becomes `talking`.
6. Show response in speech bubble.
7. After timeout, state becomes `idle`.

---

## 11.5 Toggle Companion Visibility

Trigger:

- User toggles visibility in Companions popover.

Expected behavior:

- If enabled: companion appears at last saved position or default position.
- If disabled: companion disappears from desktop but remains in list.

---

## 11.6 Change Appearance

Trigger:

- User selects preset, generated, or uploaded appearance.

Expected behavior:

1. Preview updates.
2. Sprite preview updates.
3. User applies appearance.
4. Companion on desktop updates immediately.

---

## 12. Technical Requirements

## 12.1 Desktop Runtime

The app should support:

- Transparent frameless window.
- Always-on-top window.
- Drag regions or custom drag behavior.
- Multiple companion windows or one overlay window with multiple companions.
- Local persistence.

Recommended implementation options:

- Tauri
- Electron
- Native Swift / AppKit for macOS
- Native Windows app

If using web technologies, prefer:

- React for UI
- Canvas or DOM-based sprite rendering
- Local storage / file config for persistence

---

## 12.2 Window Model

Preferred model:

### One transparent overlay window

- Full-screen transparent window on top of desktop.
- Render all companions and popovers inside it.
- Easier to coordinate positions, bubbles, and input.

Alternative:

### Multiple transparent windows

- One window per companion.
- Separate windows for popovers.
- More native but more complex.

For v0, prefer one transparent overlay window unless platform limitations make it difficult.

---

## 12.3 Persistence

Persist locally:

- companions
- appearances
- positions
- scale
- visibility
- settings
- last selected companion

Example local config path:

```text
~/.hermes-desktop/config.json
~/.hermes-desktop/appearances/
~/.hermes-desktop/sprites/
```

---

## 12.4 Mock Mode

The app should run without a real AI backend.

Mock response behavior:

- User sends message.
- Companion thinks for 500–1200ms.
- Show a canned response.

Example responses:

```text
I'm here.
What would you like to work on?
```

```text
Got it. I can help with that.
```

```text
I can stay on your desktop while you work.
```

This allows UI implementation before backend integration.

---

## 13. AI Backend Integration

For v0, backend integration should be optional.

### Simple Interface

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

### Provider Modes

- mock
- local API
- OpenAI-compatible endpoint
- Hermes agent endpoint later

Do not expose complex provider setup in the main UI. Keep it behind advanced settings or environment config.

---

## 14. File / Asset Handling

## 14.1 Preset Appearance

Bundle at least one default Hermes preset.

Optional additional presets:

- Hermes Light
- Hermes Dark
- Hermes Operator

## 14.2 Upload Flow

User can upload:

- PNG sprite sheet
- WebP sprite sheet
- static avatar image, then convert later

For v0, if user uploads a static image, use it as a static companion or require sprite sheet format.

## 14.3 Generated Flow

For v0, image generation can be mocked.

Generate tab may include:

- prompt input
- style preset selector
- generate button
- result preview

If real generation is not implemented yet, show disabled state or mock result.

---

## 15. Animation Engine

### Requirements

- Load sprite sheet image.
- Slice by frameWidth and frameHeight.
- Play frames based on current state.
- Loop idle, talk, think.
- Play wave once, then return to idle.
- Allow per-state FPS.

### State Mapping

```ts
const animationRows = {
  idle: 0,
  talk: 1,
  think: 2,
  wave: 3
};
```

### Render Options

- DOM `<img>` with CSS background-position
- Canvas drawImage
- WebGL optional, not needed for v0

Prefer simple, stable implementation.

---

## 16. Accessibility and Usability

- Popovers should stay within screen bounds.
- Input should be keyboard accessible.
- Escape closes active popover/input.
- Enter sends message.
- Companion should not permanently block important desktop areas.
- Provide quick hide option.
- Provide restore/summon shortcut.
- Quiet mode disables unsolicited speech bubbles.
- Low resource mode reduces animation FPS.

---

## 17. Default Content

## 17.1 Default Companion

```json
{
  "id": "hermes",
  "name": "Hermes",
  "description": "Your digital concierge",
  "visible": true,
  "status": "idle",
  "scale": 1.0
}
```

## 17.2 Additional Sample Companions

```json
[
  {
    "id": "lyra",
    "name": "Lyra",
    "description": "Planning companion",
    "visible": false
  },
  {
    "id": "ori",
    "name": "Ori",
    "description": "Research companion",
    "visible": false
  }
]
```

---

## 18. Main Screens / States to Implement

### State 1: Desktop Idle

- Hermes visible.
- Idle animation playing.
- No heavy UI.
- Optional speech bubble.

### State 2: Chat Focus

- Hermes visible.
- Input bar visible and focused.
- Speech bubble visible if greeting or response exists.

### State 3: Thinking

- Input submitted.
- Think animation playing.
- Optional bubble: “Let me check.”

### State 4: Talking

- Response visible in bubble.
- Talk animation playing.

### State 5: Companions Popover

- Small list of companions.
- Visibility toggles.
- Add Companion entry.

### State 6: Appearance Popover

- Selected companion preview.
- Appearance controls.
- Sprite sheet preview.

### State 7: Settings Popover

- App-level toggles only.

---

## 19. Acceptance Criteria

## 19.1 Product Acceptance

The implementation is acceptable if:

- Hermes appears as a borderless floating desktop companion.
- The app does not look like a full dashboard by default.
- User can click Hermes and chat.
- Hermes changes animation state during interaction.
- User can drag Hermes and position persists.
- User can show/hide companions.
- User can open a compact Appearance popover.
- User can adjust companion size.
- User can preview sprite sheet frames.
- User can switch between preset/generated/upload tabs, even if generation is mocked.
- Settings remain compact and app-level.

## 19.2 Visual Acceptance

The implementation is acceptable if:

- UI is frameless / floating / overlay-like.
- Character is the visual focus.
- Desktop background remains visible.
- Popovers are small and detached.
- No sidebar appears in default experience.
- No large dashboard appears in default experience.
- Visual style feels mature and elegant, not overly cute.

## 19.3 Technical Acceptance

The implementation is acceptable if:

- App state persists after restart.
- Companion visibility persists.
- Position and size persist.
- Sprite animation runs smoothly.
- App can run in mock mode with no backend.
- App can be quit and relaunched cleanly.

---

## 20. Suggested Implementation Plan for AI Agent

### Phase 1: Static Prototype

Implement:

- desktop overlay layout
- Hermes character placeholder
- speech bubble
- input bar
- companions popover
- appearance popover
- settings popover

Use mock data only.

### Phase 2: Companion Runtime

Implement:

- transparent frameless window
- always-on-top
- dragging
- position persistence
- show/hide companion
- scale adjustment

### Phase 3: Sprite Animation

Implement:

- sprite sheet loading
- 4x4 slicing
- idle/talk/think/wave playback
- state switching

### Phase 4: Chat Mock

Implement:

- input send
- mock response
- state transition: think -> talk -> idle
- speech bubble response display

### Phase 5: Appearance Management

Implement:

- preset selection
- upload sprite sheet
- preview sprite sheet
- apply appearance
- persist appearance

### Phase 6: Optional AI Integration

Implement:

- simple chat provider interface
- mock provider default
- OpenAI-compatible provider optional
- keep provider settings hidden in advanced settings

---

## 21. Non-Goals Reminder for Agent

When implementing, do not add these unless explicitly requested:

- dashboards
- sidebars
- workspace/project concepts
- workflow/task system
- complex agent management
- marketplace
- provider setup screens
- large chat windows
- JRPG styling
- chibi mascot direction

If unsure, choose the lighter, more desktop-native solution.

The final product should feel like:

> Hermes quietly lives on the desktop. When needed, it expands into tiny floating controls.

Not like:

> Hermes is another productivity app with a character skin.

