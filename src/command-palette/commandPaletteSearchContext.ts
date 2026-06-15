import type { LinearWorkspaceSelection } from "../app/linearWorkspaceSelection";
import { isVaultSidebarNavItem, type SidebarNavItemId } from "../lib/sidebarNavItems";
import { vaultNavItemLabel, type VaultNavItemId } from "../lib/vaultNavFolders";
import type { CommandPaletteItem, CommandPaletteSection } from "./types";

export type CommandPaletteSearchContext =
  | {
      kind: "vault-folder";
      navItemId: VaultNavItemId;
      label: string;
    }
  | {
      kind: "linear-project";
      projectId: string;
      projectName: string;
    }
  | {
      kind: "linear-team";
      teamId: string;
      teamName: string;
      projectIds: string[];
      projectNames: string[];
    };

export function resolveCommandPaletteSearchContext(options: {
  activeVaultNavItem: SidebarNavItemId | null;
  linearSelection: LinearWorkspaceSelection | null;
  settingsOpen: boolean;
}): CommandPaletteSearchContext | null {
  const { activeVaultNavItem, linearSelection, settingsOpen } = options;
  if (settingsOpen || !activeVaultNavItem) return null;

  if (activeVaultNavItem === "projects" && linearSelection) {
    if (linearSelection.kind === "project") {
      return {
        kind: "linear-project",
        projectId: linearSelection.id,
        projectName: linearSelection.name,
      };
    }

    if (linearSelection.kind === "team") {
      return {
        kind: "linear-team",
        teamId: linearSelection.id,
        teamName: linearSelection.name,
        projectIds: [],
        projectNames: [],
      };
    }
  }

  if (isVaultSidebarNavItem(activeVaultNavItem)) {
    return {
      kind: "vault-folder",
      navItemId: activeVaultNavItem,
      label: vaultNavItemLabel(activeVaultNavItem),
    };
  }

  return null;
}

export function getCommandPaletteContextLabel(
  context: CommandPaletteSearchContext | null,
): string | null {
  if (!context) return null;

  switch (context.kind) {
    case "vault-folder":
      return context.label;
    case "linear-project":
      return context.projectName;
    case "linear-team":
      return context.teamName;
  }
}

function stablePartition<T>(items: T[], isContextual: (item: T) => boolean): T[] {
  const contextual: T[] = [];
  const other: T[] = [];

  for (const item of items) {
    if (isContextual(item)) {
      contextual.push(item);
    } else {
      other.push(item);
    }
  }

  return [...contextual, ...other];
}

function normalizeName(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function issueMatchesProjectName(
  issue: { projectName?: string; projectId?: string },
  projectId: string,
  projectName: string,
): boolean {
  if (issue.projectId && issue.projectId === projectId) return true;
  const normalizedProjectName = normalizeName(projectName);
  if (!normalizedProjectName) return false;
  return normalizeName(issue.projectName) === normalizedProjectName;
}

export function applyCommandPaletteContextRanking(
  grouped: Record<CommandPaletteSection, CommandPaletteItem[]>,
  context: CommandPaletteSearchContext | null,
): Record<CommandPaletteSection, CommandPaletteItem[]> {
  if (!context) return grouped;

  const next = { ...grouped };

  if (context.kind === "vault-folder") {
    next.Notes = stablePartition(
      grouped.Notes,
      (item) => item.kind === "vault-note" && item.navItemId === context.navItemId,
    );
    return next;
  }

  if (context.kind === "linear-project") {
    next.Projects = stablePartition(
      grouped.Projects,
      (item) => item.kind === "linear-project" && item.projectId === context.projectId,
    );
    next.Issues = stablePartition(grouped.Issues, (item) =>
      item.kind === "linear-issue"
        ? issueMatchesProjectName(item.issue, context.projectId, context.projectName)
        : false,
    );
    return next;
  }

  const projectIdSet = new Set(context.projectIds);
  const projectNameSet = new Set(context.projectNames.map(normalizeName).filter(Boolean));

  next.Projects = stablePartition(
    grouped.Projects,
    (item) => item.kind === "linear-project" && projectIdSet.has(item.projectId),
  );
  next.Issues = stablePartition(grouped.Issues, (item) => {
    if (item.kind !== "linear-issue") return false;
    if (item.issue.projectId && projectIdSet.has(item.issue.projectId)) return true;
    const projectName = normalizeName(item.issue.projectName);
    return projectName.length > 0 && projectNameSet.has(projectName);
  });

  return next;
}

export function withTeamProjects(
  context: CommandPaletteSearchContext | null,
  projects: Array<{ id: string; name: string }>,
): CommandPaletteSearchContext | null {
  if (!context || context.kind !== "linear-team") return context;

  return {
    ...context,
    projectIds: projects.map((project) => project.id),
    projectNames: projects.map((project) => project.name),
  };
}
