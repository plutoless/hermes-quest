<goal>
Refine Hermes Guild Pet Mode so the pet character remains the main visual anchor and the expanded chat becomes a lightweight transparent speech-bubble overlay instead of a heavy parchment panel, mini chat app, or mini dashboard.
</goal>

<context>
Read these files first:
- `SPEC.md`
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

Use these discovery commands as needed:
```bash
rg "PetPanel|pet-chat|pet-message|pet-handoff|pet-window|createPetQuest" src
rg "mode=pet|show_hall_window|show_pet_window|tray|WindowEvent" src src-tauri
```
</context>

<constraints>
- Work on Pet Mode only.
- Do not redesign Guild Hall, Quest Board, Review Chamber, or the Pixel UI Kit broadly.
- Do not regenerate or redesign character/avatar identity.
- Preserve transparent character-first collapsed Pet Mode.
- Preserve the current pet character as the main visual anchor.
- Opening chat must not push, shift, resize, or recenter the pet character.
- Expanded Pet chat must not look like a mini chat app, mini dashboard, status card, form panel, report card, or reduced Guild Hall.
- Remove the heavy parchment panel background around the whole floating chat area.
- Chat should appear as a lightweight transparent speech bubble / overlay.
- Input should be lightweight and overlay-style, not embedded in a large panel.
- Review / Open / Progress / Issue actions should be small chips or lightweight action buttons, not big block buttons.
- Preserve current message bubble behavior after Send.
- Quick-chat Send must not automatically open Guild Hall or Quest Board.
- Keep Pet chat lightweight: latest few bubbles only, not persistent long-term chat history.
- Show Hermes/bridge output excerpts when available; do not regress to only generic status labels.
- Keep raw bridge errors, stack traces, and long diagnostics out of Pet Mode.
- Preserve existing pet task submit behavior, active profile routing, RealHermes bridge, mock/real/auto modes, Hall/Pet native switching, and approve/revise flow.
- Preserve unrelated user changes.
</constraints>

<done_when>
- `/?mode=pet&variant=skyship-command-deck` still shows character-first transparent Pet Mode.
- Clicking the pet opens chat without moving, pushing, resizing, or recentering the character.
- Expanded chat no longer has a heavy parchment panel around the whole floating area.
- Chat appears as lightweight speech bubble / transparent overlay UI.
- The floating UI does not look like a mini chat app, mini dashboard, status card, or form panel.
- Input appears as a lightweight overlay command control.
- Review / Open / Progress / Issue actions are small chips or lightweight buttons, not big block buttons.
- User and Hermes/agent message bubbles remain distinct.
- Sending a message appends the user's submitted message as a user bubble.
- Send stays in Pet Mode and does not automatically open Hall or Quest Board.
- Hermes/agent response bubble still appears after Send.
- Final output/report excerpt still appears when available.
- Explicit handoff actions still open Hall / Progress / Review / Issue.
- Current Guild Hall, Quest Board, and Review Chamber UI are not broadly redesigned.
- Character identity and AvatarFrame alignment are unchanged.
- RealHermes bridge, mock/real/auto modes, submit flow, and approve/revise flow remain intact.
- `docs/EXECUTION_LOG.md` records implementation changes, screenshots/manual checks, validation commands, and remaining gaps.
- `bun run verify:web`, `cargo fmt --check`, and `cargo check` pass, or failures are fixed or documented with exact cause.
</done_when>

<workflow>
1. Check `git status --short` and preserve unrelated changes.
2. Read the context files and identify the current PetPanel markup, Pet chat CSS, Send behavior, handoff actions, and native Hall/Pet lifecycle code.
3. Audit the expanded Pet chat surface for wrappers, backgrounds, borders, shadows, and button treatments that make it feel like a heavy parchment panel or mini app.
4. Refine the expanded Pet surface:
   - keep the character anchored as the dominant visual element
   - remove or soften the whole-area parchment panel treatment
   - use transparent or near-transparent speech-bubble layering
   - keep individual message bubbles readable and distinct
5. Refine the input:
   - make it a compact overlay command control
   - keep focus and Send affordance clear
   - avoid large form-panel treatment
6. Refine handoff actions:
   - convert Review / Open / Progress / Issue actions into small chips or lightweight buttons
   - keep deep workflows as explicit handoffs to the main app
7. Preserve existing Pet chat behavior:
   - user bubble after Send
   - Hermes/agent acknowledgement and response bubbles
   - final output/report excerpts when available
   - no automatic Hall/Quest Board open after Send
8. Verify browser screenshots for collapsed, opened overlay, post-send, and completed/report-output states.
9. Verify native Pet/Hall lifecycle where feasible.
10. Run automated validation.
11. Update `docs/EXECUTION_LOG.md` with changes, evidence, commands, and any remaining gaps.
12. Do a final completion audit against every `done_when` item before calling the task complete.
</workflow>

<verification_loop>
Run focused checks while developing:
```bash
bun run lint
```

Run full validation before completion:
```bash
bun run verify:web
cd src-tauri && cargo fmt --check
cd src-tauri && cargo check
```

Manual/browser checks:
- `/?mode=pet&variant=skyship-command-deck` for collapsed Pet Mode.
- `/?mode=pet&variant=skyship-command-deck&pet=expanded` for opened overlay.
- Post-send state showing user bubble plus Hermes/agent response bubble.
- Completed/report state showing useful output excerpt.

Native checks where feasible:
- native launch shows only the transparent pet floating window.
- opening Hall hides Pet.
- minimizing or closing/hiding Hall shows Pet again.
- expanded chat overlay remains lightweight on the native transparent window.

Do not treat passing tests alone as sufficient; verify the user-visible Pet overlay quality directly.
</verification_loop>

<execution_rules>
- Check git status before edits.
- Preserve unrelated user changes.
- Prefer `rg` over `grep` when available.
- Use the runtime's patch/edit tool for manual edits when available.
- Read context files before implementation.
- Batch independent file reads in parallel when the runtime supports it.
- Run focused tests before broad tests.
- Do not paper over failures.
- Do not widen scope.
- Keep the final answer concise.
</execution_rules>

<output_contract>
Final response should include:
- files changed
- concise summary of Pet overlay visual behavior
- screenshots/manual validation evidence
- automated validation commands and results
- any remaining gaps

The task is complete only after every `done_when` item has concrete evidence.
</output_contract>
