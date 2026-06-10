# Backster OS — Agent instructions

Obsidian plugin. **Bun only** — do not use npm or pnpm.

## Commands

| Task | Command |
|------|---------|
| Install | `bun install` |
| Build plugin | `bun run build` → `main.js`, `styles.css` (gitignored) |
| Watch (Obsidian) | `bun run dev:plugin` |
| Browser HMR (full app) | `bun run dev` — Vite app in `dev/` |
| Design drafts (TSX preview) | `bun run designs` — drafts in `agent/designs/components/` and `agent/designs/views/` |
| Design task queue | `bun run designs:tasks` — sync report by `status:` (no catalog write) |
| Scaffold design TSX | `bun run designs:scaffold-showcase <ComponentName>` |
| Scaffold TSX from orphan draft | `bun run designs:scaffold-tsx <draftPath>` |
| **Before PR** | `bun run ci` |
| Tests | `bun test` |
| Typecheck | `bun run typecheck` |
| Agent preflight | `bun test` and `bun run build` |
| Design sync check | `bun run agent:validate-design-sync` |

## Hard rules

1. **Never import `dev/` from `src/main.ts`** — plugin bundle is a single library entry.
2. **UI must not import `@/platform/obsidian/*`** — use `src/lib/*Exports.ts` barrels from Preact code.
3. **Do not commit secrets** — `data.json` may contain API keys; it is gitignored.

## Styling (code-first)

- **Tailwind in TSX** — components may use Tailwind utility strings in `className` (especially when porting from HTML design drafts). Prefer theme-aware utilities (`text-backster-text-muted`, `bg-backster-bg`, …) over hardcoded colors when the UI must follow light/dark/system.
- **`backsteros-*` + feature CSS** — still used for shared patterns, motion/animation hooks, Obsidian host overrides, and legacy components. New work can mix utilities in TSX with semantic classes where needed.
- **Tailwind via `@apply`** — optional in `src/ui/styles/**` for repeated chrome, complex selectors, or Obsidian `!important` resets (see `foundation/base.css`).
- Global styles entry: `src/ui/styles/index.css` (Tailwind + feature CSS).
- Preview changes in **`bun run dev`** (integration) or **`bun run designs`** (design TSX showcases).
- Design deploy: port **DOM structure + class strings** from the draft into JSX — not a static HTML paste. See [`agent/designs/designs.mdc`](agent/designs/designs.mdc).

## Agent kit

Linear + Cursor workflow: [`agent/`](agent/). **Agents hand off at In Review — never mark Done.**

| Topic | Where |
|-------|--------|
| Kit overview + bootstrap | [`agent/README.md`](agent/README.md) |
| Session rules | [`.cursor/rules/agent.mdc`](.cursor/rules/agent.mdc) |
| Setup (single file) | [`agent/project.config.json`](agent/project.config.json) |
| Linear create/update/hand off | **`linear-workflow`** skill + [`agent/project.config.json`](agent/project.config.json) · [`agent/linear/verification.md`](agent/linear/verification.md) |
| Preflight (cloud vs local) | [`agent/preflight/preflight.md`](agent/preflight/preflight.md) |
| Environments (local vs cloud) | [`agent/environments/environments.md`](agent/environments/environments.md) |
| Design — drafts, sync, preview | [`agent/designs/designs.mdc`](agent/designs/designs.mdc) |

## More detail (read when relevant)

| Doc | Contents |
|-----|----------|
| [`docs/conventions.md`](docs/conventions.md) | Architecture, layout, CSS variants, shortcuts, code quality |
| [`dev/README.md`](dev/README.md) | Browser dev shell, fixture data |
| [`README.md`](README.md) | Human-oriented setup |
| [`.github/workflows/ci.yml`](.github/workflows/ci.yml) | CI pipeline |

