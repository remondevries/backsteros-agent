import { basename } from "node:path";
import { join } from "node:path";
import type { ToolSelection } from "../tool-routing.ts";
import { loadVaultAgentKnowledge } from "../vault-agent-knowledge.ts";
import { calendarGuidance } from "./calendar.ts";
import { integrationReadinessHints } from "./integrations.ts";
import { linearGuidance } from "./linear.ts";
import { truncateContextSection } from "./limits.ts";
import { inferAreasFromPaths, selectObsidianAreas } from "./obsidian-areas.ts";
import { obsidianAreaGuidance, obsidianCoreGuidance } from "./obsidian.ts";
import { whoopGuidance } from "./whoop.ts";

function loadVaultUserRules(notesPath: string): string | null {
  return loadVaultAgentKnowledge(notesPath);
}

function extractPathHints(text: string): string[] {
  const hints = new Set<string>();
  for (const match of text.matchAll(/(?:^|[\s("'`])([\w./-]+\.md)\b/gi)) {
    hints.add(match[1]!.replace(/\\/g, "/"));
  }
  for (const match of text.matchAll(/\b(Daily|Projects?|Inbox|Meetings?|Letters?|Contacts?|Organizations?|Organisations?|specs|archive)\/[\w./-]+/gi)) {
    hints.add(match[0]!.replace(/\\/g, "/"));
  }
  return [...hints];
}

function obsidianWorkspaceFacts(
  notesPath: string,
  vaultName?: string | null,
): string {
  const resolvedVaultName = vaultName?.trim() || basename(notesPath);
  return `[Obsidian paths]
- Notes directory: ${notesPath}
- Vault name: ${resolvedVaultName}
- Daily note filename for today follows the date in [Now] (YYYY-MM-DD.md under Daily/).`;
}

export function buildRuntimeContext(
  text: string,
  tools: ToolSelection,
  notesPath: string,
  vaultName?: string | null,
): string[] {
  const sections: string[] = [...integrationReadinessHints(tools)];

  if (tools.obsidian) {
    sections.push(obsidianWorkspaceFacts(notesPath, vaultName));
    sections.push(obsidianCoreGuidance());

    const areaHints = new Set([
      ...selectObsidianAreas(text),
      ...inferAreasFromPaths(extractPathHints(text)),
    ]);
    sections.push(...obsidianAreaGuidance([...areaHints]));

    const vaultRules = loadVaultUserRules(notesPath);
    if (vaultRules) {
      sections.push(vaultRules);
    }
  }

  if (tools.linear) {
    sections.push(linearGuidance());
  }

  if (tools.calendar) {
    sections.push(calendarGuidance());
  }

  if (tools.whoop) {
    const includeDailyNoteRules =
      tools.obsidian &&
      (selectObsidianAreas(text).includes("daily") ||
        /\bdaily note\b/i.test(text) ||
        extractPathHints(text).some((path) => path.toLowerCase().startsWith("daily/")));
    sections.push(whoopGuidance(includeDailyNoteRules));
  }

  return sections.map((section) => truncateContextSection(section));
}
