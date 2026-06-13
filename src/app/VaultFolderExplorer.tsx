import { useCallback, useEffect, useMemo, useState } from "react";
import type { LinearIssueEntity } from "../chat/types";
import { createVaultDocument, fetchLinearIssuesByDueDates } from "../lib/api";
import {
  parseEntryDate,
  resolveEntryDueDateKey,
  resolveIsoWeekLabel,
} from "../lib/vaultDates";
import { vaultNavItemLabel, type VaultNavItemId } from "../lib/vaultNavFolders";
import { formatVaultNoteDisplayName } from "../lib/vaultNoteDisplayName";
import { useVaultDirectory } from "../hooks/useVaultDirectory";
import { VirtualList, useVirtualListEnabled } from "../ui/VirtualList";
import {
  useContentPanelNavigation,
  useContentPanelSidebarBreadcrumbs,
} from "./contentPanelNavigation";
import { ProjectIssueRow } from "./project-issues/ProjectIssueRow";
import { GroupChevron } from "./workspace-list/GroupChevron";
import { requestLinearIssueViewMode } from "./project-issues/issueViewModeIntent";
import { formatWorkoutDayLabel } from "../lib/workouts/workoutsBreadcrumb";
import { workoutDateKeyFromPath } from "../lib/workouts/workoutDays";
import {
  buildVaultFolderNavItems,
  DAILY_WEEK_GROUP_HEADER_PREFIX,
  resolveVaultFolderSelectedListId,
  WORKOUTS_DASHBOARD_LIST_ID,
} from "../lib/buildVaultFolderNavItems";
import { registerContentPanelLocalBack } from "../lib/contentPanelLocalBack";
import {
  contentListGroupHeaderId,
  contentListItemDataAttributes,
} from "../lib/contentListNavigation";
import {
  useContentListKeyboardFocusedId,
  useContentListNavigationRegistration,
} from "../lib/contentListNavigationReact";

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

export function VaultFolderExplorer({
  activeNavItem,
  enabled,
}: {
  activeNavItem: VaultNavItemId;
  enabled: boolean;
}) {
  const { activeVaultDocument, activeLinearIssue, setActiveVaultDocument, setActiveLinearIssue, clearActiveVaultDocument } =
    useContentPanelNavigation();
  const rootPath = vaultNavItemLabel(activeNavItem);
  const [relativePath, setRelativePath] = useState<string>(rootPath);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [collapsedWeekGroups, setCollapsedWeekGroups] = useState<Set<string>>(() => new Set());
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
    enrich: activeNavItem === "daily" ? "whoop" : "none",
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
    setDebouncedSearchQuery("");
  }, [activeNavItem]);

  useEffect(() => {
    return registerContentPanelLocalBack(() => {
      if (!enabled || activeVaultDocument) return false;
      const segments = splitRelativePath(relativePath);
      if (segments.length <= 1) return false;
      setRelativePath(segments.slice(0, -1).join("/"));
      return true;
    });
  }, [activeVaultDocument, enabled, relativePath]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 200);
    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  const openVaultNote = useCallback(
    (path: string, title: string) => {
      setActiveVaultDocument({ path, title });
    },
    [setActiveVaultDocument],
  );

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
    const query = debouncedSearchQuery.toLocaleLowerCase();
    if (query.length === 0) {
      return orderedEntries;
    }
    return orderedEntries.filter((entry) => {
      const entryLabel =
        entry.kind === "file" ? formatVaultNoteDisplayName(entry.name) : entry.name;
      return entryLabel.toLocaleLowerCase().includes(query);
    });
  }, [debouncedSearchQuery, orderedEntries]);

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

  const dailyDueDatesKey = useMemo(() => dailyDueDates.join("\0"), [dailyDueDates]);

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
  }, [dailyDueDates, dailyDueDatesKey, enabled, showDailyWeekGroups]);

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
  const virtualizeFlatList = useVirtualListEnabled(filteredEntries.length);
  const keyboardFocusedId = useContentListKeyboardFocusedId();

  const openLinearIssue = useCallback(
    (issue: LinearIssueEntity, mode: "issue" | "terminal" = "issue") => {
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
    },
    [setActiveLinearIssue],
  );

  const toggleWeekGroup = useCallback((groupKey: string) => {
    setCollapsedWeekGroups((current) => {
      const next = new Set(current);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  }, []);

  useContentPanelSidebarBreadcrumbs(sidebarBreadcrumbs, enabled);

  const listNavItems = useMemo(
    () =>
      buildVaultFolderNavItems({
        activeNavItem,
        showDailyWeekGroups,
        nonFileEntries,
        groupedDailyEntries,
        collapsedWeekGroups,
        filteredEntries,
        dailyIssuesByDueDate,
        handlers: {
          clearDashboard: () => clearActiveVaultDocument(),
          openDirectory: (path) => setRelativePath(path),
          openFile: openVaultNote,
          openLinearIssue: (issue) => openLinearIssue(issue),
          toggleWeekGroup,
        },
      }),
    [
      activeNavItem,
      clearActiveVaultDocument,
      collapsedWeekGroups,
      dailyIssuesByDueDate,
      filteredEntries,
      groupedDailyEntries,
      nonFileEntries,
      openLinearIssue,
      openVaultNote,
      showDailyWeekGroups,
      toggleWeekGroup,
    ],
  );

  const selectedListId = resolveVaultFolderSelectedListId({
    activeNavItem,
    activeVaultDocumentPath: activeVaultDocument?.path,
    activeLinearIssueId: activeLinearIssue?.id,
  });

  useContentListNavigationRegistration({
    region: "sidebar",
    enabled: enabled && listNavItems.length > 0,
    items: listNavItems,
    selectedId: selectedListId,
  });

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
                  {...contentListItemDataAttributes(WORKOUTS_DASHBOARD_LIST_ID)}
                  className={[
                    "vault-folder-explorer-entry",
                    "vault-folder-explorer-entry-file",
                    "vault-folder-explorer-entry-selectable",
                    activeVaultDocument == null ? "vault-folder-explorer-entry-selected" : null,
                    keyboardFocusedId === WORKOUTS_DASHBOARD_LIST_ID
                      ? "vault-folder-explorer-entry-keyboard-focused"
                      : null,
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
                      {...contentListItemDataAttributes(entry.path)}
                      className={[
                        "vault-folder-explorer-entry",
                        "vault-folder-explorer-entry-directory",
                        keyboardFocusedId === entry.path
                          ? "vault-folder-explorer-entry-keyboard-focused"
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => setRelativePath(entry.path)}
                    >
                      <span className="vault-folder-explorer-entry-name">{entry.name}</span>
                    </button>
                  </li>
                ))}

                {groupedDailyEntries.map((group) => {
                  const collapsed = collapsedWeekGroups.has(group.key);
                  const weekHeaderId = contentListGroupHeaderId(
                    DAILY_WEEK_GROUP_HEADER_PREFIX,
                    group.key,
                  );
                  return (
                    <li key={group.key} className="vault-folder-explorer-week-group">
                      <button
                        type="button"
                        {...contentListItemDataAttributes(weekHeaderId)}
                        className={[
                          "vault-folder-explorer-week-header",
                          keyboardFocusedId === weekHeaderId
                            ? "vault-folder-explorer-entry-keyboard-focused"
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        aria-expanded={!collapsed}
                        onClick={() => toggleWeekGroup(group.key)}
                      >
                        <span className="workspace-status-group__chevron-slot" aria-hidden="true">
                          <GroupChevron expanded={!collapsed} />
                        </span>
                        <span className="sidebar-list-group-title">{group.label}</span>
                        <span className="sidebar-list-group-count">{group.entries.length}</span>
                      </button>
                      {!collapsed ? (
                        <ul className="vault-folder-explorer-week-group-list">
                          {group.entries.length >= 40 ? (
                            <VirtualList
                              items={group.entries}
                              estimateSize={56}
                              overscan={6}
                              getItemKey={(entry) => entry.path}
                              renderItem={(entry) => {
                                const displayName = formatVaultNoteDisplayName(entry.name);
                                const selected = activeVaultDocument?.path === entry.path;
                                const dueDateKey = resolveEntryDueDateKey(entry.date);
                                const dueDateIssues = dueDateKey
                                  ? (dailyIssuesByDueDate[dueDateKey] ?? [])
                                  : [];
                                return (
                                  <li className="vault-folder-explorer-item">
                                    <button
                                      type="button"
                                      {...contentListItemDataAttributes(entry.path)}
                                      className={[
                                        "vault-folder-explorer-entry",
                                        "vault-folder-explorer-entry-file",
                                        "vault-folder-explorer-entry-selectable",
                                        selected ? "vault-folder-explorer-entry-selected" : null,
                                        keyboardFocusedId === entry.path
                                          ? "vault-folder-explorer-entry-keyboard-focused"
                                          : null,
                                      ]
                                        .filter(Boolean)
                                        .join(" ")}
                                      aria-current={selected ? "page" : undefined}
                                      onClick={() => openVaultNote(entry.path, displayName)}
                                    >
                                      <span className="vault-folder-explorer-entry-name">
                                        {displayName}
                                      </span>
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
                              }}
                            />
                          ) : (
                            group.entries.map((entry) => {
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
                                    {...contentListItemDataAttributes(entry.path)}
                                    className={[
                                      "vault-folder-explorer-entry",
                                      "vault-folder-explorer-entry-file",
                                      "vault-folder-explorer-entry-selectable",
                                      selected ? "vault-folder-explorer-entry-selected" : null,
                                      keyboardFocusedId === entry.path
                                        ? "vault-folder-explorer-entry-keyboard-focused"
                                        : null,
                                    ]
                                      .filter(Boolean)
                                      .join(" ")}
                                    aria-current={selected ? "page" : undefined}
                                    onClick={() => openVaultNote(entry.path, displayName)}
                                  >
                                    <span className="vault-folder-explorer-entry-name">
                                      {displayName}
                                    </span>
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
                            })
                          )}
                        </ul>
                      ) : null}
                    </li>
                  );
                })}
              </>
            ) : virtualizeFlatList ? (
              <VirtualList
                items={filteredEntries}
                estimateSize={44}
                overscan={8}
                getItemKey={(entry) => entry.path}
                renderItem={(entry) => {
                  const displayName =
                    activeNavItem === "workouts"
                      ? formatWorkoutDayLabel(workoutDateKeyFromPath(entry.path) ?? entry.name)
                      : formatVaultNoteDisplayName(entry.name);
                  const selected =
                    entry.kind === "file" && activeVaultDocument?.path === entry.path;

                  return (
                    <li className="vault-folder-explorer-item">
                      {entry.kind === "directory" ? (
                        <button
                          type="button"
                          {...contentListItemDataAttributes(entry.path)}
                          className={[
                        "vault-folder-explorer-entry",
                        "vault-folder-explorer-entry-directory",
                        keyboardFocusedId === entry.path
                          ? "vault-folder-explorer-entry-keyboard-focused"
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                          onClick={() => setRelativePath(entry.path)}
                        >
                          <span className="vault-folder-explorer-entry-name">{entry.name}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          {...contentListItemDataAttributes(entry.path)}
                          className={[
                            "vault-folder-explorer-entry",
                            "vault-folder-explorer-entry-file",
                            "vault-folder-explorer-entry-selectable",
                            selected ? "vault-folder-explorer-entry-selected" : null,
                            keyboardFocusedId === entry.path
                              ? "vault-folder-explorer-entry-keyboard-focused"
                              : null,
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
                }}
              />
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
                        {...contentListItemDataAttributes(entry.path)}
                        className={[
                        "vault-folder-explorer-entry",
                        "vault-folder-explorer-entry-directory",
                        keyboardFocusedId === entry.path
                          ? "vault-folder-explorer-entry-keyboard-focused"
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                        onClick={() => setRelativePath(entry.path)}
                      >
                        <span className="vault-folder-explorer-entry-name">{entry.name}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        {...contentListItemDataAttributes(entry.path)}
                        className={[
                          "vault-folder-explorer-entry",
                          "vault-folder-explorer-entry-file",
                          "vault-folder-explorer-entry-selectable",
                          selected ? "vault-folder-explorer-entry-selected" : null,
                          keyboardFocusedId === entry.path
                            ? "vault-folder-explorer-entry-keyboard-focused"
                            : null,
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
