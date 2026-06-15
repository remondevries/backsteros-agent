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

**Staging (Kamal):** [`docs/deploy-staging.md`](docs/deploy-staging.md) — `staging.backsteros.com` on backsteros.com via `config/deploy.yml`.

## Development (Tauri app)

```bash
npm run tauri:dev
```

Runs sidecar + Vite (`dev:all`), then opens the desktop window. Global shortcut: **Cmd+Shift+A** toggles the window.

**Remote server shell:** add `BACKSTER_SERVER_URL=https://your-server` to `~/.backsteros-agent/.env` (or set it when launching). The desktop keeps its **local UI** (terminal, native dialogs) and sends API/agent requests to that server. It does **not** load the hosted web page in the webview.

## Build

```bash
npm run build:web          # Vite dist only (server deploy)
npm run build:sidecar      # Copy sidecar → src-tauri/resources/ (desktop only; gitignored)
npm run tauri:build        # Desktop .app + embedded sidecar (runs build:sidecar)
npm run ci                 # sidecar tests + web build + smoke
```

**Deploy** uses `sidecar/` + `dist/` only (`Dockerfile`). The copy under `src-tauri/resources/sidecar/` is build output for the Tauri bundle — not committed.

### Desktop ↔ server (same repo, two deploy targets)

| Surface | What runs | When to use |
|---------|-----------|-------------|
| **Browser** | Hosted UI + server sidecar | Default; shareable URL |
| **Desktop (local)** | Local UI + embedded sidecar | Offline, full vault, local agent cwd |
| **Desktop (remote API)** | Local UI + `BACKSTER_SERVER_URL` | Same agent/data as staging/prod; keep terminal & disk access |

**UI parity:** build the desktop app from the **same git commit** you deployed to the server. The remote API mode updates agent behavior on the server immediately, but UI changes ship with a new desktop build. When the desktop UI is behind the server, a **warning banner** shows the client vs server commit (from `/healthz` `appBuildSha`).

**Server CORS:** when using desktop remote mode, `ALLOWED_ORIGINS` on the server must include `https://tauri.localhost` and `http://tauri.localhost` (already set in `config/deploy.yml` for staging).

Example `~/.backsteros-agent/.env`:

```bash
BACKSTER_SERVER_URL=https://staging.backsteros.com
# SIDECAR_TOKEN=...   # only if BACKSTER_SERVER_ACCESS_AUTH=1 on the server
```

Launch:

```bash
npm run tauri:dev    # dev: local Vite UI + remote API if BACKSTER_SERVER_URL is set
npm run tauri:build  # then open the .app (reads ~/.backsteros-agent/.env)
```

## Architecture

```text
Browser / Tauri webview  →  Bun server (static SPA + Hono API + Cursor agent + MCP)
```

- **Linear-first mode** (`PRODUCT_MODE=linear`, default): Projects UI + chat without a local Obsidian vault; agent cwd is `~/.backsteros-agent/workspace`.
- **Full vault mode** (`PRODUCT_MODE=full`): local notes folder, vault nav, and Obsidian integrations as before.
- **Tauri shell** — optional window, global hotkey, native notifications when backgrounded; can use a remote sidecar via `BACKSTER_SERVER_URL` while keeping local UI and PTY.

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
| `BACKSTER_SERVER_URL` | Desktop: API base URL for remote sidecar (local UI stays in the app) |
| `ALLOWED_ORIGINS` | Extra CORS origins (dev Vite split) |
