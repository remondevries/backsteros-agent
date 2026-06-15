import type { LinearIssueEntity } from "../chat/types";
import type { VaultDirectoryEntry } from "./api";
import type { ContentListNavItem } from "./contentListNavigation";
import { contentListGroupHeaderId } from "./contentListNavigation";
import { formatVaultNoteDisplayName } from "./vaultNoteDisplayName";
import { resolveVaultDailyDueDateKey } from "./dailyDocumentMonthGroups";
import { resolveEntryDueDateKey } from "./vaultDates";
import type { VaultNavItemId } from "./vaultNavFolders";
import { formatWorkoutDayLabel } from "./workouts/workoutsBreadcrumb";
import { workoutDateKeyFromPath } from "./workouts/workoutDays";

export const WORKOUTS_DASHBOARD_LIST_ID = "workouts:dashboard";
export const DAILY_MONTH_GROUP_HEADER_PREFIX = "daily-month";

type VaultFolderNavHandlers = {
  clearDashboard: () => void;
  openDirectory: (path: string) => void;
  openFile: (path: string, title: string) => void;
  openLinearIssue: (issue: LinearIssueEntity) => void;
  toggleMonthGroup: (groupKey: string) => void;
};

export function buildVaultFolderNavItems({
  activeNavItem,
  showDailyMonthGroups,
  nonFileEntries,
  groupedDailyEntries,
  collapsedMonthGroups,
  filteredEntries,
  dailyIssuesByDueDate,
  handlers,
}: {
  activeNavItem: VaultNavItemId;
  showDailyMonthGroups: boolean;
  nonFileEntries: VaultDirectoryEntry[];
  groupedDailyEntries: Array<{ key: string; entries: VaultDirectoryEntry[] }>;
  collapsedMonthGroups: Set<string>;
  filteredEntries: VaultDirectoryEntry[];
  dailyIssuesByDueDate: Record<string, LinearIssueEntity[]>;
  handlers: VaultFolderNavHandlers;
}): ContentListNavItem[] {
  const items: ContentListNavItem[] = [];

  if (activeNavItem === "workouts") {
    items.push({
      id: WORKOUTS_DASHBOARD_LIST_ID,
      select: handlers.clearDashboard,
    });
  }

  if (showDailyMonthGroups) {
    for (const entry of nonFileEntries) {
      items.push({
        id: entry.path,
        select: () => handlers.openDirectory(entry.path),
      });
    }

    for (const group of groupedDailyEntries) {
      items.push({
        id: contentListGroupHeaderId(DAILY_MONTH_GROUP_HEADER_PREFIX, group.key),
        select: () => handlers.toggleMonthGroup(group.key),
      });
      if (collapsedMonthGroups.has(group.key)) continue;
      for (const entry of group.entries) {
        const displayName = formatVaultNoteDisplayName(entry.name);
        items.push({
          id: entry.path,
          select: () => handlers.openFile(entry.path, displayName),
        });

        const dueDateKey =
          resolveVaultDailyDueDateKey(entry) ?? resolveEntryDueDateKey(entry.date);
        const dueDateIssues = dueDateKey ? (dailyIssuesByDueDate[dueDateKey] ?? []) : [];
        for (const issue of dueDateIssues) {
          items.push({
            id: issue.id,
            select: () => handlers.openLinearIssue(issue),
          });
        }
      }
    }

    return items;
  }

  for (const entry of filteredEntries) {
    if (entry.kind === "directory") {
      items.push({
        id: entry.path,
        select: () => handlers.openDirectory(entry.path),
      });
      continue;
    }

    const displayName =
      activeNavItem === "workouts"
        ? formatWorkoutDayLabel(workoutDateKeyFromPath(entry.path) ?? entry.name)
        : formatVaultNoteDisplayName(entry.name);
    items.push({
      id: entry.path,
      select: () => handlers.openFile(entry.path, displayName),
    });
  }

  return items;
}

export function resolveVaultFolderSelectedListId({
  activeNavItem,
  activeVaultDocumentPath,
  activeLinearIssueId,
}: {
  activeNavItem: VaultNavItemId;
  activeVaultDocumentPath: string | null | undefined;
  activeLinearIssueId: string | null | undefined;
}): string | null {
  if (activeLinearIssueId) return activeLinearIssueId;
  if (activeNavItem === "workouts" && !activeVaultDocumentPath) {
    return WORKOUTS_DASHBOARD_LIST_ID;
  }
  return activeVaultDocumentPath ?? null;
}
