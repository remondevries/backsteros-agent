# Linear verification — backsteros-agent

Use this checklist to verify changes before moving an issue to **In Review** (agents never mark Done).

## Cloud-safe checks (recommended default)

- `bun test`
- `bun run build` (compile + UI build)
- `bun run build:sidecar` (Bun sidecar compile; server/flows)

## If the change touches Tauri runtime

If the change is in `src-tauri/**` (or depends on `@tauri-apps/api/*` window/runtime behavior):

- verify locally (desktop run) to confirm UI/desktop runtime behavior that a cloud agent cannot validate

## If external credentials are required

If Whoop / Google Calendar / etc. credentials are not available in the verification environment:

- verify what you can (parsing, wiring, server behavior with fixtures)
- clearly document what was skipped and what a human should validate locally

