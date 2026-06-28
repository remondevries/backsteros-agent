import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LinearIssueEntity } from "../chat/types";
import { createInboxDraftIssue } from "../lib/inboxDraftIssue";
import { linearSync, createDraftDocumentEntity, rollbackOptimisticDocumentCreate, rollbackOptimisticIssueCreate } from "../lib/linearSync";
import { seedLinearDocumentContentFromEntity } from "../lib/linearDocumentContentSeed";
import {
  seedLinearIssueDetailFromEntity,
} from "../lib/linearIssueDetailSeed";
import { useContentPanelBarState } from "../hooks/useContentPanelBarState";
import { useExplorerIosChrome } from "../hooks/useExplorerIosChrome";
import { useIosExplorerSearchChrome } from "../hooks/useIosExplorerSearchChrome";
import { useBinaryContentModeShortcuts } from "../hooks/useBinaryContentModeShortcuts";
import { useLinearProjectDocuments } from "../hooks/useLinearProjectDocuments";
import { useLinearTeamIssues } from "../hooks/useLinearTeamIssues";
import type { ProjectDocumentEntity } from "../lib/documentStatusGroups";
import {
  useContentListNavigationRegistration,
} from "../lib/contentListNavigationReact";
import {
  useContentPanelNavigation,
  useContentPanelSidebarBreadcrumbs,
} from "./contentPanelNavigation";
import { InboxContentModeToggle, type InboxContentMode } from "./InboxContentModeToggle";
import { ProjectDocumentRow } from "./project-documents/ProjectDocumentRow";
import { ProjectIssueRow } from "./project-issues/ProjectIssueRow";
import { requestLinearIssueViewMode } from "./project-issues/issueViewModeIntent";

const INBOX_CONTENT_MODE_STORAGE_KEY = "backsteros.inbox.contentMode";

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

function readStoredInboxContentMode(): InboxContentMode {
  if (typeof window === "undefined") return "issues";
  const stored = window.sessionStorage.getItem(INBOX_CONTENT_MODE_STORAGE_KEY);
  return stored === "documents" ? "documents" : "issues";
}

function matchesSearchQuery(value: string, query: string): boolean {
  if (!query) return true;
  return value.toLocaleLowerCase().includes(query);
}

export function LinearInboxExplorer({
  teamId,
  enabled,
}: {
  teamId: string;
  enabled: boolean;
}) {
  const {
    activeLinearDocument,
    activeLinearIssue,
    setActiveLinearDocument,
    setActiveLinearIssue,
    clearActiveLinearIssue,
    clearActiveLinearDocument,
  } = useContentPanelNavigation();
  const [contentMode, setContentMode] = useState<InboxContentMode>(readStoredInboxContentMode);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [creatingDocument, setCreatingDocument] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const activeLinearIssueIdRef = useRef<string | null>(null);
  const showingIssues = contentMode === "issues";
  const {
    issues,
    loading: issuesLoading,
    refreshing: issuesRefreshing,
    error: issuesError,
    refresh: refreshIssues,
    prependIssue,
  } = useLinearTeamIssues(teamId, enabled && showingIssues);
  const {
    documents,
    loading: documentsLoading,
    refreshing: documentsRefreshing,
    error: documentsError,
    refresh: refreshDocuments,
    prependDocument,
  } = useLinearProjectDocuments({
    teamId,
    enabled: enabled && !showingIssues,
  });

  const handleRefresh = useCallback(() => {
    if (showingIssues) {
      refreshIssues();
    } else {
      refreshDocuments();
    }
  }, [refreshDocuments, refreshIssues, showingIssues]);

  const loading =
    enabled &&
    (showingIssues ? issuesLoading : documentsLoading) &&
    (showingIssues ? issues.length === 0 : documents.length === 0);
  const refreshing = showingIssues ? issuesRefreshing : documentsRefreshing;
  const error = showingIssues ? issuesError : documentsError;

  useBinaryContentModeShortcuts({
    enabled,
    mode: contentMode,
    modes: ["issues", "documents"],
    onChange: setContentMode,
  });

  useContentPanelBarState({
    error,
    loading,
    loadingMessage: "Loading inbox…",
    refreshing,
    onRefresh: handleRefresh,
    iosNavItemId: "inbox",
  });

  const sidebarBreadcrumbs = useMemo(() => {
    if (activeLinearIssue) {
      return [
        {
          id: "inbox-content-issues",
          label: "Issues",
          onActivate: () => clearActiveLinearIssue(),
        },
      ];
    }
    if (activeLinearDocument) {
      return [
        {
          id: "inbox-content-documents",
          label: "Documents",
          onActivate: () => clearActiveLinearDocument(),
        },
      ];
    }
    return [];
  }, [
    activeLinearDocument,
    activeLinearIssue,
    clearActiveLinearDocument,
    clearActiveLinearIssue,
  ]);

  useContentPanelSidebarBreadcrumbs(sidebarBreadcrumbs, enabled);

  useEffect(() => {
    activeLinearIssueIdRef.current = activeLinearIssue?.id ?? null;
  }, [activeLinearIssue?.id]);

  useEffect(() => {
    window.sessionStorage.setItem(INBOX_CONTENT_MODE_STORAGE_KEY, contentMode);
  }, [contentMode]);

  useEffect(() => {
    if (activeLinearIssue) {
      setContentMode("issues");
      return;
    }
    if (activeLinearDocument) {
      setContentMode("documents");
    }
  }, [activeLinearDocument, activeLinearIssue]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim().toLocaleLowerCase());
    }, 200);
    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      const haystack = [issue.title, issue.identifier, issue.projectName]
        .filter(Boolean)
        .join(" ");
      return matchesSearchQuery(haystack, debouncedSearchQuery);
    });
  }, [debouncedSearchQuery, issues]);

  const filteredDocuments = useMemo(() => {
    return documents.filter((document) =>
      matchesSearchQuery(document.title, debouncedSearchQuery),
    );
  }, [debouncedSearchQuery, documents]);

  const openIssue = useCallback(
    (issue: LinearIssueEntity, mode: "issue" | "terminal" = "issue", options?: { freshCreate?: boolean }) => {
      seedLinearIssueDetailFromEntity(issue, { freshCreate: options?.freshCreate });
      if (mode === "terminal") {
        requestLinearIssueViewMode(issue.id, "terminal");
      }
      activeLinearIssueIdRef.current = issue.id;
      setActiveLinearIssue({
        id: issue.id,
        identifier: issue.identifier?.trim() || undefined,
        title: issue.title,
        status: issue.status,
        stateType: issue.stateType,
        projectName: issue.projectName?.trim() || undefined,
      });
    },
    [setActiveLinearIssue],
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

  const handleCreateIssue = useCallback(() => {
    if (!enabled) return;

    setCreateError(null);
    const draft = createInboxDraftIssue();

    prependIssue(draft);
    openIssue(draft, "issue", { freshCreate: true });

    void linearSync.enqueueIssueCreate({
      kind: "team",
      teamId,
      localIssue: draft,
    }).catch((err) => {
      rollbackOptimisticIssueCreate(draft.id);
      if (activeLinearIssueIdRef.current === draft.id) {
        clearActiveLinearIssue();
      }
      setCreateError(err instanceof Error ? err.message : "Failed to create issue.");
    });
  }, [
    clearActiveLinearIssue,
    enabled,
    openIssue,
    prependIssue,
    teamId,
  ]);

  const handleCreateDocument = useCallback(() => {
    if (!enabled || creatingDocument) return;

    setCreatingDocument(true);
    setCreateError(null);

    const draft = createDraftDocumentEntity({ title: "Untitled" });
    prependDocument(draft);
    seedLinearDocumentContentFromEntity(draft);
    openDocument(draft);

    void linearSync.enqueueDocumentCreate({
      kind: "team",
      teamId,
      localDocument: draft,
    })
      .catch((err) => {
        rollbackOptimisticDocumentCreate(draft.linearDocumentId);
        if (activeLinearDocument?.id === draft.linearDocumentId) {
          clearActiveLinearDocument();
        }
        setCreateError(err instanceof Error ? err.message : "Failed to create document.");
      })
      .finally(() => {
        setCreatingDocument(false);
      });
  }, [activeLinearDocument?.id, creatingDocument, clearActiveLinearDocument, enabled, openDocument, prependDocument, teamId]);

  const listNavItems = useMemo(() => {
    if (showingIssues) {
      return filteredIssues.map((issue) => ({
        id: issue.id,
        select: () => openIssue(issue),
      }));
    }

    return filteredDocuments.map((document) => ({
      id: document.linearDocumentId,
      select: () => openDocument(document),
    }));
  }, [filteredDocuments, filteredIssues, openDocument, openIssue, showingIssues]);

  const selectedListId = showingIssues
    ? (activeLinearIssue?.id ?? null)
    : (activeLinearDocument?.id ?? null);

  useContentListNavigationRegistration({
    region: "sidebar",
    enabled: enabled && listNavItems.length > 0,
    items: listNavItems,
    selectedId: selectedListId,
  });

  const showList = enabled && !loading && !error;
  const inboxDetailOpen = showingIssues
    ? activeLinearIssue != null
    : activeLinearDocument != null;
  const searchPlaceholder = showingIssues ? "Search issues…" : "Search documents…";
  const searchAriaLabel = showingIssues ? "Search inbox issues" : "Search inbox documents";
  const createLabel = showingIssues ? "New issue" : "New document";
  const listAriaLabel = showingIssues ? "Issues" : "Documents";
  const emptyMessage = showingIssues
    ? debouncedSearchQuery
      ? "No matching issues."
      : "No inbox issues yet."
    : debouncedSearchQuery
      ? "No matching documents."
      : "No inbox documents yet.";

  useExplorerIosChrome(
    enabled && !inboxDetailOpen
      ? [
          {
            id: "inbox-create",
            label: createLabel,
            disabled: !showingIssues && creatingDocument,
            onClick: () => {
              if (showingIssues) {
                void handleCreateIssue();
                return;
              }
              void handleCreateDocument();
            },
          },
        ]
      : null,
  );

  const { searchVisibleClassName } = useIosExplorerSearchChrome({
    enabled,
    label: searchAriaLabel,
  });

  return (
    <div className="vault-folder-explorer">
      <div className="inbox-explorer-toolbar">
        <InboxContentModeToggle
          mode={contentMode}
          onChange={setContentMode}
          disabled={!enabled}
        />
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
            placeholder={searchPlaceholder}
            aria-label={searchAriaLabel}
            disabled={!enabled}
          />
          <button
            type="button"
            className="vault-folder-explorer-add"
            disabled={!enabled || (!showingIssues && creatingDocument)}
            aria-label={createLabel}
            title={createLabel}
            onClick={() => {
              if (showingIssues) {
                void handleCreateIssue();
                return;
              }
              void handleCreateDocument();
            }}
          >
            <PlusIcon />
          </button>
        </div>
      </div>
      {error ? (
        <p className="vault-folder-explorer-status vault-folder-explorer-status-error">{error}</p>
      ) : null}
      {createError ? (
        <p className="vault-folder-explorer-status vault-folder-explorer-status-error" role="alert">
          {createError}
        </p>
      ) : null}
      {showList ? (
        <ul className="vault-folder-explorer-list" aria-label={listAriaLabel}>
          {showingIssues ? (
            filteredIssues.length > 0 ? (
              filteredIssues.map((issue) => (
                <ProjectIssueRow
                  key={issue.id}
                  issue={issue}
                  grouped={false}
                  selected={activeLinearIssue?.id === issue.id}
                  showMeta={true}
                  showIdentifier={false}
                  showPrimaryLabel={false}
                  showDueMeta={false}
                  showEstimateMeta={false}
                  leadingIcon="status"
                  leadingStatusOverride="triage"
                  onClick={() => openIssue(issue)}
                  onTerminalIndicatorClick={() => openIssue(issue, "terminal")}
                />
              ))
            ) : (
              <li className="vault-folder-explorer-item">
                <p className="vault-folder-explorer-status">{emptyMessage}</p>
              </li>
            )
          ) : filteredDocuments.length > 0 ? (
            filteredDocuments.map((document) => (
              <ProjectDocumentRow
                key={document.linearDocumentId}
                document={document}
                grouped={false}
                selected={activeLinearDocument?.id === document.linearDocumentId}
                showMeta={false}
                onClick={() => openDocument(document)}
              />
            ))
          ) : (
            <li className="vault-folder-explorer-item">
              <p className="vault-folder-explorer-status">{emptyMessage}</p>
            </li>
          )}
        </ul>
      ) : null}
    </div>
  );
}
