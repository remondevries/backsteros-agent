import { useCallback, useEffect, useMemo, useState } from "react";
import { createLinearTeamMeetingDocument } from "../lib/api";
import { useContentPanelBarState } from "../hooks/useContentPanelBarState";
import { useLinearMeetingDocuments } from "../hooks/useLinearMeetingDocuments";
import type { ProjectDocumentEntity } from "../lib/documentStatusGroups";
import { seedLinearDocumentContentFromEntity } from "../lib/linearDocumentContentSeed";
import {
  groupMeetingDocumentsByWeek,
  resolveMeetingDocumentWeekKey,
} from "../lib/meetingDocumentWeekGroups";
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
import { meetingDocumentDisplayTitle } from "../lib/meetingDocumentTitle";
import { MeetingDocumentSidebarRow } from "./project-documents/MeetingDocumentSidebarRow";
import { GroupChevron } from "./workspace-list/GroupChevron";
import { useCollapsibleGroups } from "./workspace-list/useCollapsibleGroups";

const MEETINGS_GROUP_PREFIX = "meetings";

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

export function LinearMeetingsExplorer({
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
  } = useLinearMeetingDocuments({ enabled });
  const keyboardFocusedId = useContentListKeyboardFocusedId();
  const keyboardNavActive = useContentListKeyboardNavActive();
  const canCreateMeeting = enabled && Boolean(teamId.trim()) && !creatingDocument;

  useContentPanelBarState({
    error,
    loading: enabled && loading && documents.length === 0,
    loadingMessage: "Loading meetings…",
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
    return documents.filter((document) => {
      const displayTitle = meetingDocumentDisplayTitle(document.title);
      return (
        matchesSearchQuery(document.title, debouncedSearchQuery) ||
        matchesSearchQuery(displayTitle, debouncedSearchQuery) ||
        matchesSearchQuery(document.organization, debouncedSearchQuery)
      );
    });
  }, [debouncedSearchQuery, documents]);

  const groupedDocuments = useMemo(
    () => groupMeetingDocumentsByWeek(filteredDocuments),
    [filteredDocuments],
  );

  const openDocument = useCallback(
    (document: ProjectDocumentEntity) => {
      setActiveLinearDocument({
        id: document.linearDocumentId,
        title: meetingDocumentDisplayTitle(document.title),
        projectId: document.projectId,
      });
    },
    [setActiveLinearDocument],
  );

  const handleCreateDocument = useCallback(async () => {
    if (!canCreateMeeting) return;

    setCreatingDocument(true);
    setCreateError(null);
    try {
      const result = await createLinearTeamMeetingDocument(teamId);
      if (result.error || !result.document) {
        setCreateError(result.error ?? "Failed to create meeting note.");
        return;
      }

      const createdDocument = result.document;
      expandGroup(resolveMeetingDocumentWeekKey(createdDocument));
      prependDocument(createdDocument);
      seedLinearDocumentContentFromEntity(createdDocument);
      openDocument(createdDocument);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create meeting note.");
    } finally {
      setCreatingDocument(false);
    }
  }, [canCreateMeeting, expandGroup, openDocument, prependDocument, teamId]);

  const firstVisibleDocument = useMemo(() => {
    for (const group of groupedDocuments) {
      if (collapsedGroups.has(group.key)) continue;
      const first = group.entries[0];
      if (first) return first;
    }
    return groupedDocuments[0]?.entries[0] ?? null;
  }, [collapsedGroups, groupedDocuments]);

  useEffect(() => {
    if (!enabled || loading || !firstVisibleDocument || activeLinearDocument) {
      return;
    }
    openDocument(firstVisibleDocument);
  }, [activeLinearDocument, enabled, firstVisibleDocument, loading, openDocument]);

  const listNavItems = useMemo(() => {
    const items: Array<{ id: string; select: () => void }> = [];

    for (const group of groupedDocuments) {
      const groupHeaderId = contentListGroupHeaderId(MEETINGS_GROUP_PREFIX, group.key);
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

  return (
    <div className="vault-folder-explorer">
      <div className="vault-folder-explorer-search">
        <input
          type="search"
          className="vault-folder-explorer-search-input"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search meetings…"
          aria-label="Search meetings"
          disabled={!enabled}
        />
        <button
          type="button"
          className="vault-folder-explorer-add"
          onClick={() => {
            void handleCreateDocument();
          }}
          disabled={!canCreateMeeting}
          aria-label="New meeting note"
          title="New meeting note"
        >
          <PlusIcon />
        </button>
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
        <ul className="vault-folder-explorer-list" aria-label="Meetings">
          {groupedDocuments.length > 0 ? (
            groupedDocuments.map((group) => {
              const collapsed = collapsedGroups.has(group.key);
              const groupHeaderId = contentListGroupHeaderId(MEETINGS_GROUP_PREFIX, group.key);
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
                    <span className="sidebar-list-group-count">{group.entries.length}</span>
                  </button>
                  {!collapsed ? (
                    <ul className="vault-folder-explorer-week-group-list">
                      {group.entries.map((document) => (
                        <MeetingDocumentSidebarRow
                          key={document.linearDocumentId}
                          document={document}
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
                {debouncedSearchQuery
                  ? "No matching documents."
                  : "No meeting documents with the Calendar icon yet."}
              </p>
            </li>
          )}
        </ul>
      ) : null}
    </div>
  );
}
