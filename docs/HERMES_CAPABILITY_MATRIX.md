# Hermes Capability Matrix

This matrix is the working source map for replacing Hermes Guild mock data with real Hermes Agent data. It separates stable Gateway REST facts, Guild-local replicated dashboard logic, optional dashboard compatibility, Guild-owned workflow state, mock fallback, and unavailable surfaces.

Official sources checked:
- API server docs: `https://hermes-agent.nousresearch.com/docs/user-guide/features/api-server`
- Web dashboard docs: `https://hermes-agent.nousresearch.com/docs/user-guide/features/web-dashboard`
- Official repo: `https://github.com/NousResearch/hermes-agent`
- Dashboard docs path: `website/docs/user-guide/features/web-dashboard.md`

## Source Labels

| Label | Meaning |
| --- | --- |
| Gateway REST | Hermes API server, default `http://127.0.0.1:8642` |
| Local Hermes state | Guild/Tauri bridge logic that reads the same local Hermes files or runtime state the official dashboard backend reads |
| Dashboard compatibility | Optional Hermes dashboard backend calls, default `http://127.0.0.1:9119`; protected calls require an explicit `X-Hermes-Session-Token` |
| CLI/PTY | Official Hermes CLI or dashboard PTY path, used only when Gateway REST or local state is not available |
| Guild-owned | Hermes Guild state, not claimed as Hermes runtime data |
| Mock fallback | Mock bridge data shown only in mock mode or auto fallback and labeled as mock |
| Unavailable | No stable REST/CLI source wired yet; real mode must not invent data |

## Data Surfaces

| Guild surface | Desired object | Source | Endpoint or path | Current support | Notes and risks | Tests needed |
| --- | --- | --- | --- | --- | --- | --- |
| Gateway health | `SystemStatus.gatewayStatus`, `hermesAvailable` | Gateway REST | `GET /health` | Implemented | Current local response may only include `{"status":"ok","platform":"hermes-agent"}`. Profile identity is absent unless Hermes adds metadata. | Health parsing, unavailable handling |
| Detailed provider health | `SystemStatus.providerHealth`, warnings | Gateway REST | `GET /health/detailed` | Client wired to provider-health source label | Some Hermes versions may omit this endpoint. Real mode shows unavailable source when missing. | 2xx parsing, 404 unavailable |
| Models | Agent equipment / system detail | Gateway REST | `GET /v1/models` | Client wired to real active agent equipment | Model shape may follow OpenAI-compatible list response. UI tolerates unknown fields. | List parsing, malformed payload |
| Capabilities | System capabilities / feature flags | Gateway REST | `GET /v1/capabilities` | Client wired to real active agent equipment | Grounds capability badges/equipment when endpoint is available. | Capability parsing |
| Chat completions | OpenAI-compatible chat request | Gateway REST | `POST /v1/chat/completions` | Client wired; not used for Guild task loop | Runs API remains the task/review path because it exposes run id, status, events, and stop. | Request method coverage |
| Responses | Future response detail | Gateway REST | `POST /v1/responses`, `GET /v1/responses/{id}`, `DELETE /v1/responses/{id}` | Not used | Do not wire write/delete actions without explicit user action. Current task path uses runs. | Request/response parsing, delete method support |
| Quest execution | `Task`, timeline, report | Gateway REST | `POST /v1/runs` | Implemented | Guild creates local task/review wrapper; final output must remain raw Hermes text in pet chat. | Run start failures, missing run id |
| Run status | `Task.state`, progress evidence | Gateway REST | `GET /v1/runs/{run_id}` | Wired after run id is known | Run status timeline entries are bridge-visible, not pet chat bubbles. | Status parsing, unavailable handling |
| Run events | `TimelineEvent`, final output | Gateway REST | `GET /v1/runs/{run_id}/events` | Implemented | Only event text/preview/delta/final output should become pet-visible. | SSE parsing |
| Stop run | Running task stop control | Gateway REST | `POST /v1/runs/{run_id}/stop` | Wired through explicit `stopTask` action | UI shows stop action for running tasks; bridge records unavailable when task has no gateway run id or endpoint fails. | Explicit action safeguard, 404 gap |
| Gateway jobs | Job list/detail/status | Gateway REST | `GET/POST /api/jobs`, `GET/PATCH/DELETE /api/jobs/{job_id}`, `POST /api/jobs/{job_id}/pause`, `POST /api/jobs/{job_id}/resume`, `POST /api/jobs/{job_id}/run` | Read summary wired; write/action clients only | Overlaps dashboard cron jobs; writes require explicit action. | Read parsing, action guards |
| Dashboard public status | Optional compatibility status | Dashboard compatibility | `GET /api/status` | Wired to `dashboardAvailable`; not required for core execution | The official dashboard protects most `/api/*` routes with an ephemeral session token. Public status alone must not imply protected data is available. | Separate base URL config, unavailable handling |
| Sessions | Archive/session list | Local Hermes state target; dashboard compatibility only with token | Dashboard source reads session storage; compatibility path `GET /api/sessions` | Compatibility client guarded; local adapter pending | Real mode shows unavailable unless local adapter or explicit token-backed compatibility is available. | Protected-route skip, list parsing |
| Session detail | Archive/session detail | Local Hermes state target; dashboard compatibility only with token | Dashboard source reads session DB; compatibility paths `GET/DELETE /api/sessions/{session_id}` | Compatibility client guarded; delete client only | Delete requires explicit user action. | Detail parsing, action guard |
| Session messages | Battle log / message history | Local Hermes state target; dashboard compatibility only with token | Dashboard source reads stored messages; compatibility path `GET /api/sessions/{session_id}/messages` | Compatibility client guarded | Pet chat does not blend historical messages into active run bubbles. | Message parsing |
| Session search | Archive search | Local Hermes state target; dashboard compatibility only with token | Compatibility path `GET /api/sessions/search` | Compatibility client guarded | Query params are encoded; persistent search UI is not v0 core. | Query encoding |
| Config | Settings view | Local Hermes state target; public defaults/schema; protected compatibility for live config | Dashboard source imports `load_config`, `DEFAULT_CONFIG`, `get_config_path`, `save_config` | Defaults/schema public compatibility; protected config guarded; local adapter pending | Writes require explicit user action. | Read parsing, write guard |
| Env/API key status | Redacted secrets state | Local Hermes state target; dashboard compatibility only with token | Dashboard source imports `load_env`, `OPTIONAL_ENV_VARS`, `redact_key`, `save_env_value`, `remove_env_value` | Compatibility client guarded; local adapter pending | Never expose cleartext secrets; count configured keys only. | Redaction assertions, write/delete guards |
| Logs | Infirmary-style diagnostics | Local Hermes state target; dashboard compatibility only with token | Dashboard source reads local logs | Compatibility client guarded; local adapter pending | Bound reads and summaries; no raw stack traces in Pet chat. | Log parsing |
| Analytics | Usage summary | Local Hermes state target; dashboard compatibility only with token | Dashboard source aggregates local usage data | Compatibility client guarded; local adapter pending | Treated as operational evidence, not XP. | Summary parsing |
| Cron jobs | Scheduled jobs | Local Hermes state target; dashboard compatibility only with token | Compatibility paths under `/api/cron/jobs` | Compatibility client guarded; local adapter pending | Writes are explicit actions only. | Read parsing, action guards |
| Skills | Agent skills | Local Hermes state target; dashboard compatibility only with token | Compatibility paths `GET /api/skills`, `PUT /api/skills/toggle` | Compatibility client guarded; local adapter pending | Skill cards remain unavailable in real mode without a verified local source or explicit token-backed compatibility. | Skill parsing, toggle guard |
| Toolsets | Equipment/tool permissions | Local Hermes state target; dashboard compatibility only with token | Compatibility path `GET /api/tools/toolsets` | Compatibility client guarded; local adapter pending | Disabled toolsets are not shown as active equipment. | Toolset parsing |
| Dashboard PTY/TUI | Embedded Hermes TUI | CLI/PTY | `WebSocket /api/pty`, `hermes --tui` | Not wired | Only needed for features official dashboard exposes through PTY but not REST. Do not use insecure dashboard mode. | Explicit unavailable/deferred label |
| Active pet profile selection | `activeProfileId`, pet assignment | Guild-owned plus API metadata | Guild state, profile metadata from `/health` when present | Partially implemented | Guild owns selection state, but visible real profile name must come from Hermes metadata only. | No manual profile-name fallback |
| Review approval/revision | `ReportCard.reviewStatus` | Guild-owned | Bridge state | Implemented | Review is a Guild workflow layered over Hermes output. | Approve/revise tests |
| Mock profiles and tasks | Mock demo loop | Mock fallback | `MockHermesBridge` | Implemented | Allowed only in mock mode or auto fallback with source labels. | No mock data in real mode |

## Official Dashboard Investigation Notes

- The dashboard docs identify a web dashboard serving conversation management, configuration, monitoring, analytics, cron jobs, skills, toolsets, and optional PTY/TUI access.
- The official `hermes_cli/web_server.py` generates a fresh `_SESSION_TOKEN` on server start, accepts `X-Hermes-Session-Token`, and gates all non-public `/api/*` routes behind middleware.
- The public dashboard API list is intentionally minimal: `/api/status`, `/api/config/defaults`, `/api/config/schema`, `/api/model/info`, and dashboard theme/plugin endpoints.
- Hermes Guild should copy the dashboard's local-state logic into its own bridge where practical instead of requiring a running dashboard service.
- PTY is a fallback category for embedded TUI parity only. It is not a source for ordinary operational summaries when Gateway REST or local state can provide the signal.
- Current local gateway health evidence recorded in earlier checks only returned `status` and `platform`, so profile name is a backend signal gap until Hermes exposes profile metadata.

## Implementation Priority

1. Keep gateway task execution working through runs and events.
2. Keep gateway base URL as core config and treat dashboard base URL as advanced compatibility only.
3. Add gateway client coverage for health, detailed health, models, capabilities, run status, stop run, responses, and jobs.
4. Add local Hermes state adapters for sessions, messages, config, env redacted state, logs, analytics, cron jobs, skills, and toolsets where official dashboard source proves the backing path.
5. Keep dashboard compatibility clients token-guarded and optional.
