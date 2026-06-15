import { useCallback, useMemo, useState } from "react";
import { createLinearProjectMeetingDocument } from "../../lib/api";
import {
  compareDocumentsNewestFirst,
  type ProjectDocumentEntity,
} from "../../lib/documentStatusGroups";
import { useContentPanelBarState } from "../../hooks/useContentPanelBarState";
import { useLinearProjectMeetingDocuments } from "../../hooks/useLinearProjectMeetingDocuments";
import { useLinearWorkspaceTabCreateAction } from "../../hooks/useLinearWorkspaceTabCreateAction";
import { useContentPanelNavigation } from "../contentPanelNavigation";
import { useContentListNavigationRegistration } from "../../lib/contentListNavigationReact";
import { meetingDocumentDisplayTitle } from "../../lib/meetingDocumentTitle";
import { ProjectDocumentRow } from "./ProjectDocumentRow";

function openMeetingDocument(
  document: ProjectDocumentEntity,
  setActiveLinearDocument: ReturnType<typeof useContentPanelNavigation>["setActiveLinearDocument"],
) {
  setActiveLinearDocument({
    id: document.linearDocumentId,
    title: meetingDocumentDisplayTitle(document.title),
    projectId: document.projectId,
  });
}

export function ProjectMeetingsPanel({
  projectId,
  enabled,
}: {
  projectId: string;
  enabled: boolean;
}) {
  const { setActiveLinearDocument, activeLinearDocument } = useContentPanelNavigation();
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const { documents, loading, refreshing, error, refresh, prependDocument } =
    useLinearProjectMeetingDocuments({
      projectId,
      enabled,
    });

  useContentPanelBarState({
    error,
    loading: loading && documents.length === 0,
    loadingMessage: "Loading meetings…",
    refreshing,
    onRefresh: refresh,
  });

  const handleCreateMeeting = useCallback(async () => {
    if (creating) return;

    setCreating(true);
    setCreateError(null);
    try {
      const result = await createLinearProjectMeetingDocument(projectId);
      if (result.error || !result.document) {
        setCreateError(result.error ?? "Failed to create meeting note.");
        return;
      }

      prependDocument(result.document);
      openMeetingDocument(result.document, setActiveLinearDocument);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create meeting note.");
    } finally {
      setCreating(false);
    }
  }, [creating, prependDocument, projectId, setActiveLinearDocument]);

  useLinearWorkspaceTabCreateAction(
    enabled
      ? {
          disabled: creating,
          label: "New meeting note",
          onCreate: () => {
            void handleCreateMeeting();
          },
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
        select: () => openMeetingDocument(document, setActiveLinearDocument),
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
          <p>Loading meetings…</p>
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
      {createError ? (
        <div className="workspace-status-list-error workspace-status-list-error--inline" role="alert">
          {createError}
        </div>
      ) : null}
      {sortedDocuments.length === 0 ? (
        <div className="linear-workspace-view-placeholder">
          <p>No meeting documents for this project yet.</p>
        </div>
      ) : (
        <div className="workspace-status-list workspace-status-list--documents workspace-status-list--documents-flat">
          <ul className="workspace-status-list__list" role="list">
            {sortedDocuments.map((document) => (
              <li key={document.id} className="workspace-status-list__item">
                <ProjectDocumentRow
                  document={document}
                  grouped={false}
                  onClick={() => openMeetingDocument(document, setActiveLinearDocument)}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
