# Hermes Integration Plan

## Goal

Add a minimal real Hermes path without weakening the existing mock-first v0 loop.

## Approach

- Keep the UI-facing bridge snapshot contract stable.
- Move shared bridge API/config types out of `mockHermesBridge.ts`.
- Add bridge config loaded from local storage:
  - `bridgeMode`: `mock`, `real`, or `auto`
  - `hermesApiBaseUrl`: Hermes API server base URL, defaulting to `http://127.0.0.1:8642`
- Add a bridge factory:
  - `mock`: use `MockHermesBridge`
  - `real`: use `RealHermesBridge`
  - `auto`: check real Hermes health, use real when available, otherwise fall back to mock
- Implement the real bridge as a thin adapter:
  - create Guild task/timeline state locally
  - call `GET /health`, `POST /v1/runs`, and `GET /v1/runs/{run_id}/events`
  - do not send Guild profile mappings because `/v1/runs` does not expose a profile parameter
  - convert `run.completed` output into a Quest Report Card
  - surface API failures as task, pet, timeline, and system errors

## Non-Goals

- No Hermes WebUI parity.
- No skill, memory, gateway, Tavern, Infirmary, workspace browser, or multi-agent orchestration UI.
- No visual redesign.

## Verification

- Unit tests cover factory selection, auto fallback, real task completion, real errors, and config parsing.
- Existing mock bridge tests continue to pass.
- `bun run verify:web` remains the web verification gate.
