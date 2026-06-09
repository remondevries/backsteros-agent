# BacksterOS Agent

A macOS Tauri app for talking to a local Cursor agent with markdown notes workspace access, Linear MCP integration, Google Calendar MCP integration, and Whoop MCP integration (via Totem).

> **Project name:** BacksterOS Agent · **Repo:** [github.com/remondevries/backsteros-agent](https://github.com/remondevries/backsteros-agent) · **Config dir:** `~/.backsteros-agent/`

## Requirements

- Rust + Xcode Command Line Tools
- Bun
- Node.js (for Vite/Tauri CLI and MCP subprocesses)
- `CURSOR_API_KEY` from [Cursor Dashboard → Integrations](https://cursor.com/dashboard/integrations)

## Setup

```bash
cd ~/code/backsteros-agent
cp .env.example .env
# Edit .env with CURSOR_API_KEY and optional LINEAR_API_KEY
npm install
cd sidecar && bun install
```

## Development (browser + sidecar)

```bash
npm run dev:all
```

Open http://localhost:5173 — the Vite dev server proxies API calls to the sidecar on port 3847.

## Development (Tauri app)

Terminal 1:

```bash
npm run dev:sidecar
```

Terminal 2:

```bash
npm run tauri dev
```

Global shortcut: **Cmd+Shift+A** toggles the window.

## Sidecar proof of life

```bash
cd sidecar
NOTES_DIR=~/notes CURSOR_API_KEY=... bun run proof "List markdown files here"
```

## Build

```bash
npm run tauri:build
```

This compiles the Bun sidecar into `src-tauri/binaries/` and builds the `.app` bundle.

## Architecture

- **Tauri shell** — native window, global hotkey, sidecar lifecycle
- **Bun sidecar** — `@cursor/sdk` local agent, SSE API, settings persistence
- **React UI** — Linear-style activity timeline, entity lists, approval cards, dashboards (Whoop, Linear, Obsidian)

## Notes workspace

On first launch, pick a folder for markdown notes. The app initializes git (if missing), a slim `AGENTS.md` for your personal vault conventions, and approval hooks in `.cursor/hooks.json`.

### Lazy agent context

BacksterOS Agent does not load all workspace rules on every turn. Instead, the sidecar injects guidance only for the services a message needs:

- **Obsidian** — workspace tools, folder-specific rules (Daily, Projects, Inbox, etc.), and your vault `AGENTS.md`
- **Linear** — focused issue lookup/update behavior
- **Google Calendar** — account and OAuth guidance
- **Whoop** — recovery/sleep/strain behavior, with daily-note crossover rules when both Whoop and notes are active

General knowledge questions stay lean because no service context is injected unless the message matches that service.

Put long-lived vault preferences in `AGENTS.md`. BacksterOS Agent reads that file only on note-related turns.

## User profile

Identity and timezone live in `~/.backsteros-agent/profile.md`. BacksterOS Agent injects this small block on every turn so "today", scheduling, and daily notes use your timezone. Copy `profile.example.md` to get started, or let the sidecar create the file on first launch.

## Agent profile

Assistant identity and behavior live in `~/.backsteros-agent/agent.md`. BacksterOS Agent injects this before your user profile on every turn. Copy `agent.example.md` to customize name, tone, purpose, and boundaries.

Both files can be edited from **Settings → Profiles** in the app.

## Runtime context

On every message, BacksterOS Agent also injects a small `[Now]` block (date and weekday in your timezone). When a turn uses Obsidian, Linear, Calendar, or Whoop, the sidecar adds:

- **Obsidian** — vault path, vault name, workspace tools, folder rules, and vault `AGENTS.md` (truncated if very large)
- **Integrations** — setup hints when a service is selected but not configured or authenticated
- **Service guidance** — the focused behavior rules for each active integration

Profile and agent files are cached in memory and reloaded when you save them.

## Linear MCP

Authenticate Linear MCP once in the Cursor desktop app, or set `LINEAR_API_KEY` in `~/.backsteros-agent/.env`.

## Google Calendar MCP

BacksterOS Agent attaches Google Calendar tools when a message looks calendar-related (meetings, schedule, availability, etc.).

1. Create a Google Cloud OAuth **Desktop app** credential with the Calendar API enabled.
2. Save the downloaded JSON somewhere stable, e.g. `~/.backsteros-agent/google-oauth.keys.json`.
3. Add to `~/.backsteros-agent/.env`:

```bash
GOOGLE_OAUTH_CREDENTIALS=/Users/you/.backsteros-agent/google-oauth.keys.json
```

The default Google account nickname is `personal` (see `DEFAULT_GOOGLE_CALENDAR_ACCOUNT` in `sidecar/src/config.ts`). Override with `GOOGLE_CALENDAR_ACCOUNT` in `~/.backsteros-agent/.env` if needed.

4. Ask the agent to authenticate with Google Calendar on first use. Tokens are stored at `~/.backsteros-agent/google-calendar-tokens.json`.

The sidecar launches `@cocal/google-calendar-mcp` via `npx` when calendar tools are needed. Node.js/npx must be available on the PATH.

## Whoop MCP (Totem)

BacksterOS Agent attaches [Totem](https://github.com/briangaoo/totem) Whoop tools when a message looks fitness-related (recovery, sleep, strain, workouts, etc.). Totem requires **Node.js 24+**.

1. Authenticate with Whoop once in Terminal:

```bash
npx -y @briangaoo/totem auth
```

2. Copy the token lines into `~/.backsteros-agent/totem.env` (created on first use, or click **Whoop setup** in the app banner):

```bash
WHOOP_EMAIL=you@example.com
WHOOP_IOS_BEARER_TOKEN=...
WHOOP_COGNITO_REFRESH_TOKEN=...
WHOOP_USER_ID=...
WHOOP_INSTALLATION_ID=...
```

3. Ask the agent, for example: *"Update today's daily note with my Whoop sleep, recovery, and strain."*

The sidecar launches `@briangaoo/totem` via `npx` when Whoop tools are needed. Re-run `totem auth` about every 30 days when tokens expire.

**Daily note automation:** ask each morning, or schedule a macOS `launchd` job that POSTs to the sidecar with a fixed prompt once you're happy with the format.

For the packaged app, create `~/.backsteros-agent/.env`:

```bash
mkdir -p ~/.backsteros-agent
cp .env.example ~/.backsteros-agent/.env
# edit ~/.backsteros-agent/.env with CURSOR_API_KEY
```
