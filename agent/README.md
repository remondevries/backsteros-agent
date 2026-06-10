# Agent kit

Portable Cursor + Linear workflow. Copy `agent/`, `.cursor/rules/agent.mdc`, and adapt `AGENTS.md`.

## Layout

Each workflow/tool lives in its own folder. A single Cursor rule routes agents to the right folder:

```
agent/
  project.config.json    # single setup file (shared by all workflows)
  README.md
  designs/               # design workflow — designs.mdc + components/ + views/
    designs.mdc
    components/
    views/
  linear/                # Per-repo Linear verification checklist
    verification.md
  preflight/             # cloud vs local scope check before agent work
    preflight.md
    preflight.mjs
    preflight.test.mjs
  environments/          # local vs remote setup and test log
    environments.md
    cloud.md

.cursor/rules/
  agent.mdc              # router + hard stops (always-on)
```

Add future workflows as sibling skill folders (`agent/github/`, …) and one row in `agent.mdc`.

Design work: read [`designs/designs.mdc`](designs/designs.mdc) first.

---

## Single setup file

**[`project.config.json`](project.config.json)** — fill this one file when bootstrapping a new project:

| Section | JSON path | Contents |
|---------|-----------|----------|
| Identity | `projectName`, `repo` | Display name, GitHub URL |
| Design system | `designSystem.*` | Authority, profile, draft paths, catalog filters, icon counts |
| Linear | `linear.*` | Team, project, labels, states, defaults |
| Scope | `scope.paths.*` | `localOnly`, `caution`, `cloudSafe` path patterns (used by preflight) |

**Linear playbook (global):** Cursor skill **`linear-workflow`** at `~/.cursor/skills/linear-workflow/` — polish once, all projects. **Per-repo:** [`project.config.json`](project.config.json) (UUIDs) + [`linear/verification.md`](linear/verification.md) (CI / local checks).

Design **preview runtime** (Tailwind bundles, status folders, component-tool paths) lives in [`component-tool.config.mjs`](../../component-tool.config.mjs) — see [`designs/designs.mdc`](designs/designs.mdc).

---

## Workflows

| Folder | Files | Copy / customize |
|--------|-------|------------------|
| [`linear/`](linear/) | [`verification.md`](linear/verification.md) | Project CI / verification checklist only |
| [`preflight/`](preflight/) | [`preflight.md`](preflight/preflight.md), [`preflight.mjs`](preflight/preflight.mjs), [`preflight.test.mjs`](preflight/preflight.test.mjs) | Rewrite `preflight.md` opening paragraph; copy scripts as-is |
| [`environments/`](environments/) | [`environments.md`](environments/environments.md), [`cloud.md`](environments/cloud.md) | Remote setup + test log; local assumed working |
| [`designs/`](designs/) | [`designs.mdc`](designs/designs.mdc), [`components/`](designs/components/), [`views/`](designs/views/) | Design workflow |
| `.cursor/rules/` | [`agent.mdc`](../.cursor/rules/agent.mdc) | **Rewrite** Obsidian/runtime line when copying kit |

Entry point: [`AGENTS.md`](../AGENTS.md).

---

## Bootstrap checklist

### 1. Copy files

```
agent/
.cursor/rules/agent.mdc
AGENTS.md
```

Install the global **`linear-workflow`** Cursor skill once (not per repo): `~/.cursor/skills/linear-workflow/SKILL.md`.

### 2. Linear workspace

Labels under group **`agent`**: `cloud`, `review`, `local`.

**Triage Intelligence Guidance** example:

> Suggest one `agent` label: `cloud` for lib/tests/docs, `review` for UI, `local` for runtime integration. Default to `review`.

### 3. Fill `project.config.json`

```json
{
  "projectName": "My Project",
  "repo": "https://github.com/org/repo",
  "linear": {
    "defaultProject": "main",
    "team": { "id": "…", "key": "…", "name": "…" },
    "projects": { "main": { "id": "…", "name": "…" } },
    "labels": {
      "agentCloud": { "id": "…", "name": "cloud", "group": "agent" },
      "agentReview": { "id": "…", "name": "review", "group": "agent" },
      "agentLocal": { "id": "…", "name": "local", "group": "agent" }
    },
    "states": { "inProgress": { "id": "…" }, "inReview": { "id": "…" }, "done": { "id": "…" } },
    "defaults": { "priority": 3, "assigneeId": "…" }
  },
  "scope": {
    "paths": {
      "localOnly": ["…"],
      "caution": ["…"],
      "cloudSafe": ["…"]
    }
  }
}
```

Resolve UUIDs via Linear MCP: `list_teams`, `list_projects`, `list_issue_labels`, `list_issue_statuses`.

### 4. Path pattern syntax (`scope.paths`)

| Form | Example |
|------|---------|
| Directory prefix | `src/lib/**` |
| Exact file | `src/main.ts` |
| Suffix | `suffix:.test.ts` |
| Wildcard | `tsconfig*.json` |

### 5. Rewrite project-specific prose

- `.cursor/rules/agent.mdc` — what cloud agents cannot run (Obsidian line)
- `preflight/preflight.md` — first paragraph
- `linear/verification.md` — CI command, verification checklist
- `AGENTS.md` — commands, hard rules

### 6. Design system (optional)

Fill `designSystem` in `project.config.json` when the project uses design drafts. See [`designs/designs.mdc`](designs/designs.mdc).

```json
"designSystem": {
  "enabled": true,
  "profile": "brownfield-code-first",
  "authority": {
    "tokens": "code",
    "primitives": "code",
    "tier1Components": "code",
    "fullComponents": "code",
    "screens": "code",
    "runtime": "code"
  },
  "paths": {
    "iconCatalog": "src/ui/icons/iconCatalog.ts",
    "designDraftsRoot": "agent/designs",
    "designComponentsRoot": "agent/designs/components",
    "designViewsRoot": "agent/designs/views"
  },
  "expected": { "registeredIcons": 0, "standaloneIcons": 0 }
}
```

Set `designSystem.enabled: false` for code-only repos.

Add [`component-tool.config.mjs`](../../component-tool.config.mjs) when using the external preview app — see [`designs/designs.mdc`](designs/designs.mdc).

### 7. `package.json` + CI

```json
  "agent:preflight": "bun test",
"agent:validate-design-sync": "node scripts/validate-design-sync.mjs"
```

```yaml
- name: Design sync validation
  run: bun run agent:validate-design-sync -- --advisory
  continue-on-error: true

- name: Cloud agent preflight advisory
  if: github.event_name == 'pull_request'
  run: bun test
  continue-on-error: true
```

### 8. Workflow

**Agents never mark Done.** Maximum: **In Review**. Human closes after review.

**Git branches:** Linear MCP `get_issue` → `gitBranchName`. Use that name for checkout, push, and PR — do not invent names like `agent-kit-restructure`.

---

## Adding a new workflow

1. Create `agent/{name}/` with docs (+ scripts if needed).
2. Add config section to `project.config.json` if required.
3. Add one row to the router table in `.cursor/rules/agent.mdc`.
4. Add one row to the Agent kit table in `AGENTS.md`.
5. Add a `package.json` script only if the workflow has a CLI tool.
6. Add a separate `.cursor/rules/{name}.mdc` **only** if it needs always-on context beyond the router (e.g. a long-running local service must be up).

