# Hermes Companion Sidecar

This optional loopback sidecar exposes compatibility probes for local Hermes environments. It is not the primary product surface and should not define UX direction.

The preferred runtime path is the Hermes bridge used by the desktop companion. The sidecar may be useful for local capability checks or compatibility experiments when the bridge cannot read a Hermes signal directly.

## Run

Run the existing sidecar module with loopback host and port arguments when local compatibility probes are needed.

## Self-Test

The existing sidecar module includes a self-test entry point for local verification.

## Notes

- The service is intended for loopback use only.
- Missing Hermes data should be reported as unavailable, not replaced with fake production data.
- Existing Python module and class names are historical implementation details; this docs reset does not rename code symbols.
