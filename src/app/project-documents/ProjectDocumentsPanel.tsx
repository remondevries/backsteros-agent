import { useCallback, useMemo, useState } from "react";
import { createLinearProjectDocument } from "../../lib/api";
import {
  compareDocumentsNewestFirst,
  documentStatusGroupVariant,
} from "../../lib/documentStatusGroups";
import { useContentPanelBarState } from "../../hooks/useContentPanelBarState";
import { useLinearProjectDocuments } from "../../hooks/useLinearProjectDocuments";
import { useContentPanelNavigation } from "../contentPanelNavigation";
import { DocumentStatusIcon } from "../workspace-list/DocumentStatusIcon";
import { GroupHeaderAddButton } from "../workspace-list/GroupHeaderAddButton";
import { StatusGroupedList } from "../workspace-list/StatusGroupedList";
import { useCollapsibleGroups } from "../workspace-list/useCollapsibleGroups";
import { ProjectDocumentRow } from "./ProjectDocumentRow";

const INBOX_GROUP_KEY = "Inbox";

export function ProjectDocumentsPanel({
  projectId,
  teamId,
  enabled,
}: {
  projectId?: string | null;
  teamId?: string | null;
  enabled: boolean;
}) {
  const { setActiveVaultDocument } = useContentPanelNavigation();
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const { documents, loading, refreshing, error, refresh } = useLinearProjectDocuments({
    projectId,
    teamId,
    enabled,
  });
  const { collapsedGroups, toggleGroup, expandGroup } = useCollapsibleGroups();

  useContentPanelBarState({
    error,
    loading: loading && documents.length === 0,
    loadingMessage: "Loading documents…",
    refreshing,
    onRefresh: refresh,
  });

  const handleCreateDocument = useCallback(async () => {
    if (!projectId || creating) return;

    setCreating(true);
    setCreateError(null);
    try {
      const result = await createLinearProjectDocument(projectId);
      if (result.error || !result.document) {
        setCreateError(result.error ?? "Failed to create document.");
        return;
      }

      expandGroup(INBOX_GROUP_KEY);
      await refresh();
      setActiveVaultDocument({
        path: result.document.path,
        title: result.document.title,
      });
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create document.");
    } finally {
      setCreating(false);
    }
  }, [creating, expandGroup, projectId, refresh, setActiveVaultDocument]);

  const groups = useMemo(() => {
    const sorted = [...documents].sort(compareDocumentsNewestFirst);
    return [
      {
        key: INBOX_GROUP_KEY,
        title: INBOX_GROUP_KEY,
        count: sorted.length,
        items: sorted,
        variant: documentStatusGroupVariant("Inbox"),
        icon: <DocumentStatusIcon status="Inbox" title={INBOX_GROUP_KEY} />,
        headerAction: projectId ? (
          <GroupHeaderAddButton
            label="New document"
            disabled={creating}
            onClick={() => {
              void handleCreateDocument();
            }}
          />
        ) : undefined,
      },
    ];
  }, [creating, documents, handleCreateDocument, projectId]);

  if (loading && documents.length === 0) {
    return (
      <div className="workspace-status-list-scroll">
        <div className="workspace-status-list-loading">
          <p>Loading documents…</p>
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
      <StatusGroupedList
        className="workspace-status-list workspace-status-list--documents"
        groups={groups}
        collapsedGroups={collapsedGroups}
        onToggleGroup={toggleGroup}
        idPrefix="project-documents-group"
        renderItem={(document) => (
          <ProjectDocumentRow
            key={document.id}
            document={document}
            grouped
            onClick={() => {
              setActiveVaultDocument({
                path: document.path,
                title: document.title,
              });
            }}
          />
        )}
      />
    </div>
  );
}
