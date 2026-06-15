# BacksterOS Agent

A **web-first** agent console: React UI + Bun/Hono sidecar (Cursor SDK, Linear, Calendar, Whoop). Optional **Tauri** desktop shell loads the same app locally or from a remote server.

> **Project name:** BacksterOS Agent · **Repo:** [github.com/remondevries/backsteros-agent](https://github.com/remondevries/backsteros-agent) · **Config dir:** `~/.backsteros-agent/`

## Requirements

- Bun (sidecar + scripts)
- Node.js (Vite/Tauri CLI and MCP subprocesses)
- Rust + Xcode Command Line Tools (Tauri desktop only)
- `CURSOR_API_KEY` from [Cursor Dashboard → Integrations](https://cursor.com/dashboard/integrations)

## Setup

```bash
cd ~/code/backsteros-agent
npm install
cd sidecar && bun install
```

On first launch, open **Settings → Integrations** for Cursor API key and optional services. Power users can edit `~/.backsteros-agent/.env` (see `.env.example`).

## Development (browser + sidecar)

```bash
npm run dev
```

Open http://localhost:5173 — Vite HMR for the UI; `/api` is proxied to the sidecar on port 3847 (`dev-token-change-me`).

`npm run dev:web` and `npm run dev:all` are aliases for the same full stack. Use `npm run dev:vite` only if the sidecar is already running separately.

## Production web (single origin)

```bash
npm run build:web
cd sidecar && SIDECAR_HOST=0.0.0.0 SIDECAR_TOKEN=your-secret bun run src/server.ts
```

Open http://localhost:3847 — UI and API share one origin. Sign in via Settings → Account → Server access (or set `VITE_SIDECAR_TOKEN` at build time for automated login).

Docker:

```bash
docker build -t backsteros-agent .
docker run --rm -p 3847:3847 -e CURSOR_API_KEY=... -e SIDECAR_TOKEN=... backsteros-agent
```

## Development (Tauri app)

```bash
npm run tauri:dev
```

Runs sidecar + Vite (`dev:all`), then opens the desktop window. Global shortcut: **Cmd+Shift+A** toggles the window.

**Remote server shell:** set `BACKSTER_SERVER_URL=https://your-server` before launching Tauri — the app loads that URL and skips embedding the sidecar.

## Build

```bash
npm run build:web          # Vite dist only (server deploy)
npm run build:sidecar      # Copy sidecar → src-tauri/resources/ (desktop only; gitignored)
npm run tauri:build        # Desktop .app + embedded sidecar (runs build:sidecar)
npm run ci                 # sidecar tests + web build + smoke
```

**Deploy** uses `sidecar/` + `dist/` only (`Dockerfile`). The copy under `src-tauri/resources/sidecar/` is build output for the Tauri bundle — not committed.

**Desktop remote mode:** after server deploy, set `BACKSTER_SERVER_URL` so Tauri loads the hosted app and skips embedding the sidecar.

## Architecture

```text
Browser / Tauri webview  →  Bun server (static SPA + Hono API + Cursor agent + MCP)
```

- **Linear-first mode** (`PRODUCT_MODE=linear`, default): Projects UI + chat without a local Obsidian vault; agent cwd is `~/.backsteros-agent/workspace`.
- **Full vault mode** (`PRODUCT_MODE=full`): local notes folder, vault nav, and Obsidian integrations as before.
- **Tauri shell** — optional window, global hotkey, native notifications when backgrounded; can load a remote deployment.

## Agent context

The sidecar injects service-specific guidance (Linear, Calendar, Whoop, vault tools) only when a message needs them — general questions stay lean.

## Environment variables

| Variable | Purpose |
|----------|---------|
| `CURSOR_API_KEY` | Cursor agent |
| `SIDECAR_TOKEN` | API auth (bearer + session cookie value) |
| `SIDECAR_HOST` | Bind address (`127.0.0.1` dev, `0.0.0.0` deploy) |
| `SIDECAR_PORT` | HTTP port (default 3847) |
| `PRODUCT_MODE` | `linear` (default) or `full` |
| `VITE_PRODUCT_MODE` | Client mirror of product mode |
| `BACKSTER_SERVER_URL` | Tauri: load remote app URL |
| `ALLOWED_ORIGINS` | Extra CORS origins (dev Vite split) |
