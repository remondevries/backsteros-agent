import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LinearProjectIcon } from "../chat/LinearProjectIcon";
import {
  createLinearProjectDocument,
  createLinearTeamDocument,
  createLinearTeamProject,
} from "../lib/api";
import { useContentPanelBarState } from "../hooks/useContentPanelBarState";
import { useAutoOpenFirstListItem, useExplorerIosChrome } from "../hooks/useExplorerIosChrome";
import { useIosExplorerSearchChrome } from "../hooks/useIosExplorerSearchChrome";
import { useLinearProjectDocuments } from "../hooks/useLinearProjectDocuments";
import { useLinearTeamProjects } from "../hooks/useLinearTeamProjects";
import type { ProjectDocumentEntity } from "../lib/documentStatusGroups";
import { seedLinearDocumentContentFromEntity } from "../lib/linearDocumentContentSeed";
import { registerContentPanelLocalBack } from "../lib/contentPanelLocalBack";
import {
  contentListItemDataAttributes,
} from "../lib/contentListNavigation";
import {
  useContentListKeyboardFocusedId,
  useContentListKeyboardNavActive,
  useContentListNavigationRegistration,
} from "../lib/contentListNavigationReact";
import {
  buildKnowledgeBaseProjectFolders,
  filterKnowledgeBaseDocuments,
  KNOWLEDGE_BASE_NO_PROJECT_KEY,
  selectKnowledgeBaseDocuments,
} from "../lib/knowledgeBaseProjectGroups";
import {
  useContentPanelNavigation,
  useContentPanelSidebarBreadcrumbs,
} from "./contentPanelNavigation";
import {
  KnowledgeBaseCreateMenu,
  type KnowledgeBaseCreateAction,
} from "./KnowledgeBaseCreateMenu";
import { ProjectDocumentRow } from "./project-documents/ProjectDocumentRow";

function knowledgeBaseProjectFolderId(projectKey: string): string {
  return `kb-folder-${projectKey}`;
}

function resolveKnowledgeBaseProjectKey(document: ProjectDocumentEntity): string {
  return document.projectId?.trim() || KNOWLEDGE_BASE_NO_PROJECT_KEY;
}

export function LinearKnowledgeBaseExplorer({
  teamId,
  enabled,
}: {
  teamId: string;
  enabled: boolean;
}) {
  const { activeLinearDocument, setActiveLinearDocument } = useContentPanelNavigation();
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedProjectKey, setSelectedProjectKey] = useState<string | null>(null);
  const [selectedProjectLabel, setSelectedProjectLabel] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const { documents, loading, refreshing, error, refresh: refreshDocuments, prependDocument } =
    useLinearProjectDocuments({
      teamId,
      enabled,
    });
  const {
    projects: teamProjects,
    loading: teamProjectsLoading,
    error: teamProjectsError,
    refresh: refreshTeamProjects,
    prependProject,
  } = useLinearTeamProjects(teamId, enabled);
  const keyboardFocusedId = useContentListKeyboardFocusedId();
  const keyboardNavActive = useContentListKeyboardNavActive();

  const knowledgeBaseDocuments = useMemo(
    () => selectKnowledgeBaseDocuments(documents),
    [documents],
  );

  useContentPanelBarState({
    error: error ?? teamProjectsError,
    loading: enabled && (loading || teamProjectsLoading) && knowledgeBaseDocuments.length === 0,
    loadingMessage: "Loading knowledge base…",
    refreshing,
    onRefresh: () => {
      refreshDocuments();
      refreshTeamProjects();
    },
  });

  useEffect(() => {
    setSelectedProjectKey(null);
    setSelectedProjectLabel(null);
    setSearchQuery("");
    setDebouncedSearchQuery("");
  }, [teamId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim().toLocaleLowerCase());
    }, 200);
    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  const projectFolders = useMemo(
    () => buildKnowledgeBaseProjectFolders(knowledgeBaseDocuments, teamProjects),
    [knowledgeBaseDocuments, teamProjects],
  );

  const isRootFolderView = !selectedProjectKey && !debouncedSearchQuery;

  const rootSearchDocuments = useMemo(() => {
    if (!debouncedSearchQuery || selectedProjectKey) return [];
    return filterKnowledgeBaseDocuments(knowledgeBaseDocuments, debouncedSearchQuery);
  }, [debouncedSearchQuery, knowledgeBaseDocuments, selectedProjectKey]);

  const projectDocuments = useMemo(() => {
    if (!selectedProjectKey) return [];
    return filterKnowledgeBaseDocuments(
      knowledgeBaseDocuments.filter(
        (document) => resolveKnowledgeBaseProjectKey(document) === selectedProjectKey,
      ),
      debouncedSearchQuery,
    );
  }, [debouncedSearchQuery, knowledgeBaseDocuments, selectedProjectKey]);

  const visibleDocuments = selectedProjectKey ? projectDocuments : rootSearchDocuments;

  const openProjectFolder = useCallback((projectKey: string, projectLabel: string) => {
    setSelectedProjectKey(projectKey);
    setSelectedProjectLabel(projectLabel);
    setSearchQuery("");
    setDebouncedSearchQuery("");
    setCreateError(null);
  }, []);

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

  const handleCreateDocument = useCallback(async () => {
    if (!enabled || creating) return;

    setCreating(true);
    setCreateError(null);
    try {
      const projectId =
        selectedProjectKey && selectedProjectKey !== KNOWLEDGE_BASE_NO_PROJECT_KEY
          ? selectedProjectKey
          : null;
      const result = projectId
        ? await createLinearProjectDocument(projectId)
        : await createLinearTeamDocument(teamId);

      if (result.error || !result.document) {
        setCreateError(result.error ?? "Failed to create document.");
        return;
      }

      prependDocument(result.document);
      seedLinearDocumentContentFromEntity(result.document);
      openDocument(result.document);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create document.");
    } finally {
      setCreating(false);
    }
  }, [creating, enabled, openDocument, prependDocument, selectedProjectKey, teamId]);

  const handleCreateFolder = useCallback(async () => {
    if (!enabled || creating) return;

    setCreating(true);
    setCreateError(null);
    try {
      const result = await createLinearTeamProject(teamId);
      if (result.error || !result.project) {
        setCreateError(result.error ?? "Failed to create folder.");
        return;
      }

      prependProject(result.project);
      openProjectFolder(result.project.id, result.project.name);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create folder.");
    } finally {
      setCreating(false);
    }
  }, [creating, enabled, openProjectFolder, prependProject, teamId]);

  const handleCreateAction = useCallback(
    (action: KnowledgeBaseCreateAction) => {
      if (action === "document") {
        void handleCreateDocument();
        return;
      }
      void handleCreateFolder();
    },
    [handleCreateDocument, handleCreateFolder],
  );

  useAutoOpenFirstListItem({
    enabled,
    loading: enabled && loading && knowledgeBaseDocuments.length === 0,
    shouldOpen:
      Boolean(selectedProjectKey) &&
      visibleDocuments.length > 0 &&
      !activeLinearDocument,
    onOpenFirst: () => openDocument(visibleDocuments[0]!),
  });

  useEffect(() => {
    return registerContentPanelLocalBack(() => {
      if (!enabled || activeLinearDocument || !selectedProjectKey) return false;
      setSelectedProjectKey(null);
      setSelectedProjectLabel(null);
      return true;
    });
  }, [activeLinearDocument, enabled, selectedProjectKey]);

  const sidebarBreadcrumbs = useMemo(() => {
    if (!selectedProjectKey || !selectedProjectLabel) return [];
    return [
      {
        id: `kb-project-${selectedProjectKey}`,
        label: selectedProjectLabel,
        onActivate: () => {
          setSelectedProjectKey(null);
          setSelectedProjectLabel(null);
        },
      },
    ];
  }, [selectedProjectKey, selectedProjectLabel]);

  useContentPanelSidebarBreadcrumbs(sidebarBreadcrumbs, enabled);

  const listNavItems = useMemo(() => {
    const items: Array<{ id: string; select: () => void }> = [];

    if (isRootFolderView) {
      for (const folder of projectFolders) {
        const folderId = knowledgeBaseProjectFolderId(folder.key);
        items.push({
          id: folderId,
          select: () => openProjectFolder(folder.key, folder.label),
        });
      }
      return items;
    }

    for (const document of visibleDocuments) {
      items.push({
        id: document.linearDocumentId,
        select: () => openDocument(document),
      });
    }

    return items;
  }, [isRootFolderView, openDocument, openProjectFolder, projectFolders, visibleDocuments]);

  const selectedListId = activeLinearDocument?.id ?? null;

  useContentListNavigationRegistration({
    region: "sidebar",
    enabled: enabled && listNavItems.length > 0,
    items: listNavItems,
    selectedId: selectedListId,
  });

  const listError = error ?? teamProjectsError;
  const listLoading = loading || teamProjectsLoading;
  const showList = enabled && !listLoading && !listError;

  const emptyMessage = debouncedSearchQuery
    ? "No matching documents."
    : selectedProjectKey
      ? "No documents in this project."
      : "No folders yet.";

  useExplorerIosChrome(
    enabled
      ? [
          {
            id: "kb-create-document",
            label: "Create document",
            disabled: creating,
            onClick: () => {
              void handleCreateDocument();
            },
          },
          {
            id: "kb-create-folder",
            label: "Create folder",
            disabled: creating,
            onClick: () => {
              void handleCreateFolder();
            },
          },
        ]
      : null,
  );

  const { searchVisibleClassName } = useIosExplorerSearchChrome({
    enabled,
    label: "Search knowledge base",
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
          placeholder="Search knowledge base…"
          aria-label="Search knowledge base"
          disabled={!enabled}
        />
        <KnowledgeBaseCreateMenu disabled={!enabled || creating} onSelect={handleCreateAction} />
      </div>
      {listError ? (
        <p className="vault-folder-explorer-status vault-folder-explorer-status-error">{listError}</p>
      ) : null}
      {createError ? (
        <p className="vault-folder-explorer-status vault-folder-explorer-status-error">{createError}</p>
      ) : null}
      {showList ? (
        <ul className="vault-folder-explorer-list" aria-label="Knowledge base">
          {isRootFolderView ? (
            projectFolders.length > 0 ? (
              projectFolders.map((folder) => {
                const folderId = knowledgeBaseProjectFolderId(folder.key);
                return (
                  <li key={folder.key} className="vault-folder-explorer-item">
                    <button
                      type="button"
                      {...contentListItemDataAttributes(folderId)}
                      className={[
                        "vault-folder-explorer-entry",
                        "vault-folder-explorer-entry-directory",
                        keyboardNavActive && keyboardFocusedId === folderId
                          ? "vault-folder-explorer-entry-keyboard-focused"
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => openProjectFolder(folder.key, folder.label)}
                    >
                      <LinearProjectIcon title={folder.label} />
                      <span className="vault-folder-explorer-entry-name">{folder.label}</span>
                      <span className="sidebar-list-group-count">{folder.entries.length}</span>
                    </button>
                  </li>
                );
              })
            ) : (
              <li className="vault-folder-explorer-item">
                <p className="vault-folder-explorer-status">{emptyMessage}</p>
              </li>
            )
          ) : visibleDocuments.length > 0 ? (
            visibleDocuments.map((document) => (
              <ProjectDocumentRow
                key={document.linearDocumentId}
                document={document}
                grouped={false}
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
