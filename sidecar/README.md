# Hermes Guild Sidecar

This is the initial local Python sidecar for Hermes Guild compatibility probes. It is not the preferred task execution path.

## Source Precedence

Hermes Guild should resolve real data in this order:

1. Public official Hermes REST API
2. Hermes CLI
3. Safe local Hermes state
4. Python sidecar compatibility probes
5. Guild-owned workflow state
6. Explicit unavailable state

Mock data is test-only. It is useful for unit tests, development fixtures, and explicit harnesses, but it is not a normal runtime source or fallback.

The sidecar exists to expose safe local summaries and capability checks from a loopback-only service. Gateway REST `/v1/runs` remains the default Pet and Quest message path.

## Endpoints

- `GET /health`: sidecar health, Hermes Python importability, optional CLI/public REST/local-state availability.
- `GET /version`: sidecar version plus Hermes CLI/import/gateway version signals when available.
- `GET /capabilities`: supported surface map and source precedence.
- `GET /profiles`: profile metadata discovered from local Hermes state when present.
- `GET /active-profile`: active local profile when present, otherwise `Profile unavailable`.
- `GET /local-state/summary`: bounded, redacted summaries for profiles, sessions, logs, config, env, cron, skills, and toolsets.
- `POST /runs`, `GET /runs/{id}`, `GET /runs/{id}/events`, `POST /runs/{id}/stop`: structured `unsupported` responses because Gateway REST is preferred for execution.

## Run

```bash
python3 sidecar/hermes_guild_sidecar.py --host 127.0.0.1 --port 8765
```

The service refuses non-loopback hosts such as `0.0.0.0`.

## Verify

```bash
python3 -m unittest discover sidecar/tests
python3 sidecar/hermes_guild_sidecar.py --self-test
```

The sidecar uses Python stdlib only and must not expose secret values. Environment summaries list configured key names only.
