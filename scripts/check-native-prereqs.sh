#!/usr/bin/env bash
set -u

missing=0

check_command() {
  local name="$1"
  if command -v "$name" >/dev/null 2>&1; then
    printf 'ok: %s found\n' "$name"
  else
    printf 'missing: %s\n' "$name"
    missing=1
  fi
}

check_pkg() {
  local name="$1"
  if ! command -v pkg-config >/dev/null 2>&1; then
    printf 'skipped: pkg-config %s (pkg-config is missing)\n' "$name"
    missing=1
    return
  fi

  if pkg-config --exists "$name" >/dev/null 2>&1; then
    printf 'ok: pkg-config %s found\n' "$name"
  else
    printf 'missing: pkg-config %s\n' "$name"
    missing=1
  fi
}

check_command cargo
check_command rustc
check_command rustup
check_command pkg-config
check_pkg webkit2gtk-4.1
check_pkg librsvg-2.0

if [ "$missing" -ne 0 ]; then
  cat <<'EOF'

Native Tauri prerequisites are incomplete.

Ubuntu 24.04 setup:
  sudo apt-get update
  sudo apt-get install -y cargo rustc pkg-config libwebkit2gtk-4.1-dev librsvg2-dev

Then rerun:
  bun run check:native
  bun run tauri:dev
EOF
  exit 1
fi

printf '\nNative Tauri prerequisites look available.\n'
