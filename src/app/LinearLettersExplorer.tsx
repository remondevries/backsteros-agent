import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LinearStatusIcon } from "../chat/LinearStatusIcon";
import { useContentPanelBarState } from "../hooks/useContentPanelBarState";
import { useAutoOpenFirstListItem, useExplorerIosChrome } from "../hooks/useExplorerIosChrome";
import { useIosExplorerSearchChrome } from "../hooks/useIosExplorerSearchChrome";
import { useLinearProjectDocuments } from "../hooks/useLinearProjectDocuments";
import { useLinearTeamIssues } from "../hooks/useLinearTeamIssues";
import type { ProjectDocumentEntity } from "../lib/documentStatusGroups";
import {
  createLetterComposeDraftDocument,
} from "../lib/letterComposeDraft";
import {
  contentListGroupHeaderId,
  contentListItemDataAttributes,
} from "../lib/contentListNavigation";
import {
  useContentListKeyboardFocusedId,
  useContentListKeyboardNavActive,
  useContentListNavigationRegistration,
} from "../lib/contentListNavigationReact";
import { groupVariantClassName, groupVariantFromStatusKey } from "../lib/groupVariantFromStatusKey";
import { groupLinearDocumentsByLinkedIssueStatus } from "../lib/groupLinearDocumentsByLinkedIssueStatus";
import { linearLinkedDocumentDisplayTitle } from "../lib/linearLinkedDocumentTitle";
import { useContentPanelNavigation } from "./contentPanelNavigation";
import { ProjectDocumentRow } from "./project-documents/ProjectDocumentRow";
import { GroupChevron } from "./workspace-list/GroupChevron";
import { useCollapsibleGroups } from "./workspace-list/useCollapsibleGroups";

const LETTERS_GROUP_PREFIX = "letters";

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

export function LinearLettersExplorer({
  teamId,
  enabled,
}: {
  teamId: string;
  enabled: boolean;
}) {
  const { activeLinearDocument, setActiveLinearDocument } = useContentPanelNavigation();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { collapsedGroups, toggleGroup } = useCollapsibleGroups();
  const {
    documents,
    loading: documentsLoading,
    refreshing: documentsRefreshing,
    error: documentsError,
    refresh: refreshDocuments,
  } = useLinearProjectDocuments({
    teamId,
    enabled,
  });
  const {
    issues,
    workflowStates,
    loading: issuesLoading,
    refreshing: issuesRefreshing,
    error: issuesError,
    refresh: refreshIssues,
  } = useLinearTeamIssues(teamId, enabled, { excludeCompleted: false });
  const keyboardFocusedId = useContentListKeyboardFocusedId();
  const keyboardNavActive = useContentListKeyboardNavActive();

  const loading =
    enabled && (documentsLoading || issuesLoading) && documents.length === 0 && issues.length === 0;
  const refreshing = documentsRefreshing || issuesRefreshing;
  const error = documentsError ?? issuesError;

  const handleRefresh = useCallback(() => {
    refreshDocuments();
    refreshIssues();
  }, [refreshDocuments, refreshIssues]);

  useContentPanelBarState({
    error,
    loading,
    loadingMessage: "Loading letters…",
    refreshing,
    onRefresh: handleRefresh,
  });

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim().toLocaleLowerCase());
    }, 200);
    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  const filteredDocuments = useMemo(() => {
    return documents.filter((document) => {
      const displayTitle = linearLinkedDocumentDisplayTitle(document.title);
      return (
        matchesSearchQuery(document.title, debouncedSearchQuery) ||
        matchesSearchQuery(displayTitle, debouncedSearchQuery)
      );
    });
  }, [debouncedSearchQuery, documents]);

  const groupedDocuments = useMemo(() => {
    return groupLinearDocumentsByLinkedIssueStatus(
      filteredDocuments,
      issues,
      workflowStates,
    );
  }, [filteredDocuments, issues, workflowStates]);

  const openDocument = useCallback(
    (document: ProjectDocumentEntity) => {
      setActiveLinearDocument({
        id: document.linearDocumentId,
        title: linearLinkedDocumentDisplayTitle(document.title),
        projectId: document.projectId,
      });
    },
    [setActiveLinearDocument],
  );

  const firstVisibleDocument = useMemo(() => {
    for (const group of groupedDocuments) {
      if (collapsedGroups.has(group.key)) continue;
      const first = group.documents[0];
      if (first) return first;
    }
    return groupedDocuments[0]?.documents[0] ?? null;
  }, [collapsedGroups, groupedDocuments]);

  useAutoOpenFirstListItem({
    enabled,
    loading,
    shouldOpen: Boolean(firstVisibleDocument) && !activeLinearDocument,
    onOpenFirst: () => openDocument(firstVisibleDocument!),
  });

  const handleCreateDocument = useCallback(() => {
    if (!enabled) return;
    const draft = createLetterComposeDraftDocument();
    setActiveLinearDocument(draft);
  }, [enabled, setActiveLinearDocument]);

  const listNavItems = useMemo(() => {
    const items: Array<{ id: string; select: () => void }> = [];

    for (const group of groupedDocuments) {
      const groupHeaderId = contentListGroupHeaderId(LETTERS_GROUP_PREFIX, group.key);
      items.push({
        id: groupHeaderId,
        select: () => toggleGroup(group.key),
      });
      if (collapsedGroups.has(group.key)) continue;
      for (const document of group.documents) {
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
    enabled
      ? [
          {
            id: "letters-create",
            label: "New letter",
            onClick: handleCreateDocument,
          },
        ]
      : null,
  );

  const { searchVisibleClassName } = useIosExplorerSearchChrome({
    enabled,
    label: "Search letters",
    inputRef: searchInputRef,
  });

  return (
    <div className="vault-folder-explorer">
      <div
        className={["vault-folder-explorer-search", searchVisibleClassName]
          .filter(Boolean)
          .join(" ")}
      >
        <input
          ref={searchInputRef}
          type="search"
          className="vault-folder-explorer-search-input"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search letters…"
          aria-label="Search letters"
          disabled={!enabled}
        />
        <button
          type="button"
          className="vault-folder-explorer-add"
          onClick={handleCreateDocument}
          disabled={!enabled}
          aria-label="New letter"
          title="New letter"
        >
          <PlusIcon />
        </button>
      </div>
      {error ? (
        <p className="vault-folder-explorer-status vault-folder-explorer-status-error">{error}</p>
      ) : null}
      {showList ? (
        <ul className="vault-folder-explorer-list" aria-label="Letters">
          {groupedDocuments.length > 0 ? (
            groupedDocuments.map((group) => {
              const collapsed = collapsedGroups.has(group.key);
              const groupHeaderId = contentListGroupHeaderId(LETTERS_GROUP_PREFIX, group.key);
              const variant = groupVariantFromStatusKey(group.status);

              return (
                <li
                  key={group.key}
                  className={[
                    "vault-folder-explorer-week-group",
                    "workspace-status-group",
                    groupVariantClassName(variant),
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
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
                    <LinearStatusIcon
                      status={group.status}
                      stateType={group.stateType}
                      stateId={group.stateId}
                      statusColor={group.statusColor}
                      workflowStates={workflowStates}
                      title={group.status}
                    />
                    <span className="sidebar-list-group-title">{group.status}</span>
                    <span className="sidebar-list-group-count">{group.documents.length}</span>
                  </button>
                  {!collapsed ? (
                    <ul className="vault-folder-explorer-week-group-list">
                      {group.documents.map((document) => (
                        <ProjectDocumentRow
                          key={document.linearDocumentId}
                          document={document}
                          grouped={false}
                          showMeta={false}
                          iconFallback="letter"
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
                {debouncedSearchQuery ? "No matching letters." : "No letters yet."}
              </p>
            </li>
          )}
        </ul>
      ) : null}
    </div>
  );
}
