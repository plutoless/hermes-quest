import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from sidecar.hermes_guild_sidecar import (
    HermesGuildSidecar,
    SidecarConfig,
    hermes_import_status,
    is_loopback_host,
    redacted_env_summary,
)


class HermesGuildSidecarTest(unittest.TestCase):
    def make_sidecar(self, hermes_home: Path) -> HermesGuildSidecar:
        return HermesGuildSidecar(
            SidecarConfig(
                hermes_home=hermes_home,
                gateway_base_url="http://127.0.0.1:1",
                check_gateway=False,
                check_cli=False,
            )
        )

    def test_health_works_without_hermes_installation(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            response = self.make_sidecar(Path(temp_dir)).response_for("GET", "/health")

        self.assertEqual(response.status, 200)
        self.assertTrue(response.body["ok"])
        self.assertEqual(response.body["service"], "hermes-guild-sidecar")
        self.assertTrue(response.body["loopback_only"])
        self.assertEqual(response.body["sources"]["public_rest"]["status"], "unchecked")
        self.assertEqual(response.body["sources"]["cli"]["status"], "unchecked")

    def test_missing_hermes_python_import_is_structured_unavailable(self):
        with patch("importlib.util.find_spec", return_value=None):
            status = hermes_import_status()

        self.assertEqual(status["status"], "unavailable")
        self.assertIn("reason", status)

    def test_missing_cli_is_structured_unavailable(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            with patch("shutil.which", return_value=None):
                sidecar = HermesGuildSidecar(
                    SidecarConfig(
                        hermes_home=Path(temp_dir),
                        gateway_base_url="http://127.0.0.1:1",
                        check_gateway=False,
                        check_cli=True,
                    )
                )
                response = sidecar.response_for("GET", "/version")

        self.assertEqual(response.status, 200)
        self.assertEqual(response.body["hermes_cli"]["status"], "unavailable")
        self.assertIn("reason", response.body["hermes_cli"])

    def test_capabilities_publish_precedence_and_run_support_status(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            sidecar = self.make_sidecar(Path(temp_dir))
            capabilities = sidecar.response_for("GET", "/capabilities")
            runs = sidecar.response_for("POST", "/runs", body={"input": "hello"})
            run_status = sidecar.response_for("GET", "/runs/run-1")
            events = sidecar.response_for("GET", "/runs/run-1/events")
            stop = sidecar.response_for("POST", "/runs/run-1/stop")

        self.assertEqual(capabilities.status, 200)
        self.assertEqual(
            capabilities.body["source_precedence"],
            ["public-rest", "cli", "local-state", "sidecar", "guild-owned", "unavailable"],
        )
        for response in (runs, run_status, events, stop):
            self.assertIn(response.status, (400, 404, 501))

    def test_selected_profile_run_uses_cli_profile_oneshot_without_global_switch(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            sidecar = HermesGuildSidecar(
                SidecarConfig(
                    hermes_home=Path(temp_dir),
                    gateway_base_url="http://127.0.0.1:1",
                    check_gateway=False,
                    check_cli=True,
                )
            )
            with patch("shutil.which", return_value="/usr/local/bin/hermes"):
                with patch("subprocess.run") as run:
                    run.side_effect = [
                        unittest.mock.Mock(returncode=0, stdout="usage: hermes --oneshot PROMPT", stderr=""),
                        unittest.mock.Mock(returncode=0, stdout="profile output\n", stderr=""),
                    ]
                    response = sidecar.response_for(
                        "POST",
                        "/runs",
                        body={"input": "hello", "instructions": "be brief", "session_id": "task-1", "profile": {"name": "frieren"}},
                    )
                    status = sidecar.response_for("GET", f"/runs/{response.body['run_id']}")
                    events = sidecar.response_for("GET", f"/runs/{response.body['run_id']}/events")

        self.assertEqual(response.status, 200)
        self.assertTrue(response.body["ok"])
        self.assertEqual(response.body["output"], "profile output")
        self.assertEqual(response.body["profile"], "frieren")
        self.assertEqual(response.body["profile_context"]["profile_name"], "frieren")
        self.assertEqual(response.body["profile_context"]["routing_source"], "sidecar")
        self.assertEqual(response.body["routing"]["mechanism"], "hermes -p <profile> -z <prompt>")
        command = run.call_args_list[1].args[0]
        self.assertEqual(command[:3], ["/usr/local/bin/hermes", "-p", "frieren"])
        self.assertIn("-z", command)
        self.assertNotIn("profile", command[:3])
        self.assertNotIn("use", command)
        self.assertEqual(status.status, 200)
        self.assertEqual(status.body["status"], "completed")
        self.assertEqual(events.status, 200)
        self.assertEqual(events.body["events"][0]["event"], "run.completed")

    def test_active_profile_missing_is_explicit_unavailable_state(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            response = self.make_sidecar(Path(temp_dir)).response_for("GET", "/active-profile")

        self.assertEqual(response.status, 200)
        self.assertEqual(response.body["profile"]["name"], "Profile unavailable")
        self.assertEqual(response.body["source"], "unavailable")

    def test_profiles_can_read_local_state_when_present(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            hermes_home = Path(temp_dir)
            profiles_dir = hermes_home / "profiles"
            profiles_dir.mkdir()
            (profiles_dir / "builder.json").write_text(json.dumps({"id": "builder", "name": "Builder Prime"}))
            (hermes_home / "active_profile").write_text("builder")

            profiles = self.make_sidecar(hermes_home).response_for("GET", "/profiles")
            active = self.make_sidecar(hermes_home).response_for("GET", "/active-profile")

        self.assertEqual(profiles.status, 200)
        self.assertEqual(profiles.body["profiles"], [{"id": "builder", "name": "Builder Prime"}])
        self.assertEqual(active.body["profile"], {"id": "builder", "name": "Builder Prime"})
        self.assertEqual(active.body["source"], "local-state")

    def test_profiles_prefer_verified_cli_list_when_available(self):
        cli_output = """
 Profile          Model                        Gateway      Alias
 ───────────────    ───────────────────────────    ───────────    ────────────
◆default         gpt-5.5                      stopped      —
 frieren         deepseek-v4-flash            stopped      frieren
"""
        with tempfile.TemporaryDirectory() as temp_dir:
            sidecar = HermesGuildSidecar(
                SidecarConfig(
                    hermes_home=Path(temp_dir),
                    gateway_base_url="http://127.0.0.1:1",
                    check_gateway=False,
                    check_cli=True,
                )
            )
            with patch("shutil.which", return_value="/usr/local/bin/hermes"):
                with patch("subprocess.run") as run:
                    run.return_value.returncode = 0
                    run.return_value.stdout = cli_output
                    run.return_value.stderr = ""
                    profiles = sidecar.response_for("GET", "/profiles")
                    active = sidecar.response_for("GET", "/active-profile")

        self.assertEqual(profiles.status, 200)
        self.assertEqual(profiles.body["source"], "cli")
        self.assertEqual(profiles.body["active_profile_id"], "default")
        self.assertEqual(
            profiles.body["profiles"],
            [
                {"id": "default", "name": "default", "active": True, "model": "gpt-5.5", "gateway_status": "stopped"},
                {
                    "id": "frieren",
                    "name": "frieren",
                    "active": False,
                    "model": "deepseek-v4-flash",
                    "gateway_status": "stopped",
                    "alias": "frieren",
                },
            ],
        )
        self.assertEqual(active.body["source"], "cli")
        self.assertEqual(active.body["profile"]["id"], "default")

    def test_local_state_summary_redacts_secret_values_and_bounds_logs(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            hermes_home = Path(temp_dir)
            (hermes_home / ".env").write_text("HERMES_API_KEY=super-secret\nPUBLIC_FLAG=true\n")
            logs = hermes_home / "logs"
            logs.mkdir()
            (logs / "hermes.log").write_text("x" * 5000)

            response = self.make_sidecar(hermes_home).response_for("GET", "/local-state/summary")
            encoded = json.dumps(response.body)

        self.assertEqual(response.status, 200)
        self.assertNotIn("super-secret", encoded)
        self.assertEqual(response.body["env"]["configured_keys"], ["HERMES_API_KEY", "PUBLIC_FLAG"])
        self.assertLessEqual(response.body["logs"]["tail_bytes"], 4096)

    def test_env_summary_never_exposes_values(self):
        summary = redacted_env_summary("TOKEN=abc123\nEMPTY=\nMALFORMED\n")

        self.assertEqual(summary["configured_keys"], ["TOKEN"])
        self.assertEqual(summary["empty_keys"], ["EMPTY"])
        self.assertNotIn("abc123", json.dumps(summary))

    def test_sidecar_rejects_non_loopback_hosts(self):
        self.assertTrue(is_loopback_host("127.0.0.1"))
        self.assertTrue(is_loopback_host("localhost"))
        self.assertTrue(is_loopback_host("::1"))
        self.assertFalse(is_loopback_host("0.0.0.0"))


if __name__ == "__main__":
    unittest.main()
