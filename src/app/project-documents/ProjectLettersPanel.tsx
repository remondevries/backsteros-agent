import { useCallback, useMemo } from "react";
import {
  compareDocumentsNewestFirst,
  type ProjectDocumentEntity,
} from "../../lib/documentStatusGroups";
import { useContentPanelBarState } from "../../hooks/useContentPanelBarState";
import { useLinearProjectDocuments } from "../../hooks/useLinearProjectDocuments";
import { useLinearWorkspaceTabCreateAction } from "../../hooks/useLinearWorkspaceTabCreateAction";
import { isLinearMeetingDocumentIcon } from "../../lib/linearDocumentIcons";
import { linearLinkedDocumentDisplayTitle } from "../../lib/linearLinkedDocumentTitle";
import { createLetterComposeDraftDocument } from "../../lib/letterComposeDraft";
import { useContentPanelNavigation } from "../contentPanelNavigation";
import { useContentListNavigationRegistration } from "../../lib/contentListNavigationReact";
import { ProjectDocumentRow } from "./ProjectDocumentRow";

function openLetterDocument(
  document: ProjectDocumentEntity,
  setActiveLinearDocument: ReturnType<typeof useContentPanelNavigation>["setActiveLinearDocument"],
) {
  setActiveLinearDocument({
    id: document.linearDocumentId,
    title: linearLinkedDocumentDisplayTitle(document.title),
    projectId: document.projectId,
  });
}

export function ProjectLettersPanel({
  projectId,
  enabled,
}: {
  projectId: string;
  enabled: boolean;
}) {
  const { setActiveLinearDocument, activeLinearDocument } = useContentPanelNavigation();
  const { documents: allDocuments, loading, refreshing, error, refresh } = useLinearProjectDocuments({
    projectId,
    enabled,
  });
  const documents = useMemo(
    () => allDocuments.filter((document) => !isLinearMeetingDocumentIcon(document.icon)),
    [allDocuments],
  );

  useContentPanelBarState({
    error,
    loading: loading && documents.length === 0,
    loadingMessage: "Loading letters…",
    refreshing,
    onRefresh: refresh,
  });

  const handleCreateLetter = useCallback(() => {
    if (!enabled) return;
    const draft = createLetterComposeDraftDocument();
    setActiveLinearDocument({ ...draft, projectId });
  }, [enabled, projectId, setActiveLinearDocument]);

  useLinearWorkspaceTabCreateAction(
    enabled
      ? {
          disabled: false,
          label: "New letter",
          onCreate: handleCreateLetter,
        }
      : null,
  );

  const sortedDocuments = useMemo(
    () => [...documents].sort(compareDocumentsNewestFirst),
    [documents],
  );

  const listNavItems = useMemo(
    () =>
      sortedDocuments.map((document) => ({
        id: document.linearDocumentId,
        select: () => openLetterDocument(document, setActiveLinearDocument),
      })),
    [setActiveLinearDocument, sortedDocuments],
  );

  useContentListNavigationRegistration({
    region: "main",
    enabled: enabled && listNavItems.length > 0,
    items: listNavItems,
    selectedId: activeLinearDocument?.id ?? null,
  });

  if (loading && documents.length === 0) {
    return (
      <div className="workspace-status-list-scroll">
        <div className="workspace-status-list-loading">
          <p>Loading letters…</p>
        </div>
      </div>
    );
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
      {sortedDocuments.length === 0 ? (
        <div className="linear-workspace-view-placeholder">
          <p>No letters for this project yet.</p>
        </div>
      ) : (
        <div className="workspace-status-list workspace-status-list--documents workspace-status-list--documents-flat">
          <ul className="workspace-status-list__list" role="list">
            {sortedDocuments.map((document) => (
              <ProjectDocumentRow
                key={document.id}
                document={document}
                grouped={false}
                iconFallback="letter"
                onClick={() => openLetterDocument(document, setActiveLinearDocument)}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
