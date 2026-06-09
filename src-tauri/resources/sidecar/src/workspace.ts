import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export function ensureGitRepo(notesPath: string): void {
  if (!existsSync(join(notesPath, ".git"))) {
    spawnSync("git", ["init"], { cwd: notesPath, stdio: "ignore" });
  }
}

export function getGitStatus(notesPath: string): string {
  if (!existsSync(join(notesPath, ".git"))) {
    return "No git repository initialized.";
  }
  try {
    return execFileSync("git", ["status", "--short"], {
      cwd: notesPath,
      encoding: "utf8",
    }).trim();
  } catch {
    return "Unable to read git status.";
  }
}

export function getGitDiff(notesPath: string): string {
  if (!existsSync(join(notesPath, ".git"))) {
    return "";
  }
  try {
    const diff = execFileSync("git", ["diff", "--stat"], {
      cwd: notesPath,
      encoding: "utf8",
    }).trim();
    return diff;
  } catch {
    return "";
  }
}

export function revertLastChanges(notesPath: string): boolean {
  if (!existsSync(join(notesPath, ".git"))) return false;
  const result = spawnSync("git", ["checkout", "--", "."], {
    cwd: notesPath,
    stdio: "ignore",
  });
  return result.status === 0;
}

const WORKSPACE_AGENTS_TEMPLATE = `# BacksterOS Agent Notes Workspace

BacksterOS Agent injects workspace rules per message when note tools are active.
Use this file for your personal vault conventions, naming patterns, and long-lived preferences.

## Folder structure
- \`Daily/\` — daily notes
- \`Projects/\` — project notes
- \`Inbox/\` — quick captures
- \`Meetings/\` — meeting notes
- \`Letters/\` — letters
- \`Contacts/\` — people
- \`Organizations/\` — companies and orgs
- \`specs/\` — specs and plans
- \`archive/\` — read-only archived notes

## Your conventions
Add anything Backster should always respect for this vault below.
`;

export function ensureWorkspaceRules(notesPath: string): void {
  const agentsPath = join(notesPath, "AGENTS.md");
  if (!existsSync(agentsPath)) {
    writeFileSync(agentsPath, WORKSPACE_AGENTS_TEMPLATE, "utf8");
  }
}

const preparedWorkspaces = new Set<string>();

export function prepareWorkspace(
  notesPath: string,
  sidecarPort: number,
  sidecarToken: string,
): void {
  // Workspace scaffolding (git init, AGENTS.md, hooks.json) is idempotent and
  // only needs to happen once per notes path per process. Skipping the repeat
  // filesystem work keeps it off the hot path before every agent.send().
  if (preparedWorkspaces.has(notesPath)) {
    return;
  }
  ensureGitRepo(notesPath);
  ensureWorkspaceRules(notesPath);
  ensureApprovalHooks(notesPath, sidecarPort, sidecarToken);
  preparedWorkspaces.add(notesPath);
}

export function ensureApprovalHooks(
  notesPath: string,
  sidecarPort: number,
  sidecarToken: string,
): void {
  const cursorDir = join(notesPath, ".cursor");
  if (!existsSync(cursorDir)) {
    mkdirSync(cursorDir, { recursive: true });
  }

  const curlCandidates = ["/usr/bin/curl", "/opt/homebrew/bin/curl", "curl"];
  const curl = curlCandidates.find((candidate) =>
    candidate === "curl" ? true : existsSync(candidate),
  ) ?? "/usr/bin/curl";

  const hooksPath = join(cursorDir, "hooks.json");
  writeFileSync(
    hooksPath,
    JSON.stringify(
      {
        version: 1,
        hooks: {
          beforeShellExecution: [
            {
              command: `${curl} -s -X POST http://127.0.0.1:${sidecarPort}/hooks/shell-check -H "Authorization: Bearer ${sidecarToken}" -H "Content-Type: application/json" -d @-`,
            },
          ],
        },
      },
      null,
      2,
    ),
    "utf8",
  );
}
