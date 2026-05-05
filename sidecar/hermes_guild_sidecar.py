#!/usr/bin/env python3
"""Hermes Guild local compatibility sidecar.

This service is intentionally small and stdlib-only. It exposes local
capability probes without becoming the preferred task execution path.
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import os
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Dict, Iterable, Optional, Tuple
from urllib.parse import parse_qs, unquote, urlparse


SIDECAR_VERSION = "0.1.0"
SOURCE_PRECEDENCE = [
    "public-rest",
    "cli",
    "local-state",
    "sidecar",
    "guild-owned",
    "unavailable",
]
MAX_TEXT_BYTES = 4096
RUN_TIMEOUT_SECONDS = 300
PUBLIC_REST_REASON = "Gateway REST /v1/runs remains the preferred Hermes Guild execution path."
CLI_PROFILE_RUN_REASON = "Verified CLI route: hermes -p <profile> -z <prompt> scopes execution without changing sticky active profile."


@dataclass(frozen=True)
class SidecarConfig:
    hermes_home: Path = field(default_factory=lambda: Path(os.environ.get("HERMES_HOME", "~/.hermes")).expanduser())
    gateway_base_url: str = os.environ.get("HERMES_API_BASE_URL", "http://127.0.0.1:8642")
    check_gateway: bool = True
    check_cli: bool = True


@dataclass(frozen=True)
class JsonResponse:
    status: int
    body: Dict[str, Any]


class HermesGuildSidecar:
    def __init__(self, config: Optional[SidecarConfig] = None):
        self.config = config or SidecarConfig()
        self.started_at = time.time()
        self.runs: Dict[str, Dict[str, Any]] = {}

    def response_for(self, method: str, path: str, body: Optional[Dict[str, Any]] = None) -> JsonResponse:
        method = method.upper()
        parsed_path = urlparse(path).path.rstrip("/") or "/"

        if method == "GET" and parsed_path == "/health":
            return JsonResponse(200, self.health())
        if method == "GET" and parsed_path == "/version":
            return JsonResponse(200, self.version())
        if method == "GET" and parsed_path == "/capabilities":
            return JsonResponse(200, self.capabilities())
        if method == "GET" and parsed_path == "/profiles":
            return JsonResponse(200, self.profiles())
        profile_details_response = self._profile_details_response_for(method, path)
        if profile_details_response:
            return profile_details_response
        if method == "GET" and parsed_path == "/active-profile":
            return JsonResponse(200, self.active_profile())
        if method == "GET" and parsed_path == "/local-state/summary":
            return JsonResponse(200, self.local_state_summary())
        run_response = self._run_response_for(method, parsed_path, body or {})
        if run_response:
            return run_response

        return JsonResponse(404, {"ok": False, "error": "not_found", "path": parsed_path})

    def _profile_details_response_for(self, method: str, path: str) -> Optional[JsonResponse]:
        parsed = urlparse(path)
        parsed_path = parsed.path.rstrip("/") or "/"
        parts = [part for part in parsed_path.split("/") if part]
        if method != "GET" or len(parts) != 3 or parts[0] != "profiles" or parts[2] != "details":
            return None
        profile_id = unquote(parts[1])
        query = parse_qs(parsed.query)
        profile_name = query.get("name", [profile_id])[0]
        return JsonResponse(200, profile_details(self.config.hermes_home, profile_id, profile_name))

    def health(self) -> Dict[str, Any]:
        public_rest = self._gateway_status()
        cli = self._cli_status()
        local_state = self._local_state_status()
        return {
            "ok": True,
            "service": "hermes-guild-sidecar",
            "sidecar_version": SIDECAR_VERSION,
            "uptime_seconds": round(time.time() - self.started_at, 3),
            "loopback_only": True,
            "hermes_importable": hermes_import_status(),
            "sources": {
                "public_rest": public_rest,
                "cli": cli,
                "local_state": local_state,
                "sidecar": {"status": "available", "source": "sidecar"},
            },
        }

    def version(self) -> Dict[str, Any]:
        cli = self._cli_status(include_version=True)
        gateway = self._gateway_status()
        return {
            "ok": True,
            "sidecar": {"version": SIDECAR_VERSION, "source": "sidecar"},
            "hermes_python": hermes_import_status(),
            "hermes_cli": cli,
            "gateway": gateway,
        }

    def capabilities(self) -> Dict[str, Any]:
        profile_source = "cli" if self._cli_status()["status"] == "available" else "local-state"
        cli_run_status = self._cli_run_status()
        return {
            "ok": True,
            "source_precedence": SOURCE_PRECEDENCE,
            "capabilities": {
                "health": {"source": "sidecar", "status": "available"},
                "version": {"source": "cli", "status": self._cli_status()["status"]},
                "profiles": {"source": profile_source, "status": self._cli_status()["status"] if profile_source == "cli" else self._local_state_status()["status"]},
                "active_profile": {"source": profile_source, "status": self._cli_status()["status"] if profile_source == "cli" else self._local_state_status()["status"]},
                "local_state_summary": {"source": "local-state", "status": self._local_state_status()["status"]},
                "runs": cli_run_status,
                "run_events": cli_run_status,
                "run_stop": {"source": "sidecar", "status": "unsupported", "reason": "Sidecar CLI runs are synchronous and cannot be stopped after completion."},
            },
        }

    def profiles(self) -> Dict[str, Any]:
        cli_profiles = read_profiles_from_cli(self.config.check_cli)
        if cli_profiles["profiles"]:
            cli_run_status = self._cli_run_status()
            execution_routing = "supported" if cli_run_status["status"] == "available" else "unsupported"
            return {
                "ok": True,
                "source": "cli",
                "profiles": cli_profiles["profiles"],
                "active_profile_id": cli_profiles["active_profile_id"],
                "execution_routing": execution_routing,
                "execution_routing_source": "sidecar" if execution_routing == "supported" else "unavailable",
                "execution_routing_mode": "sidecar" if execution_routing == "supported" else "unavailable",
                "execution_routing_reason": cli_run_status["reason"],
            }

        profiles = read_profiles(self.config.hermes_home)
        return {
            "ok": True,
            "source": "local-state" if profiles else "unavailable",
            "profiles": profiles,
            "unavailable_reason": None if profiles else "No profile metadata found in local Hermes state.",
        }

    def active_profile(self) -> Dict[str, Any]:
        cli_profiles = read_profiles_from_cli(self.config.check_cli)
        if cli_profiles["profiles"]:
            active_id = cli_profiles["active_profile_id"]
            profile = next((item for item in cli_profiles["profiles"] if item.get("id") == active_id), None) or cli_profiles["profiles"][0]
            return {"ok": True, "source": "cli", "profile": profile}

        active_id = read_active_profile_id(self.config.hermes_home)
        profiles = read_profiles(self.config.hermes_home)
        profile = next((item for item in profiles if item.get("id") == active_id), None)
        if not profile and active_id:
            profile = {"id": active_id, "name": active_id}

        if profile:
            return {"ok": True, "source": "local-state", "profile": profile}

        return {
            "ok": True,
            "source": "unavailable",
            "profile": {"id": "profile-unavailable", "name": "Profile unavailable"},
            "unavailable_reason": "Hermes did not expose active profile metadata through REST or readable local state.",
        }

    def local_state_summary(self) -> Dict[str, Any]:
        hermes_home = self.config.hermes_home
        env_text = read_text_bounded(hermes_home / ".env")
        log_summary = logs_summary(hermes_home / "logs")
        return {
            "ok": True,
            "source": "local-state" if hermes_home.exists() else "unavailable",
            "hermes_home": str(hermes_home),
            "exists": hermes_home.exists(),
            "profiles": {
                "count": len(read_profiles(hermes_home)),
                "active_profile_id": read_active_profile_id(hermes_home),
            },
            "sessions": directory_summary(hermes_home / "sessions"),
            "logs": log_summary,
            "config": file_status(hermes_home / "config.json"),
            "env": redacted_env_summary(env_text),
            "cron": directory_summary(hermes_home / "cron"),
            "skills": directory_summary(hermes_home / "skills"),
            "toolsets": directory_summary(hermes_home / "toolsets"),
        }

    def _is_run_endpoint(self, method: str, path: str) -> bool:
        if method == "POST" and path == "/runs":
            return True
        parts = [part for part in path.split("/") if part]
        if len(parts) == 2 and parts[0] == "runs" and method == "GET":
            return True
        if len(parts) == 3 and parts[0] == "runs" and parts[2] == "events" and method == "GET":
            return True
        if len(parts) == 3 and parts[0] == "runs" and parts[2] == "stop" and method == "POST":
            return True
        return False

    def _run_response_for(self, method: str, path: str, body: Dict[str, Any]) -> Optional[JsonResponse]:
        if not self._is_run_endpoint(method, path):
            return None
        if method == "POST" and path == "/runs":
            return self._start_run(body)

        parts = [part for part in path.split("/") if part]
        run_id = parts[1] if len(parts) >= 2 and parts[0] == "runs" else ""
        run = self.runs.get(run_id)
        if not run:
            return JsonResponse(404, {"ok": False, "error": "run_not_found", "run_id": run_id})
        if method == "GET" and len(parts) == 2:
            return JsonResponse(200, run)
        if method == "GET" and len(parts) == 3 and parts[2] == "events":
            return JsonResponse(200, {"ok": True, "run_id": run_id, "events": run.get("events", [])})
        if method == "POST" and len(parts) == 3 and parts[2] == "stop":
            return JsonResponse(409, {"ok": False, "run_id": run_id, "status": run.get("status"), "reason": "Sidecar CLI runs are synchronous and already completed."})
        return JsonResponse(404, {"ok": False, "error": "not_found", "path": path})

    def _start_run(self, body: Dict[str, Any]) -> JsonResponse:
        profile_name = profile_name_from_body(body)
        prompt = prompt_from_body(body)
        if not profile_name:
            return JsonResponse(400, {"ok": False, "error": "profile_required", "reason": "Sidecar selected-profile execution requires a profile name."})
        if not prompt:
            return JsonResponse(400, {"ok": False, "error": "input_required", "reason": "Sidecar selected-profile execution requires input text."})

        cli_run_status = self._cli_run_status()
        if cli_run_status["status"] != "available":
            return JsonResponse(501, unsupported_run_payload(cli_run_status["reason"]))

        run_id = f"sidecar-{int(time.time() * 1000)}-{len(self.runs) + 1}"
        result = run_cli_profile_task(profile_name, prompt, self.config.check_cli)
        status = "completed" if result["ok"] else "failed"
        event = {
            "event": "run.completed" if result["ok"] else "run.failed",
            "run_id": run_id,
            "output": result.get("output", ""),
            "error": result.get("error"),
            "profile": profile_name,
            "profile_routing": "supported",
            "profile_routing_source": "sidecar",
            "profile_routing_mode": "sidecar",
        }
        run = {
            "ok": result["ok"],
            "run_id": run_id,
            "status": status,
            "output": result.get("output", ""),
            "error": result.get("error"),
            "profile": profile_name,
            "profile_context": {
                "profile_id": slug_from_name(profile_name),
                "profile_name": profile_name,
                "source": "cli",
                "routing_source": "sidecar",
                "routing_mode": "sidecar",
                "session_id": string_value(body.get("session_id")) or None,
                "verified": True,
            },
            "routing": {
                "source": "sidecar",
                "mode": "sidecar",
                "mechanism": "hermes -p <profile> -z <prompt>",
                "verified": True,
                "reason": CLI_PROFILE_RUN_REASON,
            },
            "events": [event],
        }
        self.runs[run_id] = run
        return JsonResponse(200 if result["ok"] else 502, run)

    def _gateway_status(self) -> Dict[str, Any]:
        if not self.config.check_gateway:
            return {"status": "unchecked", "source": "public-rest", "base_url": self.config.gateway_base_url}

        url = self.config.gateway_base_url.rstrip("/") + "/health"
        try:
            with urllib.request.urlopen(url, timeout=1.5) as response:
                payload = json.loads(response.read().decode("utf-8") or "{}")
            return {"status": "available", "source": "public-rest", "base_url": self.config.gateway_base_url, "payload": safe_public_payload(payload)}
        except (OSError, urllib.error.URLError, json.JSONDecodeError) as error:
            return {"status": "unavailable", "source": "public-rest", "base_url": self.config.gateway_base_url, "reason": str(error)}

    def _cli_status(self, include_version: bool = False) -> Dict[str, Any]:
        path = shutil.which("hermes")
        if not self.config.check_cli:
            return {"status": "unchecked", "source": "cli", "path": path}
        if not path:
            return {"status": "unavailable", "source": "cli", "reason": "hermes executable not found on PATH"}
        result: Dict[str, Any] = {"status": "available", "source": "cli", "path": path}
        if include_version:
            result["version"] = command_version(path)
        return result

    def _cli_run_status(self) -> Dict[str, Any]:
        if not self.config.check_cli:
            return {"status": "unchecked", "source": "cli", "reason": "CLI route discovery skipped by configuration."}
        path = shutil.which("hermes")
        if not path:
            return {"status": "unavailable", "source": "cli", "reason": "hermes executable not found on PATH"}
        try:
            completed = subprocess.run(
                [path, "-p", "default", "--help"],
                check=False,
                capture_output=True,
                text=True,
                timeout=2,
            )
        except (OSError, subprocess.TimeoutExpired) as error:
            return {"status": "unavailable", "source": "cli", "reason": str(error)}
        output = f"{completed.stdout}\n{completed.stderr}"
        if completed.returncode == 0 and "--oneshot" in output:
            return {"status": "available", "source": "sidecar", "mode": "sidecar", "reason": CLI_PROFILE_RUN_REASON}
        return {"status": "unsupported", "source": "cli", "reason": "Hermes CLI did not accept `-p default --help` with oneshot support."}

    def _local_state_status(self) -> Dict[str, Any]:
        if self.config.hermes_home.exists():
            return {"status": "available", "source": "local-state", "path": str(self.config.hermes_home)}
        return {"status": "unavailable", "source": "local-state", "path": str(self.config.hermes_home), "reason": "Hermes home not found"}


def read_profiles(hermes_home: Path) -> list[Dict[str, str]]:
    profiles_dir = hermes_home / "profiles"
    if not profiles_dir.is_dir():
        return []
    profiles: list[Dict[str, str]] = []
    for path in sorted(profiles_dir.iterdir()):
        if path.suffix.lower() != ".json" or not path.is_file():
            continue
        try:
            payload = json.loads(read_text_bounded(path))
        except json.JSONDecodeError:
            continue
        if not isinstance(payload, dict):
            continue
        name = string_value(payload.get("name")) or string_value(payload.get("display_name"))
        profile_id = string_value(payload.get("id")) or string_value(payload.get("slug")) or path.stem
        if name:
            profiles.append({"id": profile_id, "name": name})
    return profiles


def profile_details(hermes_home: Path, profile_id: str, profile_name: str) -> Dict[str, Any]:
    profile_home = resolve_profile_home(hermes_home, profile_id, profile_name)
    soul_path = profile_home / "SOUL.md"
    soul_text = read_text_bounded(soul_path)
    return {
        "ok": True,
        "profile_id": profile_id,
        "profile_name": profile_name,
        "source": "local-state" if profile_home.exists() else "unavailable",
        "path": str(profile_home),
        "loaded_at": iso_now(),
        "soul_md": {
            "source": "local-state" if soul_path.is_file() else "unavailable",
            "path": str(soul_path),
            "text": soul_text,
            "truncated": soul_path.is_file() and soul_path.stat().st_size > MAX_TEXT_BYTES,
            "unavailable_reason": None if soul_path.is_file() else "SOUL.md not found for this profile.",
        },
        "skills": profile_skills_summary(profile_home / "skills"),
        "sessions": profile_sessions_summary(profile_home / "sessions"),
    }


def resolve_profile_home(hermes_home: Path, profile_id: str, profile_name: str) -> Path:
    key = profile_name or profile_id
    if key == "default" or profile_id == "default":
        return hermes_home
    return hermes_home / "profiles" / key


def profile_skills_summary(skills_dir: Path) -> Dict[str, Any]:
    if not skills_dir.is_dir():
        return {
            "source": "unavailable",
            "path": str(skills_dir),
            "items": [],
            "unavailable_reason": "Profile skills directory not found.",
        }
    items = []
    for path in sorted(safe_iterdir(skills_dir))[:50]:
        if not path.is_file() and not path.is_dir():
            continue
        name = path.stem if path.is_file() else path.name
        items.append({
            "id": slug_from_name(name),
            "name": name,
            "source": "local-state",
            "path": str(path),
        })
    return {"source": "local-state", "path": str(skills_dir), "items": items}


def profile_sessions_summary(sessions_dir: Path) -> Dict[str, Any]:
    if not sessions_dir.is_dir():
        return {
            "source": "unavailable",
            "path": str(sessions_dir),
            "items": [],
            "unavailable_reason": "Profile sessions directory not found.",
        }
    items = []
    for path in sorted(safe_iterdir(sessions_dir), key=lambda item: item.stat().st_mtime if item.exists() else 0, reverse=True)[:25]:
        if not path.is_file():
            continue
        metadata = session_metadata(path)
        items.append({
            "id": path.stem,
            "title": metadata.get("title") or path.stem,
            "source": "local-state",
            "path": str(path),
            "updated_at": iso_from_timestamp(path.stat().st_mtime),
            "message_count": metadata.get("message_count"),
        })
    return {"source": "local-state", "path": str(sessions_dir), "items": items}


def session_metadata(path: Path) -> Dict[str, Any]:
    if path.suffix.lower() != ".json":
        return {}
    try:
        payload = json.loads(read_text_bounded(path))
    except json.JSONDecodeError:
        return {}
    if not isinstance(payload, dict):
        return {}
    messages = payload.get("messages")
    return {
        "title": string_value(payload.get("title")) or string_value(payload.get("name")),
        "message_count": len(messages) if isinstance(messages, list) else None,
    }


def read_profiles_from_cli(check_cli: bool) -> Dict[str, Any]:
    if not check_cli:
        return {"profiles": [], "active_profile_id": None}
    hermes_path = shutil.which("hermes")
    if not hermes_path:
        return {"profiles": [], "active_profile_id": None}
    try:
        completed = subprocess.run(
            [hermes_path, "profile", "list"],
            check=False,
            capture_output=True,
            text=True,
            timeout=2,
        )
    except (OSError, subprocess.TimeoutExpired):
        return {"profiles": [], "active_profile_id": None}
    if completed.returncode != 0:
        return {"profiles": [], "active_profile_id": None}
    return parse_cli_profile_list(completed.stdout)


def parse_cli_profile_list(text: str) -> Dict[str, Any]:
    profiles: list[Dict[str, Any]] = []
    active_profile_id: Optional[str] = None
    for raw_line in text.splitlines():
        normalized = raw_line.strip()
        if not normalized:
            continue
        if normalized.lower().startswith("profile"):
            continue
        if set(normalized) <= {"─", "-", " "}:
            continue

        active = normalized.startswith("◆")
        row = normalized[1:].strip() if active else normalized
        columns = [column.strip() for column in row.split("  ") if column.strip()]
        columns = compact_table_columns(columns)
        if not columns:
            continue
        name = columns[0]
        profile: Dict[str, Any] = {"id": slug_from_name(name), "name": name, "active": active}
        model = normalize_dash(columns[1] if len(columns) > 1 else None)
        gateway_status = normalize_dash(columns[2] if len(columns) > 2 else None)
        alias = normalize_dash(columns[3] if len(columns) > 3 else None)
        if model:
            profile["model"] = model
        if gateway_status:
            profile["gateway_status"] = gateway_status
        if alias:
            profile["alias"] = alias
        if active:
            active_profile_id = profile["id"]
        profiles.append(profile)
    return {"profiles": profiles, "active_profile_id": active_profile_id}


def compact_table_columns(columns: list[str]) -> list[str]:
    compacted: list[str] = []
    for column in columns:
        if column:
            compacted.append(column)
    return compacted


def normalize_dash(value: Optional[str]) -> Optional[str]:
    if not value or value in ("-", "—"):
        return None
    return value


def slug_from_name(name: str) -> str:
    slug = "".join(character.lower() if character.isalnum() or character in "._-" else "-" for character in name.strip())
    return slug.strip("-") or "profile"


def read_active_profile_id(hermes_home: Path) -> Optional[str]:
    for name in ("active_profile", "active_profile.txt", ".active_profile"):
        value = read_text_bounded(hermes_home / name).strip()
        if value:
            return value
    active_json = hermes_home / "active_profile.json"
    if active_json.exists():
        try:
            payload = json.loads(read_text_bounded(active_json))
        except json.JSONDecodeError:
            return None
        if isinstance(payload, dict):
            return string_value(payload.get("id")) or string_value(payload.get("profile_id")) or string_value(payload.get("name"))
    return None


def redacted_env_summary(text: str) -> Dict[str, Any]:
    configured: list[str] = []
    empty: list[str] = []
    malformed = 0
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            malformed += 1
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        if not key:
            malformed += 1
            continue
        if value.strip():
            configured.append(key)
        else:
            empty.append(key)
    return {
        "configured_keys": sorted(configured),
        "empty_keys": sorted(empty),
        "malformed_lines": malformed,
        "values": "redacted",
    }


def logs_summary(logs_dir: Path) -> Dict[str, Any]:
    summary = directory_summary(logs_dir)
    latest = latest_file(logs_dir)
    if latest:
        summary["latest_file"] = latest.name
        summary["tail_bytes"] = min(latest.stat().st_size, MAX_TEXT_BYTES)
    else:
        summary["tail_bytes"] = 0
    return summary


def directory_summary(path: Path) -> Dict[str, Any]:
    if not path.exists():
        return {"status": "unavailable", "path": str(path), "count": 0}
    if not path.is_dir():
        return {"status": "unavailable", "path": str(path), "count": 0, "reason": "not a directory"}
    entries = list(safe_iterdir(path))
    return {"status": "available", "path": str(path), "count": len(entries)}


def file_status(path: Path) -> Dict[str, Any]:
    if not path.exists():
        return {"status": "unavailable", "path": str(path)}
    if not path.is_file():
        return {"status": "unavailable", "path": str(path), "reason": "not a file"}
    return {"status": "available", "path": str(path), "bytes": min(path.stat().st_size, MAX_TEXT_BYTES)}


def read_text_bounded(path: Path) -> str:
    if not path.is_file():
        return ""
    with path.open("rb") as handle:
        return handle.read(MAX_TEXT_BYTES).decode("utf-8", errors="replace")


def iso_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def iso_from_timestamp(timestamp: float) -> str:
    return datetime.fromtimestamp(timestamp, timezone.utc).isoformat().replace("+00:00", "Z")


def latest_file(path: Path) -> Optional[Path]:
    files = [item for item in safe_iterdir(path) if item.is_file()]
    if not files:
        return None
    return max(files, key=lambda item: item.stat().st_mtime)


def safe_iterdir(path: Path) -> Iterable[Path]:
    try:
        return list(path.iterdir())
    except OSError:
        return []


def hermes_import_status() -> Dict[str, Any]:
    candidates = ["hermes", "hermes_agent", "hermes_cli"]
    for module_name in candidates:
        if importlib.util.find_spec(module_name):
            return {"status": "available", "source": "python-import", "module": module_name}
    return {"status": "unavailable", "source": "python-import", "reason": "No known Hermes Python module importable."}


def command_version(path: str) -> Dict[str, str]:
    for args in ([path, "--version"], [path, "version"]):
        try:
            completed = subprocess.run(args, check=False, capture_output=True, text=True, timeout=2)
        except (OSError, subprocess.TimeoutExpired) as error:
            return {"status": "unavailable", "reason": str(error)}
        output = (completed.stdout or completed.stderr).strip()
        if output:
            return {"status": "available", "text": output[:200]}
    return {"status": "unavailable", "reason": "Hermes CLI did not print a version."}


def safe_public_payload(payload: Any) -> Dict[str, Any]:
    if not isinstance(payload, dict):
        return {}
    allowed = {}
    for key in ("status", "platform", "version", "profile", "active_profile", "profile_name", "active_profile_name"):
        if key in payload:
            allowed[key] = payload[key]
    return allowed


def profile_name_from_body(body: Dict[str, Any]) -> str:
    profile = body.get("profile")
    if isinstance(profile, dict):
        return string_value(profile.get("name")) or string_value(profile.get("profile_name")) or string_value(profile.get("id"))
    return string_value(profile) or string_value(body.get("profile_name")) or string_value(body.get("profile_id"))


def prompt_from_body(body: Dict[str, Any]) -> str:
    input_text = string_value(body.get("input"))
    instructions = string_value(body.get("instructions"))
    parts = [instructions, input_text]
    return "\n\n".join(part for part in parts if part)


def run_cli_profile_task(profile_name: str, prompt: str, check_cli: bool) -> Dict[str, Any]:
    if not check_cli:
        return {"ok": False, "error": "CLI route discovery skipped by configuration."}
    hermes_path = shutil.which("hermes")
    if not hermes_path:
        return {"ok": False, "error": "hermes executable not found on PATH"}
    try:
        completed = subprocess.run(
            [hermes_path, "-p", profile_name, "-z", prompt],
            check=False,
            capture_output=True,
            text=True,
            timeout=RUN_TIMEOUT_SECONDS,
        )
    except subprocess.TimeoutExpired:
        return {"ok": False, "error": f"Hermes CLI selected-profile run timed out after {RUN_TIMEOUT_SECONDS} seconds."}
    except OSError as error:
        return {"ok": False, "error": str(error)}
    output = completed.stdout.strip()
    error = completed.stderr.strip()
    if completed.returncode != 0:
        return {"ok": False, "output": output, "error": error or f"Hermes CLI exited with status {completed.returncode}."}
    return {"ok": True, "output": output}


def unsupported_run_payload(reason: str = PUBLIC_REST_REASON) -> Dict[str, Any]:
    return {
        "ok": False,
        "status": "unsupported",
        "source": "sidecar",
        "preferred_source": "public-rest",
        "reason": reason,
    }


def string_value(value: Any) -> str:
    return value.strip() if isinstance(value, str) and value.strip() else ""


def is_loopback_host(host: str) -> bool:
    return host in {"127.0.0.1", "localhost", "::1"}


class SidecarRequestHandler(BaseHTTPRequestHandler):
    sidecar = HermesGuildSidecar()

    def do_GET(self) -> None:
        self._respond(self.sidecar.response_for("GET", self.path))

    def do_POST(self) -> None:
        self._respond(self.sidecar.response_for("POST", self.path, self._read_json_body()))

    def _read_json_body(self) -> Dict[str, Any]:
        length = int(self.headers.get("content-length", "0") or "0")
        if length <= 0:
            return {}
        try:
            return json.loads(self.rfile.read(min(length, MAX_TEXT_BYTES)).decode("utf-8"))
        except json.JSONDecodeError:
            return {}

    def _respond(self, response: JsonResponse) -> None:
        payload = json.dumps(response.body, sort_keys=True).encode("utf-8")
        self.send_response(response.status)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, format: str, *args: Any) -> None:
        del format, args


def make_handler(sidecar: HermesGuildSidecar):
    class ConfiguredSidecarRequestHandler(SidecarRequestHandler):
        pass

    ConfiguredSidecarRequestHandler.sidecar = sidecar
    return ConfiguredSidecarRequestHandler


def run_server(host: str, port: int, config: SidecarConfig) -> None:
    if not is_loopback_host(host):
        raise ValueError(f"Refusing non-loopback host: {host}")
    server = ThreadingHTTPServer((host, port), make_handler(HermesGuildSidecar(config)))
    print(json.dumps({"service": "hermes-guild-sidecar", "host": host, "port": port, "loopback_only": True}))
    server.serve_forever()


def self_test() -> int:
    sidecar = HermesGuildSidecar(SidecarConfig(check_gateway=False, check_cli=False))
    checks: list[Tuple[str, str, int]] = [
        ("GET", "/health", 200),
        ("GET", "/version", 200),
        ("GET", "/capabilities", 200),
        ("GET", "/profiles", 200),
        ("GET", "/active-profile", 200),
        ("GET", "/local-state/summary", 200),
        ("POST", "/runs", 400),
        ("GET", "/runs/example", 404),
        ("GET", "/runs/example/events", 404),
        ("POST", "/runs/example/stop", 404),
    ]
    results = []
    ok = True
    for method, path, expected in checks:
        response = sidecar.response_for(method, path)
        passed = response.status == expected
        ok = ok and passed
        results.append({"method": method, "path": path, "status": response.status, "passed": passed})
    print(json.dumps({"ok": ok, "checks": results}, indent=2, sort_keys=True))
    return 0 if ok else 1


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Hermes Guild local sidecar")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--hermes-home", default=os.environ.get("HERMES_HOME", "~/.hermes"))
    parser.add_argument("--gateway-base-url", default=os.environ.get("HERMES_API_BASE_URL", "http://127.0.0.1:8642"))
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--skip-gateway-check", action="store_true")
    parser.add_argument("--skip-cli-check", action="store_true")
    return parser.parse_args(argv)


def main(argv: Optional[list[str]] = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    if args.self_test:
        return self_test()
    config = SidecarConfig(
        hermes_home=Path(args.hermes_home).expanduser(),
        gateway_base_url=args.gateway_base_url,
        check_gateway=not args.skip_gateway_check,
        check_cli=not args.skip_cli_check,
    )
    try:
        run_server(args.host, args.port, config)
    except ValueError as error:
        print(str(error), file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
