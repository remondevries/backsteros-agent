# Preflight — cloud vs local verification

BacksterOS Agent is a **standalone desktop app (Tauri)** plus a **Bun sidecar** HTTP server. Verification depends on whether the behavior you’re asked to validate requires the desktop runtime.

## Decision rule

Treat this repo as:

- **Cloud-verifiable by default** for:
  - unit tests (`bun test`)
  - server logic / flow orchestration (sidecar HTTP endpoints)
  - filesystem “vault-like” read/write behaviors using fixtures
  - deterministic formatting/parsing logic

- **Local-only** for:
  - any behavior that requires a Tauri window / webview runtime (window APIs, UI integration)
  - desktop shortcuts / gestures that only exist when the app is running
  - anything described as “verify in the desktop app”, “verify shortcuts”, “verify gestures”, or “verify reload behavior”

If the task mixes both, prefer:

1. Cloud verification for the non-local portion (tests / server logic).
2. Local verification for the Tauri/desktop-only portion.

## What to check in the repo (fast)

1. If the relevant code is under `src-tauri/**`, it’s likely **local-only**.
2. If the relevant code is under `sidecar/**` or `src-tauri/resources/sidecar/**`, it’s usually **cloud-safe**.
3. If the relevant code uses `@tauri-apps/api/*` or depends on window APIs, assume **local-only** unless the code is already guarded for browser dev mode.

## Suggested commands for cloud

- `bun test`
- `bun run build` (optional, for compile-level confidence)

## If you’re blocked by credentials

If the task requires real external auth (Whoop/Google Calendar/etc.) and credentials are not available in the cloud environment:

- still run what can be verified without them
- report which parts were skipped due to missing credentials
- label/communicate accordingly so a human can run local setup when needed

