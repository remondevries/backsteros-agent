# Backster OS — Agent instructions

BacksterOS Agent: **React + Vite UI**, **Bun sidecar**, optional **Tauri shell**. Use **npm** for root scripts; **bun** in `sidecar/`.

## Commands

| Task | Command |
|------|---------|
| Install | `npm install` && `cd sidecar && bun install` |
| Browser dev | `npm run dev` (alias: `dev:web`, `dev:all`) — sidecar + Vite; `dev:vite` for Vite only |
| Web production build | `npm run build:web` |
| Serve web + API | `cd sidecar && bun run src/server.ts` (after `build:web`) |
| Tauri dev | `npm run tauri:dev` |
| Tauri build | `npm run tauri:build` |
| **Before PR** | `npm run ci` |
| Sidecar tests | `cd sidecar && bun test` |
| Typecheck | `npm run typecheck` |
| Web smoke | `npm run smoke:web` (after `build:web`) |
| Desktop sidecar bundle | `npm run build:sidecar` (copies `sidecar/` → `src-tauri/resources/`; gitignored) |

## Hard rules

1. **Do not commit secrets** — `~/.backsteros-agent/.env` and tokens stay local.
2. **Platform code** lives in `src/platform/` — prefer over scattered `@tauri-apps/*` imports.
3. **Linear-first default** — vault UI/API gated by `PRODUCT_MODE`; do not require `notesPath` for core chat.

## Agent kit

Linear + Cursor workflow: [`agent/`](agent/). **Agents hand off at In Review — never mark Done.**

| Topic | Where |
|-------|--------|
| Kit overview | [`agent/README.md`](agent/README.md) |
| Session rules | [`.cursor/rules/agent.mdc`](.cursor/rules/agent.mdc) |
| Config | [`agent/project.config.json`](agent/project.config.json) |
| Linear workflow | **`linear-workflow`** skill |
| Preflight | [`agent/preflight/preflight.md`](agent/preflight/preflight.md) |
| Environments | [`agent/environments/environments.md`](agent/environments/environments.md) |

## More detail

| Doc | Contents |
|-----|----------|
| [`docs/conventions.md`](docs/conventions.md) | Architecture, layout, shortcuts |
| [`README.md`](README.md) | Human setup and deploy |
