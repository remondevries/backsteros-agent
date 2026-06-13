import { useEffect, useMemo, useState } from "react";
import type { LinearIssueEntity } from "../chat/types";
import { createVaultDocument, fetchLinearIssuesByDueDates } from "../lib/api";
import { vaultNavItemLabel, type VaultNavItemId } from "../lib/vaultNavFolders";
import { formatVaultNoteDisplayName } from "../lib/vaultNoteDisplayName";
import { useVaultDirectory } from "../hooks/useVaultDirectory";
import {
  useContentPanelNavigation,
  useContentPanelSidebarBreadcrumbs,
} from "./contentPanelNavigation";
import { ProjectIssueRow } from "./project-issues/ProjectIssueRow";
import { requestLinearIssueViewMode } from "./project-issues/issueViewModeIntent";
import { formatWorkoutDayLabel } from "../lib/workouts/workoutsBreadcrumb";
import { workoutDateKeyFromPath } from "../lib/workouts/workoutDays";

const RESERVED_WORKOUT_FILES = new Set([
  "dashboard.md",
  "exercise-catalog.md",
  "personal-records.csv",
]);

const NOTE_CREATION_NAV_ITEMS = new Set<VaultNavItemId>([
  "inbox",
  "meetings",
  "knowledge-base",
  "letters",
  "contacts",
]);

function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path
        d="M8 3.25v9.5M3.25 8h9.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function splitRelativePath(path: string): string[] {
  return path.split("/").filter(Boolean);
}

function parseEntryDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  }

  const parsed = Date.parse(trimmed);
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed);
}

function resolveIsoWeekLabel(date: Date): string {
  const weekDate = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const dayOfWeek = weekDate.getUTCDay() || 7;
  weekDate.setUTCDate(weekDate.getUTCDate() + 4 - dayOfWeek);
  const yearStart = new Date(Date.UTC(weekDate.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil(
    ((weekDate.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7,
  );
  return `${weekNumber} week`;
}

function formatDateKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function resolveEntryDueDateKey(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim();
  const matchedIsoDate = normalized.match(/^(\d{4}-\d{2}-\d{2})/);
  if (matchedIsoDate?.[1]) return matchedIsoDate[1];
  const parsed = parseEntryDate(normalized);
  if (!parsed) return null;
  return formatDateKey(parsed);
}

export function VaultFolderExplorer({
  activeNavItem,
  enabled,
}: {
  activeNavItem: VaultNavItemId;
  enabled: boolean;
}) {
  const { activeVaultDocument, setActiveVaultDocument, setActiveLinearIssue, clearActiveVaultDocument } =
    useContentPanelNavigation();
  const rootPath = vaultNavItemLabel(activeNavItem);
  const [relativePath, setRelativePath] = useState<string>(rootPath);
  const [searchQuery, setSearchQuery] = useState("");
  const [dailyIssuesByDueDate, setDailyIssuesByDueDate] = useState<
    Record<string, LinearIssueEntity[]>
  >({});

  const flattenFolders =
    activeNavItem === "meetings" ||
    activeNavItem === "letters" ||
    activeNavItem === "contacts" ||
    activeNavItem === "organizations";
  const { entries, loading, error, refresh } = useVaultDirectory(relativePath, enabled, {
    flattenFiles: flattenFolders,
  });
  const navLabel = vaultNavItemLabel(activeNavItem);
  const searchPlaceholder = `Search ${navLabel.toLocaleLowerCase()}…`;
  const searchAriaLabel = `Search ${navLabel.toLocaleLowerCase()} notes`;
  const canCreateNote = NOTE_CREATION_NAV_ITEMS.has(activeNavItem);
  const [creatingNote, setCreatingNote] = useState(false);

  const handleCreateNote = async () => {
    if (!enabled || creatingNote) return;
    setCreatingNote(true);
    try {
      const result = await createVaultDocument(relativePath);
      if (result.error || !result.document) return;
      await refresh();
      setActiveVaultDocument({
        path: result.document.path,
        title: result.document.title,
        focusTitle: true,
      });
    } catch {
      // Surfacing handled by the folder error state on next refresh.
    } finally {
      setCreatingNote(false);
    }
  };

  useEffect(() => {
    setRelativePath(vaultNavItemLabel(activeNavItem));
    setSearchQuery("");
  }, [activeNavItem]);

  const openVaultNote = (path: string, title: string) => {
    setActiveVaultDocument({ path, title });
  };

  const sidebarBreadcrumbs = useMemo(() => {
    const pathSegments = splitRelativePath(relativePath);
    return pathSegments.slice(1).map((segment, index) => {
      const path = pathSegments.slice(0, index + 2).join("/");
      return {
        id: `vault-${path}`,
        label: segment,
        onActivate: () => setRelativePath(path),
      };
    });
  }, [relativePath]);

  const orderedEntries = useMemo(() => {
    if (activeNavItem === "workouts") {
      return entries
        .filter((entry) => {
          if (entry.kind !== "file") return false;
          const base = entry.name.toLowerCase();
          if (RESERVED_WORKOUT_FILES.has(base)) return false;
          return workoutDateKeyFromPath(entry.path) != null;
        })
        .slice()
        .sort((left, right) => {
          const leftDate = workoutDateKeyFromPath(left.path) ?? "";
          const rightDate = workoutDateKeyFromPath(right.path) ?? "";
          return rightDate.localeCompare(leftDate);
        });
    }
    if (entries.length <= 1) return entries;
    const directories = entries.filter((entry) => entry.kind === "directory");
    const filesNewestFirst = entries
      .filter((entry) => entry.kind === "file")
      .slice()
      .reverse();
    return [...directories, ...filesNewestFirst];
  }, [activeNavItem, entries]);

  const filteredEntries = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    if (query.length === 0) {
      return orderedEntries;
    }
    return orderedEntries.filter((entry) => {
      const entryLabel =
        entry.kind === "file" ? formatVaultNoteDisplayName(entry.name) : entry.name;
      return entryLabel.toLocaleLowerCase().includes(query);
    });
  }, [orderedEntries, searchQuery]);

  const showDailyWeekGroups = activeNavItem === "daily";
  const dailyDueDates = useMemo(() => {
    if (!showDailyWeekGroups) return [] as string[];
    const dueDates = new Set<string>();
    for (const entry of orderedEntries) {
      if (entry.kind !== "file") continue;
      const dueDate = resolveEntryDueDateKey(entry.date);
      if (dueDate) dueDates.add(dueDate);
    }
    return [...dueDates].sort((left, right) => right.localeCompare(left));
  }, [orderedEntries, showDailyWeekGroups]);

  useEffect(() => {
    if (!enabled || !showDailyWeekGroups) {
      setDailyIssuesByDueDate({});
      return;
    }

    if (dailyDueDates.length === 0) {
      setDailyIssuesByDueDate({});
      return;
    }

    let cancelled = false;
    void fetchLinearIssuesByDueDates(dailyDueDates)
      .then((result) => {
        if (cancelled) return;
        setDailyIssuesByDueDate(result.issuesByDueDate ?? {});
      })
      .catch(() => {
        if (cancelled) return;
        setDailyIssuesByDueDate({});
      });

    return () => {
      cancelled = true;
    };
  }, [dailyDueDates, enabled, showDailyWeekGroups]);

  const groupedDailyEntries = useMemo(() => {
    if (!showDailyWeekGroups) return [];

    const groups: Array<{
      key: string;
      label: string;
      entries: (typeof filteredEntries)[number][];
    }> = [];
    const byKey = new Map<string, (typeof groups)[number]>();

    for (const entry of filteredEntries) {
      if (entry.kind !== "file") continue;
      const parsedDate = parseEntryDate(entry.date);
      const label = parsedDate ? resolveIsoWeekLabel(parsedDate) : "Unknown week";
      const key = parsedDate
        ? `${parsedDate.getUTCFullYear()}-${label}`
        : `unknown-week-${label}`;
      let group = byKey.get(key);
      if (!group) {
        group = { key, label, entries: [] };
        byKey.set(key, group);
        groups.push(group);
      }
      group.entries.push(entry);
    }

    return groups;
  }, [filteredEntries, showDailyWeekGroups]);

  const nonFileEntries = useMemo(
    () => filteredEntries.filter((entry) => entry.kind !== "file"),
    [filteredEntries],
  );

  const openLinearIssue = (issue: LinearIssueEntity, mode: "issue" | "terminal" = "issue") => {
    if (mode === "terminal") {
      requestLinearIssueViewMode(issue.id, "terminal");
    }
    setActiveLinearIssue({
      id: issue.id,
      identifier: issue.identifier ?? issue.id,
      title: issue.title,
      status: issue.status,
      stateType: issue.stateType,
    });
  };

  useContentPanelSidebarBreadcrumbs(sidebarBreadcrumbs, enabled);

  return (
    <div className="vault-folder-explorer">
      <div className="vault-folder-explorer-search">
        <input
          type="search"
          className="vault-folder-explorer-search-input"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchAriaLabel}
        />
        {canCreateNote ? (
          <button
            type="button"
            className="vault-folder-explorer-add"
            onClick={() => void handleCreateNote()}
            disabled={creatingNote}
            aria-label={`New note in ${navLabel}`}
            title={`New note in ${navLabel}`}
          >
            <PlusIcon />
          </button>
        ) : null}
      </div>
      {loading ? <p className="vault-folder-explorer-status">Loading…</p> : null}
      {error ? (
        <p className="vault-folder-explorer-status vault-folder-explorer-status-error">{error}</p>
      ) : null}

      {!loading && !error ? (
        filteredEntries.length > 0 || activeNavItem === "workouts" ? (
          <ul className="vault-folder-explorer-list">
            {activeNavItem === "workouts" ? (
              <li className="vault-folder-explorer-item">
                <button
                  type="button"
                  className={[
                    "vault-folder-explorer-entry",
                    "vault-folder-explorer-entry-file",
                    "vault-folder-explorer-entry-selectable",
                    activeVaultDocument == null ? "vault-folder-explorer-entry-selected" : null,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => clearActiveVaultDocument()}
                >
                  <span className="vault-folder-explorer-entry-name">Dashboard</span>
                </button>
              </li>
            ) : null}
            {showDailyWeekGroups ? (
              <>
                {nonFileEntries.map((entry) => (
                  <li key={entry.path} className="vault-folder-explorer-item">
                    <button
                      type="button"
                      className="vault-folder-explorer-entry vault-folder-explorer-entry-directory"
                      onClick={() => setRelativePath(entry.path)}
                    >
                      <span className="vault-folder-explorer-entry-name">{entry.name}</span>
                    </button>
                  </li>
                ))}

                {groupedDailyEntries.map((group) => (
                  <li key={group.key} className="vault-folder-explorer-week-group">
                    <p className="vault-folder-explorer-week-header">{group.label}</p>
                    <ul className="vault-folder-explorer-week-group-list">
                      {group.entries.map((entry) => {
                        const displayName = formatVaultNoteDisplayName(entry.name);
                        const selected = activeVaultDocument?.path === entry.path;
                        const dueDateKey = resolveEntryDueDateKey(entry.date);
                        const dueDateIssues = dueDateKey
                          ? (dailyIssuesByDueDate[dueDateKey] ?? [])
                          : [];
                        return (
                          <li key={entry.path} className="vault-folder-explorer-item">
                            <button
                              type="button"
                              className={[
                                "vault-folder-explorer-entry",
                                "vault-folder-explorer-entry-file",
                                "vault-folder-explorer-entry-selectable",
                                selected ? "vault-folder-explorer-entry-selected" : null,
                              ]
                                .filter(Boolean)
                                .join(" ")}
                              aria-current={selected ? "page" : undefined}
                              onClick={() => openVaultNote(entry.path, displayName)}
                            >
                              <span className="vault-folder-explorer-entry-name">{displayName}</span>
                            </button>
                            {dueDateIssues.length > 0 ? (
                              <ul className="vault-folder-explorer-linked-issues">
                                {dueDateIssues.map((issue) => (
                                  <ProjectIssueRow
                                    key={`${entry.path}-${issue.id}`}
                                    issue={issue}
                                    grouped={false}
                                    onClick={() => {
                                      openLinearIssue(issue);
                                    }}
                                    onTerminalIndicatorClick={() => {
                                      openLinearIssue(issue, "terminal");
                                    }}
                                  />
                                ))}
                              </ul>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ))}
              </>
            ) : (
              filteredEntries.map((entry) => {
                const displayName =
                  activeNavItem === "workouts"
                    ? formatWorkoutDayLabel(workoutDateKeyFromPath(entry.path) ?? entry.name)
                    : formatVaultNoteDisplayName(entry.name);
                const selected =
                  entry.kind === "file" && activeVaultDocument?.path === entry.path;

                return (
                  <li key={entry.path} className="vault-folder-explorer-item">
                    {entry.kind === "directory" ? (
                      <button
                        type="button"
                        className="vault-folder-explorer-entry vault-folder-explorer-entry-directory"
                        onClick={() => setRelativePath(entry.path)}
                      >
                        <span className="vault-folder-explorer-entry-name">{entry.name}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={[
                          "vault-folder-explorer-entry",
                          "vault-folder-explorer-entry-file",
                          "vault-folder-explorer-entry-selectable",
                          selected ? "vault-folder-explorer-entry-selected" : null,
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        aria-current={selected ? "page" : undefined}
                        onClick={() => openVaultNote(entry.path, displayName)}
                      >
                        <span className="vault-folder-explorer-entry-name">{displayName}</span>
                      </button>
                    )}
                  </li>
                );
              })
            )}
          </ul>
        ) : searchQuery.trim().length > 0 ? (
          <p className="vault-folder-explorer-status">No notes match that search.</p>
        ) : (
          <p className="vault-folder-explorer-status">This folder is empty.</p>
        )
      ) : null}
    </div>
  );
}
