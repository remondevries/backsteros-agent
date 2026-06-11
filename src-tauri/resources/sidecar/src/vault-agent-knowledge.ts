import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { readCachedFileContent } from "./context/cache.ts";
import { truncateContextSection } from "./context/limits.ts";

export const AGENT_KNOWLEDGE_DIR = "Agent";

const GUIDE_ORDER = ["overview.md", "conventions.md", "letters.md", "contacts-orgs-projects.md"];

const ROOT_AGENTS_TEMPLATE = `# Vault agent knowledge

Backster reads this index and every guide under \`${AGENT_KNOWLEDGE_DIR}/\` on note-related turns.
Edit those guides over time to teach Backster how this vault works.

## Guides

| Topic | File |
| --- | --- |
| Folder map and roles | \`${AGENT_KNOWLEDGE_DIR}/overview.md\` |
| Naming and do/don't | \`${AGENT_KNOWLEDGE_DIR}/conventions.md\` |
| Letter filing | \`${AGENT_KNOWLEDGE_DIR}/letters.md\` |
| Contacts, orgs, projects | \`${AGENT_KNOWLEDGE_DIR}/contacts-orgs-projects.md\` |

Add new \`.md\` files under \`${AGENT_KNOWLEDGE_DIR}/\` when you want Backster to learn more.
Link them here so you remember what you maintain.
`;

const AGENT_GUIDE_TEMPLATES: Record<string, string> = {
  "overview.md": `# Vault overview

## Folder map

| Folder | Purpose |
| --- | --- |
| \`Daily/\` | Daily notes (\`YYYY-MM-DD.md\`) |
| \`Projects/\` | Project notes |
| \`Inbox/\` | Quick captures to process later |
| \`Meetings/\` | Meeting notes |
| \`Letters/\` | Scanned letters (PDF + wrapper note) |
| \`Contacts/\` | People |
| \`Organizations/\` | Companies and senders |
| \`specs/\` | Specs and plans |
| \`archive/\` | Read-only archive — never edit |
| \`.obsidian/\` | Obsidian app config — not your notes; never search or edit |

## What I do manually

- (Add your habits here)

## What Backster automates

- \`/letter\` — OCR, review, and file letters in \`Letters/\`
- \`/daily-capture\` — append to today's daily note
`,

  "conventions.md": `# Vault conventions

Rules for **you** and for **Backster**. Keep this short and specific.

## Naming

- Daily notes: \`Daily/YYYY-MM-DD.md\`
- Letter PDFs: \`YYYY-MM-DD - Sender - Subject.pdf\`

## Do

- One contact note per person under \`Contacts/\`
- Link related notes with \`[[wikilinks]]\` instead of duplicating context

## Don't

- Don't edit anything under \`archive/\`
- Don't search, read, or modify anything under \`.obsidian/\` — that folder is Obsidian system config (plugins, settings), not vault content
- Don't create duplicate project or contact notes for the same entity
`,

  "letters.md": `# Letters

## Structure

- PDF lives in \`Letters/\`
- Wrapper note: same basename with \`.md\`, frontmatter + \`![[filename.pdf]]\`
- Frontmatter: \`type\`, \`assigned\`, \`date\`, \`organization\`, \`project\`, \`status\`, \`note\`

## Deleting letters

- Deleting a wrapper \`Letters/*.md\` must also delete the sibling \`.pdf\` with the same basename
- Use \`delete_workspace_file\` (preferred) — it removes both automatically

## Organization field

- **Organization** must match a **Linear team** name (not free-text sender names)
- OCR sender names (e.g. Belastingdienst) are hints only until mapped to a team

## Learned aliases

After filing, Backster may append OCR strings to \`alias:\` frontmatter on the matched contact, organization, or project note to improve future matching.
`,

  "contacts-orgs-projects.md": `# Contacts, organizations, and projects

## Contacts (\`Contacts/\`)

- One note per person: \`Contacts/Full Name.md\`
- Optional \`alias\` frontmatter (YAML list) for name variants from letters/OCR

## Organizations (\`Organizations/\`)

- Canonical name should match the **Linear team** when used for letter filing
- \`alias\` frontmatter stores sender strings seen on incoming mail

## Projects (\`Projects/\`)

- Folder per project or flat \`Projects/name.md\`
- \`alias\` frontmatter for alternate project names
- Letter **project** field matches **Linear projects**
`,
};

function compareGuidePaths(left: string, right: string): number {
  const leftIndex = GUIDE_ORDER.indexOf(left);
  const rightIndex = GUIDE_ORDER.indexOf(right);
  if (leftIndex >= 0 && rightIndex >= 0) return leftIndex - rightIndex;
  if (leftIndex >= 0) return -1;
  if (rightIndex >= 0) return 1;
  return left.localeCompare(right);
}

export function listAgentGuideRelativePaths(notesPath: string): string[] {
  const agentDir = join(notesPath, AGENT_KNOWLEDGE_DIR);
  if (!existsSync(agentDir) || !statSync(agentDir).isDirectory()) {
    return [];
  }

  const paths: string[] = [];

  function walk(currentDir: string): void {
    for (const entry of readdirSync(currentDir, { withFileTypes: true })) {
      const absPath = join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(absPath);
        continue;
      }
      if (!entry.name.toLowerCase().endsWith(".md")) continue;
      paths.push(relative(notesPath, absPath).replace(/\\/g, "/"));
    }
  }

  walk(agentDir);
  return paths.sort((left, right) => {
    const leftName = left.split("/").pop() ?? left;
    const rightName = right.split("/").pop() ?? right;
    return compareGuidePaths(leftName, rightName);
  });
}

export function loadVaultAgentKnowledge(notesPath: string): string | null {
  const parts: string[] = [];

  const indexPath = join(notesPath, "AGENTS.md");
  const index = readCachedFileContent(indexPath)?.trim();
  if (index) {
    parts.push(`[Vault index — AGENTS.md]\n${index}`);
  }

  for (const relPath of listAgentGuideRelativePaths(notesPath)) {
    const content = readCachedFileContent(join(notesPath, relPath))?.trim();
    if (!content) continue;
    parts.push(`[Vault guide — ${relPath}]\n${content}`);
  }

  if (parts.length === 0) {
    return null;
  }

  return truncateContextSection(parts.join("\n\n"));
}

export function ensureVaultAgentKnowledge(notesPath: string): void {
  const agentDir = join(notesPath, AGENT_KNOWLEDGE_DIR);
  if (!existsSync(agentDir)) {
    mkdirSync(agentDir, { recursive: true });
  }

  for (const [filename, content] of Object.entries(AGENT_GUIDE_TEMPLATES)) {
    const guidePath = join(agentDir, filename);
    if (!existsSync(guidePath)) {
      writeFileSync(guidePath, content, "utf8");
    }
  }

  const agentsPath = join(notesPath, "AGENTS.md");
  if (!existsSync(agentsPath)) {
    writeFileSync(agentsPath, ROOT_AGENTS_TEMPLATE, "utf8");
  }
}
