import { useCallback, useMemo, useState } from "react";
import { compareDocumentsNewestFirst,
  documentStatusGroupVariant,
  type ProjectDocumentEntity,
} from "../../lib/documentStatusGroups";
import { seedLinearDocumentContentFromEntity } from "../../lib/linearDocumentContentSeed";
import { createDraftDocumentEntity, linearSync, rollbackOptimisticDocumentCreate } from "../../lib/linearSync";
import { useContentPanelBarState } from "../../hooks/useContentPanelBarState";
import { useLinearProjectDocuments } from "../../hooks/useLinearProjectDocuments";
import { useLinearWorkspaceTabCreateAction } from "../../hooks/useLinearWorkspaceTabCreateAction";
import { useContentPanelNavigation } from "../contentPanelNavigation";
import { buildStatusGroupedNavItems } from "../../lib/buildStatusGroupedNavItems";
import { useContentListNavigationRegistration } from "../../lib/contentListNavigationReact";
import { DocumentStatusIcon } from "../workspace-list/DocumentStatusIcon";
import { StatusGroupedList } from "../workspace-list/StatusGroupedList";
import { useCollapsibleGroups } from "../workspace-list/useCollapsibleGroups";
import { ProjectDocumentRow } from "./ProjectDocumentRow";

const INBOX_GROUP_KEY = "Inbox";

function openProjectDocument(
  document: ProjectDocumentEntity,
  setActiveLinearDocument: ReturnType<typeof useContentPanelNavigation>["setActiveLinearDocument"],
) {
  setActiveLinearDocument({
    id: document.linearDocumentId,
    title: document.title,
    projectId: document.projectId,
  });
}

export function ProjectDocumentsPanel({
  projectId,
  teamId,
  enabled,
}: {
  projectId?: string | null;
  teamId?: string | null;
  enabled: boolean;
}) {
  const { setActiveLinearDocument, activeLinearDocument, clearActiveLinearDocument } =
    useContentPanelNavigation();
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const isProjectView = Boolean(projectId);
  const { documents, loading, refreshing, error, refresh, prependDocument } =
    useLinearProjectDocuments({
      projectId,
      teamId,
      enabled,
    });
  const { collapsedGroups, toggleGroup } = useCollapsibleGroups();

  useContentPanelBarState({
    error,
    loading: loading && documents.length === 0,
    loadingMessage: "Loading documents…",
    refreshing,
    onRefresh: refresh,
  });

  const handleCreateDocument = useCallback(() => {
    if (!projectId || creating) return;

    setCreating(true);
    setCreateError(null);

    const draft = createDraftDocumentEntity({
      projectId,
      title: "Untitled",
    });
    prependDocument(draft);
    seedLinearDocumentContentFromEntity(draft);
    openProjectDocument(draft, setActiveLinearDocument);

    void linearSync.enqueueDocumentCreate({
      kind: "project",
      projectId,
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
        setCreating(false);
      });
  }, [activeLinearDocument?.id, creating, clearActiveLinearDocument, prependDocument, projectId, setActiveLinearDocument]);

  useLinearWorkspaceTabCreateAction(
    isProjectView && enabled
      ? {
          disabled: creating,
          label: "New document",
          onCreate: () => {
            void handleCreateDocument();
          },
        }
      : null,
  );

  const sortedDocuments = useMemo(
    () => [...documents].sort(compareDocumentsNewestFirst),
    [documents],
  );

  const groups = useMemo(() => {
    if (isProjectView) return [];

    return [
      {
        key: INBOX_GROUP_KEY,
        title: INBOX_GROUP_KEY,
        count: sortedDocuments.length,
        items: sortedDocuments,
        variant: documentStatusGroupVariant("Inbox"),
        icon: <DocumentStatusIcon status="Inbox" title={INBOX_GROUP_KEY} />,
      },
    ];
  }, [isProjectView, sortedDocuments]);

  const listNavItems = useMemo(() => {
    if (isProjectView) {
      return sortedDocuments.map((document) => ({
        id: document.linearDocumentId,
        select: () => openProjectDocument(document, setActiveLinearDocument),
      }));
    }

    return buildStatusGroupedNavItems({
      groups,
      collapsedGroups,
      groupHeaderIdPrefix: "project-documents-group",
      onToggleGroup: toggleGroup,
      getItemId: (document) => document.linearDocumentId,
      onSelect: (document) => openProjectDocument(document, setActiveLinearDocument),
    });
  }, [
    collapsedGroups,
    groups,
    isProjectView,
    setActiveLinearDocument,
    sortedDocuments,
    toggleGroup,
  ]);

  useContentListNavigationRegistration({
    region: "main",
    enabled: enabled && listNavItems.length > 0,
    items: listNavItems,
    selectedId: activeLinearDocument?.id ?? null,
  });

  const renderDocumentRow = useCallback(
    (document: ProjectDocumentEntity) => (
      <ProjectDocumentRow
        key={document.id}
        document={document}
        grouped={!isProjectView}
        onClick={() => openProjectDocument(document, setActiveLinearDocument)}
      />
    ),
    [isProjectView, setActiveLinearDocument],
  );

  if (loading && documents.length === 0) {
    return <div className="workspace-status-list-scroll" aria-busy="true" />;
  }

  if (error) {
    return (
      <div className="workspace-status-list-scroll">
        <div className="workspace-status-list-error" role="alert">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="workspace-status-list-scroll">
      {createError ? (
        <div className="workspace-status-list-error workspace-status-list-error--inline" role="alert">
          {createError}
        </div>
      ) : null}
      {isProjectView ? (
        sortedDocuments.length === 0 ? (
          <div className="linear-workspace-view-placeholder">
            <p>No documents for this project yet.</p>
          </div>
        ) : (
          <div className="workspace-status-list workspace-status-list--documents workspace-status-list--documents-flat">
            <ul className="workspace-status-list__list" role="list">
              {sortedDocuments.map((document) => renderDocumentRow(document))}
            </ul>
          </div>
        )
      ) : (
        <StatusGroupedList
          className="workspace-status-list workspace-status-list--documents"
          groups={groups}
          collapsedGroups={collapsedGroups}
          onToggleGroup={toggleGroup}
          idPrefix="project-documents-group"
          renderItem={renderDocumentRow}
        />
      )}
    </div>
  );
}
