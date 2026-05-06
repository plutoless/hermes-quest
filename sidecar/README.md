# Hermes Companion Sidecar

This optional loopback sidecar exposes compatibility probes for local Hermes environments. It is not the primary product surface and should not define UX direction.

The preferred runtime path is the Hermes bridge used by the desktop companion. The sidecar may be useful for local capability checks or compatibility experiments when the bridge cannot read a Hermes signal directly.

## Run

```bash
python3 sidecar/hermes_companion_sidecar.py --host 127.0.0.1 --port 8765
```

## Self-Test

```bash
python3 sidecar/hermes_companion_sidecar.py --self-test
```

## Notes

- The service is intended for loopback use only.
- Missing Hermes data should be reported as unavailable, not replaced with fake production data.
