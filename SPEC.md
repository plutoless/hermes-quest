# SPEC: Wire Real Hermes Profiles, Companion Windows, and Profile-Routed Chat

## Goal

Wire Hermes Guild Pet Mode so real Hermes profiles appear as selectable companions, each selected companion can have its own native pet/chat window experience, and messages sent to a companion route to that companion's Hermes profile end to end.

The feature must work in the native Tauri app, not only in a browser mock route.

## User-Visible Behavior

1. The Companions dialog shows real Hermes profiles when Hermes profile metadata is available.
   - In real/auto-real mode, the list should come from the bridge snapshot's real profile/agent data.
   - The user should see actual Hermes profile names instead of hard-coded Hermes/Astra/Orion placeholders when real profile metadata is available.
   - If real profiles are unavailable, the UI must show a concrete unavailable/error state or source message, not silently pretend mock profiles are real.

2. Choosing companions controls visible native companion windows.
   - A selected/visible companion should correspond to a profile-specific pet/chat surface.
   - Multiple visible companions should result in multiple native windows or clearly profile-distinct pet windows, depending on the existing Tauri architecture.
   - Hiding a companion should close or hide that companion's native pet window without deleting the underlying profile.
   - Switching or toggling companions must preserve per-profile identity and not collapse all windows into one active profile by accident.

3. Talking to different companions routes messages to the correct Hermes profile.
   - Chat sent from companion A must create/send work with companion A's profile id/name.
   - Chat sent from companion B must create/send work with companion B's profile id/name.
   - Route evidence must be preserved in task/profile context where the bridge already supports it.
   - Do not use `hermes profile use` or mutate a global sticky Hermes profile to route a single message.

## Architecture Notes

- The Hermes Bridge API is the source boundary for profile identity and routing state.
- Real profile discovery already has relevant code in `src/bridge/realHermesBridge.ts`, `src/bridge/bridgeFactory.ts`, `src/bridge/hermesApiClient.ts`, `src/bridge/hermesProfileClient.ts`, and `src/bridge/hermesProfileRunClient.ts`.
- `src/App.tsx` currently owns companion runtime state, selected companion, quick chat, drawer chat, and panel windows.
- `src/hooks/useBridgeSnapshot.ts` provides bridge snapshots to React.
- Tauri/native window behavior is likely in `src/main.tsx`, `src/App.tsx`, and `src-tauri/` commands/config. Inspect before deciding the exact window strategy.
- The product should still respect Hermes Guild v0 constraints, but this request intentionally extends Pet Mode toward multiple profile-specific companion windows.

## Scope

### In Scope

- Replace or hydrate the Companions dialog roster from real Hermes bridge agents/profiles when available.
- Preserve companion appearance/visibility settings while binding each companion to a real profile identity.
- Add or adjust native window management so visible/selected companions can show multiple profile-specific pet/chat windows.
- Ensure chat submission includes the correct companion/profile identity all the way into bridge task creation or Hermes run routing.
- Add focused tests for profile discovery-to-companion mapping and per-profile message routing.
- Add native/manual verification steps for multiple windows and routing evidence.

### Out of Scope

- Reworking the whole Guild Hall dashboard.
- Adding Tavern, Skill Deck, Infirmary, Archive, XP, loot, party chat, voice, or unrelated RPG systems.
- Patching Hermes source code to add profile APIs.
- Calling `hermes profile use` for per-message routing.
- Silently falling back to mock runtime profiles in real mode.
- Designing a new visual system for these windows beyond small UI states needed for unavailable/source evidence.

## Relevant Files And Discovery

Start with:

- `src/App.tsx`
- `src/types.ts`
- `src/hooks/useBridgeSnapshot.ts`
- `src/bridge/types.ts`
- `src/bridge/realHermesBridge.ts`
- `src/bridge/mockHermesBridge.ts`
- `src/bridge/bridgeFactory.ts`
- `src/bridge/hermesApiClient.ts`
- `src/bridge/hermesProfileClient.ts`
- `src/bridge/hermesProfileRunClient.ts`
- `src/App.pet.test.ts`
- `src/bridge/bridgeFactory.test.ts`
- `src/bridge/hermesProfileClient.test.ts`
- `src/bridge/hermesProfileRunClient.test.ts`
- `src-tauri/`
- `docs/API_CONTRACT.md`
- `docs/HERMES_CAPABILITY_MATRIX.md`
- `docs/DESIGN.md`
- `package.json`

Useful commands:

- `rg -n "CompanionsPopover|selectedCompanion|createCompanionChatProvider|handleSubmit|showPanelWindow|PanelWindowShell" src/App.tsx`
- `rg -n "HermesBridgeApi|Agent|Task|profileContext|setActiveProfile|createTask" src src/bridge docs/API_CONTRACT.md`
- `rg -n "window|WebviewWindow|tauri|panel=|label" src src-tauri`
- `rg -n "profileRouting|HermesProfile|hermes_profile_run|/v1/profiles" src/bridge src-tauri docs`

## Edge Cases

- Hermes may expose one profile, many profiles, or no profile metadata.
- Hermes may expose profile list but not selected-profile routing; UI should still show profile identity and surface routing unavailable when sending cannot be profile-scoped.
- Public REST profile routing may be supported; sidecar or native CLI selected-profile routing may be needed when REST does not advertise routing.
- Existing local storage can contain old placeholder companion ids and appearance state; migration must not break startup.
- A visible companion window may be closed externally by the OS; app state should not permanently desynchronize.
- Multiple windows must not share one mutable `selectedCompanionId` in a way that routes all messages to whichever profile was clicked last.
- Existing task/report profile context must remain stable after switching companion/profile.

## Verification

Automated:

- `bun run lint`
- `bun run test`
- Add/adjust tests so they explicitly cover:
  - real bridge agents/profiles are converted into companion rows,
  - selecting/toggling companions preserves profile identity,
  - sending chat for two different companions calls bridge/Hermes routing with different profile ids/names,
  - unsupported routing does not send unsupported REST profile fields and surfaces unavailable state.

Native/manual:

- Start or build the native app through the repo's existing Tauri workflow.
- With real Hermes profile metadata available, open Companions and confirm real profile names appear.
- Select/show at least two real profiles and confirm distinct native pet/chat windows appear or are clearly profile-specific.
- Send one message to profile A and one message to profile B.
- Confirm route evidence in UI/logs/tasks shows profile A's message used profile A and profile B's message used profile B.
- Confirm no `hermes profile use` is called.

## Done When

- The Companions dialog displays real Hermes profiles from bridge/real profile metadata when available, with clear unavailable/source messaging when not available.
- Multiple selected/visible companions produce multiple native profile-specific pet/chat windows or equivalent distinct native windows tied to the chosen companions.
- Sending chat from different companion windows routes each message to that companion's profile, with profile id/name preserved in task/profile context or Hermes run routing evidence.
- Existing mock/dev behavior still works for tests and explicit mock mode, but real mode does not silently present mock profiles as real.
- Tests cover profile-to-companion mapping, multi-companion identity preservation, and per-profile chat routing.
- `bun run lint` passes.
- `bun run test` passes.
- Native manual verification confirms real profiles in Companions, multiple profile-specific windows, and correct route evidence for at least two profiles.
