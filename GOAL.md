<goal>
Fix real-mode Pet Mode so the companion name reflects the real Hermes profile identity path, and Pet chat bubbles show actual Hermes-returned output or concise errors instead of bridge-authored lifecycle narration such as "Started Hermes API run."
</goal>

<context>
Read these files first:
- `SPEC.md`
- `docs/superpowers/plans/2026-05-05-real-hermes-pet-profile-output.md`
- `AGENTS.md`
- `src/App.tsx`
- `src/types.ts`
- `src/bridge/types.ts`
- `src/bridge/bridgeFactory.ts`
- `src/bridge/bridgeFactory.test.ts`
- `src/bridge/hermesApiClient.ts`
- `src/bridge/hermesApiClient.test.ts`
- `src/bridge/realHermesBridge.ts`
- `docs/API_CONTRACT.md`
- `docs/EXECUTION_LOG.md`
- `package.json`

Current local Hermes API probe from 2026-05-05:
```text
GET /health -> {"status":"ok","platform":"hermes-agent"}
GET /v1/profile -> 404
GET /v1/profiles -> 404
GET /v1/agents -> 404
```

Use these discovery commands as needed:
```bash
rg "Hermes Builder|Started Hermes API run|Hermes API streamed|Hermes API run completed|realProfileName" src docs README.md
rg "getPetAgentResponse|latestUsefulEvent|BridgeConfig|healthFromHttpResponse|RealHermesBridge" src
```
</context>

<constraints>
- Work only on real profile naming, bridge config, real Hermes output grounding, tests, and docs.
- Do not redesign Pet Mode visuals, Guild Hall, Quest Board, Review Chamber, or the Pixel UI Kit.
- Do not rename mock profiles or alter mock lifecycle behavior unless required by shared type compatibility.
- Do not add unsupported profile routing fields to `/v1/runs`; current API does not expose a profile parameter.
- Do not invent or require new Hermes API endpoints.
- The real-mode fallback companion label must be explicit: use `Profile unavailable`, not `Hermes Builder` or `Hermes profile`.
- Real profile name source priority is: optional Hermes API profile metadata only, then `Profile unavailable`.
- Legacy/manual `realProfileName` config must be ignored for identity.
- Pet Mode chat bubbles must not present Guild/bridge lifecycle labels as Hermes speech.
- Pet Mode chat must not add greeting, sending, accepted, report-ready, or `Returned output:` wrapper text.
- Task detail timelines may keep useful Guild-owned lifecycle records, but Pet-visible messages must be filtered.
- Preserve existing Pet submit behavior, active profile routing, RealHermes bridge, mock/real/auto modes, Hall/Pet native switching, and approve/revise flow.
- Preserve unrelated user changes already present in the worktree.
</constraints>

<done_when>
- Hermes health parsing accepts optional profile metadata if a future `/health` response exposes it.
- `BridgeConfig` does not use `realProfileName` as a profile-name source.
- Bridge settings do not expose a manual real profile name field.
- Real mode can use API profile metadata when metadata exists.
- Real mode falls back to `Profile unavailable`, not `Hermes Builder` or `Hermes profile`, when API profile metadata is absent.
- Pet input starts empty and focuses when expanded.
- Pet Mode no longer shows `Started Hermes API run.`, `Hermes API streamed response text.`, `Hermes API run completed.`, or artifact-capture narration as agent bubbles.
- Pet Mode no longer shows greeting, sending, accepted, report-ready, or `Returned output:` wrapper bubbles.
- Pet Mode still shows actual Hermes returned output after a real run completes.
- Pet Mode still shows concise real Hermes error text when a real run fails.
- Mock mode profile names and lifecycle behavior remain intact.
- Auto fallback behavior remains intact.
- `docs/API_CONTRACT.md` documents pet-visible message selection and real profile naming.
- `docs/EXECUTION_LOG.md` records implementation changes, validation evidence, manual checks, and remaining Hermes API metadata gaps.
- `bun test src/bridge/hermesApiClient.test.ts`, `bun test src/bridge/bridgeFactory.test.ts`, and `bun run verify:web` pass.
- `cargo fmt --check` and `cargo check` pass where native prerequisites are available, or exact blockers are documented.
</done_when>

<workflow>
1. Check `git status --short` and preserve unrelated changes.
2. Read the context files and the implementation plan.
3. Add failing tests for:
   - stripping/ignoring legacy `realProfileName`
   - optional Hermes health profile metadata parsing
   - real-mode API profile naming
   - real-mode fallback label not using `Hermes Builder` or `Hermes profile`
   - real task output not containing synthetic run narration in pet-visible output paths
4. Remove/ignore `BridgeConfig.realProfileName` as a profile identity source.
5. Remove the manual `Real profile name` field from bridge settings.
6. Parse optional profile metadata from Hermes health responses defensively.
7. Update `RealHermesBridge` so the real active agent uses API profile identity and explicit missing-state fallback naming.
8. Remove or avoid synthetic real Hermes timeline messages that are likely to become pet-visible speech.
9. Update Pet Mode response selection so only meaningful Hermes-returned text, report output, or concise errors become agent bubbles.
10. Run focused tests and fix failures.
11. Update `docs/API_CONTRACT.md` and `docs/EXECUTION_LOG.md`.
12. Run full web validation and native checks where available.
13. Manually verify real-mode Pet Mode with a running Hermes API server and API-provided or missing profile metadata.
14. Do a final completion audit against every `done_when` item before calling the task complete.
</workflow>

<verification_loop>
Run focused checks while developing:
```bash
bun test src/bridge/hermesApiClient.test.ts
bun test src/bridge/bridgeFactory.test.ts
bun run lint
```

Run full validation before completion:
```bash
bun run verify:web
cd src-tauri && cargo fmt --check
cd src-tauri && cargo check
```

Manual/browser checks:
- Start or confirm a Hermes API server at the configured base URL.
- Open `/?mode=pet&variant=skyship-command-deck&pet=expanded`.
- Set bridge mode to `real` and save.
- Confirm Pet Mode speaker labels use API profile metadata when present, or `Profile unavailable` when absent.
- Confirm Pet quick chat starts empty and focused when expanded.
- Send a Pet Mode message and confirm the agent bubble shows raw Hermes output or a concise real error.
- Confirm the pet does not show `Started Hermes API run.`, `Hermes API streamed response text.`, `Hermes API run completed.`, or artifact-capture narration.

If native prerequisites are unavailable, document exact `cargo fmt --check` or `cargo check` blockers in `docs/EXECUTION_LOG.md`.
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
- concise summary of real profile naming behavior
- concise summary of Pet Mode output filtering behavior
- focused and full validation command results
- manual real-mode Pet Mode check result or exact reason it could not be completed
- any remaining Hermes API metadata gaps

The task is complete only after every `done_when` item has concrete evidence or an exact documented blocker.
</output_contract>
