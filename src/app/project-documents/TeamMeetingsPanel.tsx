import { useCallback, useMemo, useState } from "react";
import { createLinearTeamMeetingDocument } from "../../lib/api";
import {
  compareDocumentsNewestFirst,
  type ProjectDocumentEntity,
} from "../../lib/documentStatusGroups";
import { useContentPanelBarState } from "../../hooks/useContentPanelBarState";
import { useLinearProjectDocuments } from "../../hooks/useLinearProjectDocuments";
import { useLinearWorkspaceTabCreateAction } from "../../hooks/useLinearWorkspaceTabCreateAction";
import { isLinearMeetingDocumentIcon } from "../../lib/linearDocumentIcons";
import { meetingDocumentDisplayTitle } from "../../lib/meetingDocumentTitle";
import { useContentPanelNavigation } from "../contentPanelNavigation";
import { useContentListNavigationRegistration } from "../../lib/contentListNavigationReact";
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

export function TeamMeetingsPanel({
  teamId,
  enabled,
}: {
  teamId: string;
  enabled: boolean;
}) {
  const { setActiveLinearDocument, activeLinearDocument } = useContentPanelNavigation();
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const { documents: allDocuments, loading, refreshing, error, refresh, prependDocument } =
    useLinearProjectDocuments({
      teamId,
      enabled,
    });
  const documents = useMemo(
    () => allDocuments.filter((document) => isLinearMeetingDocumentIcon(document.icon)),
    [allDocuments],
  );

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
      const result = await createLinearTeamMeetingDocument(teamId);
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
  }, [creating, prependDocument, setActiveLinearDocument, teamId]);

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
          <p>No meeting documents for this organization yet.</p>
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
