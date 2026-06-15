import { useCallback, useEffect, useMemo, useState } from "react";
import { useAutoOpenFirstListItem, useExplorerIosChrome } from "../hooks/useExplorerIosChrome";
import { useContentPanelBarState } from "../hooks/useContentPanelBarState";
import { useLinearProjectDocuments } from "../hooks/useLinearProjectDocuments";
import { createLinearTeamDocument } from "../lib/api";
import { seedLinearDocumentContentFromEntity } from "../lib/linearDocumentContentSeed";
import type { ProjectDocumentEntity } from "../lib/documentStatusGroups";
import {
  compareDailyJournalDocumentsNewestFirst,
  dailyMonthKeyForToday,
  groupProjectDocumentsByMonth,
  hasDailyJournalDocument,
  todayDailyJournalDateKey,
} from "../lib/dailyDocumentMonthGroups";
import {
  contentListGroupHeaderId,
  contentListItemDataAttributes,
} from "../lib/contentListNavigation";
import {
  useContentListKeyboardFocusedId,
  useContentListKeyboardNavActive,
  useContentListNavigationRegistration,
} from "../lib/contentListNavigationReact";
import { useContentPanelNavigation } from "./contentPanelNavigation";
import { ProjectDocumentRow } from "./project-documents/ProjectDocumentRow";
import { GroupChevron } from "./workspace-list/GroupChevron";
import { useCollapsibleGroups } from "./workspace-list/useCollapsibleGroups";

const DAILY_GROUP_PREFIX = "daily";

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

function matchesSearchQuery(value: string, query: string): boolean {
  if (!query) return true;
  return value.toLocaleLowerCase().includes(query);
}

export function LinearDailyExplorer({
  teamId,
  enabled,
}: {
  teamId: string;
  enabled: boolean;
}) {
  const { activeLinearDocument, setActiveLinearDocument } = useContentPanelNavigation();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [creatingDocument, setCreatingDocument] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const { collapsedGroups, toggleGroup, expandGroup } = useCollapsibleGroups();
  const {
    documents,
    loading,
    refreshing,
    error,
    refresh: refreshDocuments,
    prependDocument,
  } = useLinearProjectDocuments({
    teamId,
    enabled,
    dailyOnly: true,
  });
  const keyboardFocusedId = useContentListKeyboardFocusedId();
  const keyboardNavActive = useContentListKeyboardNavActive();
  const todayDateKey = todayDailyJournalDateKey();
  const hasTodayDailyNote = useMemo(
    () => hasDailyJournalDocument(documents, todayDateKey),
    [documents, todayDateKey],
  );
  const canCreateTodayDailyNote =
    enabled && !debouncedSearchQuery && !hasTodayDailyNote && !creatingDocument;
  const showCreateTodayButton = enabled && !debouncedSearchQuery && !hasTodayDailyNote;

  useContentPanelBarState({
    error,
    loading: enabled && loading && documents.length === 0,
    loadingMessage: "Loading daily documents…",
    refreshing,
    onRefresh: refreshDocuments,
  });

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim().toLocaleLowerCase());
    }, 200);
    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  const filteredDocuments = useMemo(() => {
    return documents
      .filter((document) => matchesSearchQuery(document.title, debouncedSearchQuery))
      .slice()
      .sort(compareDailyJournalDocumentsNewestFirst);
  }, [debouncedSearchQuery, documents]);

  const groupedDocuments = useMemo(
    () => groupProjectDocumentsByMonth(filteredDocuments),
    [filteredDocuments],
  );

  const openDocument = useCallback(
    (document: ProjectDocumentEntity) => {
      setActiveLinearDocument({
        id: document.linearDocumentId,
        title: document.title,
        projectId: document.projectId,
      });
    },
    [setActiveLinearDocument],
  );

  useAutoOpenFirstListItem({
    enabled,
    loading: enabled && loading && documents.length === 0,
    shouldOpen: filteredDocuments.length > 0 && !activeLinearDocument,
    onOpenFirst: () => openDocument(filteredDocuments[0]!),
  });

  const handleCreateDocument = useCallback(async () => {
    if (!enabled || creatingDocument || hasTodayDailyNote) return;

    setCreatingDocument(true);
    setCreateError(null);
    try {
      const result = await createLinearTeamDocument(teamId, { title: todayDateKey });
      if (result.error || !result.document) {
        setCreateError(result.error ?? "Failed to create document.");
        return;
      }

      const createdDocument = result.document;

      expandGroup(dailyMonthKeyForToday());
      prependDocument(createdDocument);
      seedLinearDocumentContentFromEntity(createdDocument);
      openDocument(createdDocument);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create document.");
    } finally {
      setCreatingDocument(false);
    }
  }, [
    creatingDocument,
    enabled,
    expandGroup,
    hasTodayDailyNote,
    openDocument,
    prependDocument,
    teamId,
    todayDateKey,
  ]);

  const listNavItems = useMemo(() => {
    const items: Array<{ id: string; select: () => void }> = [];

    for (const group of groupedDocuments) {
      const groupHeaderId = contentListGroupHeaderId(DAILY_GROUP_PREFIX, group.key);
      items.push({
        id: groupHeaderId,
        select: () => toggleGroup(group.key),
      });
      if (collapsedGroups.has(group.key)) continue;
      for (const document of group.entries) {
        items.push({
          id: document.linearDocumentId,
          select: () => openDocument(document),
        });
      }
    }

    return items;
  }, [collapsedGroups, groupedDocuments, openDocument, toggleGroup]);

  const selectedListId = activeLinearDocument?.id ?? null;

  useContentListNavigationRegistration({
    region: "sidebar",
    enabled: enabled && listNavItems.length > 0,
    items: listNavItems,
    selectedId: selectedListId,
  });

  const showList = enabled && !loading && !error;

  useExplorerIosChrome(
    enabled && showCreateTodayButton
      ? [
          {
            id: "daily-create",
            label: "New note",
            disabled: !canCreateTodayDailyNote,
            onClick: () => {
              void handleCreateDocument();
            },
          },
        ]
      : null,
  );

  return (
    <div className="vault-folder-explorer">
      <div className="vault-folder-explorer-search">
        <input
          type="search"
          className="vault-folder-explorer-search-input"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search daily documents…"
          aria-label="Search daily documents"
          disabled={!enabled}
        />
        {showCreateTodayButton ? (
          <button
            type="button"
            className="vault-folder-explorer-add"
            disabled={!canCreateTodayDailyNote}
            aria-label="New note"
            title="New note"
            onClick={() => {
              void handleCreateDocument();
            }}
          >
            <PlusIcon />
          </button>
        ) : null}
      </div>
      {loading ? <p className="vault-folder-explorer-status">Loading…</p> : null}
      {error ? (
        <p className="vault-folder-explorer-status vault-folder-explorer-status-error">{error}</p>
      ) : null}
      {createError ? (
        <p className="vault-folder-explorer-status vault-folder-explorer-status-error" role="alert">
          {createError}
        </p>
      ) : null}
      {showList ? (
        <ul className="vault-folder-explorer-list" aria-label="Daily">
          {groupedDocuments.length > 0 ? (
            groupedDocuments.map((group) => {
              const collapsed = collapsedGroups.has(group.key);
              const groupHeaderId = contentListGroupHeaderId(DAILY_GROUP_PREFIX, group.key);
              return (
                <li key={group.key} className="vault-folder-explorer-week-group">
                  <button
                    type="button"
                    {...contentListItemDataAttributes(groupHeaderId)}
                    className={[
                      "vault-folder-explorer-week-header",
                      "workspace-status-group__header",
                      keyboardNavActive && keyboardFocusedId === groupHeaderId
                        ? "vault-folder-explorer-entry-keyboard-focused"
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    aria-expanded={!collapsed}
                    onClick={() => toggleGroup(group.key)}
                  >
                    <span className="workspace-status-group__chevron-slot" aria-hidden="true">
                      <GroupChevron expanded={!collapsed} />
                    </span>
                    <span className="sidebar-list-group-title">{group.label}</span>
                  </button>
                  {!collapsed ? (
                    <ul className="vault-folder-explorer-week-group-list">
                      {group.entries.map((document) => (
                        <ProjectDocumentRow
                          key={document.linearDocumentId}
                          document={document}
                          grouped={false}
                          showMeta={false}
                          onClick={() => openDocument(document)}
                        />
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })
          ) : (
            <li className="vault-folder-explorer-item">
              <p className="vault-folder-explorer-status">
                {debouncedSearchQuery ? "No matching documents." : "No daily documents yet."}
              </p>
            </li>
          )}
        </ul>
      ) : null}
    </div>
  );
}
