# Hermes Companion Agent Instructions

## Product Direction

Hermes Companion is a desktop-native companion app for Hermes. The product centers on lightweight desktop companions that can remain visible while the user works, open quick chat, and route messages through Hermes when available.

The current product should be treated as a desktop companion app.

Primary product spec: `docs/DESIGN.md`.

## Current Scope

- Floating transparent desktop companion windows.
- Companion picker and multiple visible companion instances.
- Appearance controls for name, visibility, size, animation, and visual source state.
- Settings controls for dragging, speech bubbles, click-through behavior, and bridge mode.
- Chat from the companion through mock, real, or auto provider modes.
- Hermes bridge availability surfaced honestly.
- Native Tauri windows for the main companion, pet route, appearance panel, companions panel, and settings panel.

## Out Of Scope

Do not expand the product beyond the current companion surface unless the user explicitly changes direction.

Specifically avoid adding dashboard workflows, decorative progression systems, task-management surfaces, provider-management pages, automatic routing, queues, or group chat.

Mock data must not be used as an invisible production fallback in real mode.

## Implementation Guardrails

- Keep the first screen focused on the usable companion experience, not a landing page.
- Preserve the desktop-native behavior: transparent windows, draggable companion surface, compact controls, and always-on-top utility.
- Companion UI should be lightweight and direct. Avoid decorative ceremony that slows down chat or window management.
- If Hermes is unavailable, show clear bridge/provider status instead of pretending real Hermes output exists.
- Keep mock behavior explicit in copy, tests, and development harnesses.
- Use existing React, Tauri, bridge, and styling patterns before adding new abstractions.
- Keep changes scoped to the companion product unless the user explicitly asks for a broader code rename or architecture migration.

## Naming

Use these terms consistently:

- Product: Hermes Companion.
- Desktop entity: companion.
- Management surface: Companions panel.
- Visual controls: Appearance panel.
- Runtime controls: Settings panel.
- Provider modes: mock, real, auto.

Avoid old terms in active docs and UI copy unless referring to historical code names that have not yet been migrated.
