import { useCallback, useEffect, useRef, useState } from "react";
import { TiptapEditor } from "../../editor/TiptapEditor";
import { useContentPanelBarState } from "../../hooks/useContentPanelBarState";
import { useLinearIssueDetail } from "../../hooks/useLinearIssueDetail";
import { useContentPanelNavigation } from "../contentPanelNavigation";
import { ResizablePanel } from "../ResizablePanel";
import { LinearIssueActionBar } from "./LinearIssueActionBar";
import { LinearIssueDetailsPanel } from "./LinearIssueDetailsPanel";

const LINEAR_ISSUE_DETAILS_WIDTH_KEY = "backsteros.layout.linearIssueDetailsWidth";
const SAVE_DEBOUNCE_MS = 800;

export function LinearIssueView({ issueId }: { issueId: string }) {
  const { updateActiveLinearIssue, setFocusContentSnapshot, linearIssueRefreshNonce } =
    useContentPanelNavigation();
  const { issue, loading, refreshing, updating, error, refresh, updateIssue } = useLinearIssueDetail(
    issueId,
  );
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [descriptionDirty, setDescriptionDirty] = useState(false);
  const [descriptionSaving, setDescriptionSaving] = useState(false);
  const [descriptionSaveError, setDescriptionSaveError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const descriptionRef = useRef(descriptionDraft);
  const userEditedDescriptionRef = useRef(false);
  descriptionRef.current = descriptionDraft;

  useContentPanelBarState({
    saving: descriptionSaving,
    dirty: descriptionDirty,
    error: descriptionSaveError ?? error,
    loading: loading && !issue,
    loadingMessage: "Loading issue…",
    refreshing: refreshing || updating,
    onRefresh: refresh,
  });

  useEffect(() => {
    if (linearIssueRefreshNonce === 0) return;
    void refresh({ silent: true });
  }, [linearIssueRefreshNonce, refresh]);

  useEffect(() => {
    setDescriptionDraft("");
    setDescriptionDirty(false);
    setDescriptionSaving(false);
    setDescriptionSaveError(null);
    userEditedDescriptionRef.current = false;
  }, [issueId]);

  useEffect(() => {
    if (!issue) return;
    if (descriptionDirty || userEditedDescriptionRef.current) return;
    setDescriptionDraft(issue.description ?? "");
  }, [descriptionDirty, issue]);

  useEffect(
    () => () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!issue) return;
    updateActiveLinearIssue({
      identifier: issue.identifier,
      title: issue.title,
      status: issue.status,
      stateType: issue.stateType,
    });
  }, [issue, updateActiveLinearIssue]);

  useEffect(() => {
    if (!issue) return;
    setFocusContentSnapshot({
      kind: "linear_issue",
      description: descriptionDraft || null,
    });
  }, [descriptionDraft, issue, setFocusContentSnapshot]);

  const handleStatusChange = useCallback(
    (stateId: string) => {
      void updateIssue({ stateId });
    },
    [updateIssue],
  );

  const handlePriorityChange = useCallback(
    (priority: string) => {
      const value = Number(priority);
      if (!Number.isFinite(value)) return;
      void updateIssue({ priority: Math.round(value) });
    },
    [updateIssue],
  );

  const handleEstimateChange = useCallback(
    (estimate: string) => {
      const value = Number(estimate);
      if (!Number.isFinite(value) || value <= 0) {
        void updateIssue({ estimate: null });
        return;
      }
      void updateIssue({ estimate: Math.round(value) });
    },
    [updateIssue],
  );

  const handleLabelAdd = useCallback(
    (labelId: string) => {
      if (!issue) return;
      const existingLabelIds = issue.labels
        .map((label) => label.id)
        .filter((id): id is string => typeof id === "string" && id.trim().length > 0);
      const nextLabelIds = Array.from(new Set([...existingLabelIds, labelId]));
      void updateIssue({ labelIds: nextLabelIds });
    },
    [issue, updateIssue],
  );

  const persistDescription = useCallback(
    async (content: string) => {
      setDescriptionSaving(true);
      setDescriptionSaveError(null);
      try {
        const normalized = content.trim();
        const saveError = await updateIssue({
          description: normalized.length > 0 ? content : null,
        });
        if (saveError) {
          setDescriptionSaveError(saveError);
          return;
        }
        setDescriptionDirty(false);
      } catch (err) {
        setDescriptionSaveError(err instanceof Error ? err.message : "Failed to save description");
      } finally {
        setDescriptionSaving(false);
      }
    },
    [updateIssue],
  );

  const scheduleDescriptionSave = useCallback(
    (content: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        void persistDescription(content);
      }, SAVE_DEBOUNCE_MS);
    },
    [persistDescription],
  );

  const handleDescriptionFocus = () => {
    userEditedDescriptionRef.current = true;
  };

  const handleDescriptionChange = (nextDescription: string) => {
    setDescriptionDraft(nextDescription);
    if (!userEditedDescriptionRef.current) return;
    setDescriptionDirty(true);
    setDescriptionSaveError(null);
    scheduleDescriptionSave(nextDescription);
  };

  const handleDescriptionBlur = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (descriptionDirty && userEditedDescriptionRef.current) {
      void persistDescription(descriptionRef.current);
    }
  };

  return (
    <div className="linear-issue-layout">
      <div className="linear-issue-main">
        {!issue ? (
          <div className="linear-issue-scroll" />
        ) : (
          <div className="linear-issue-scroll">
            <article className="linear-issue">
              <header className="linear-issue-header">
                <h1 className="linear-issue-title">{issue.title}</h1>
              </header>
              <div className="linear-issue-body-editor">
                <TiptapEditor
                  value={descriptionDraft}
                  onChange={handleDescriptionChange}
                  onFocus={handleDescriptionFocus}
                  onBlur={handleDescriptionBlur}
                  format="markdown"
                  placeholder="Add a description…"
                  className="linear-issue-tiptap"
                />
              </div>
            </article>
          </div>
        )}
      </div>

      {issue ? (
        <ResizablePanel
          side="right"
          className="app-resizable-panel-inset linear-issue-details-resizable"
          storageKey={LINEAR_ISSUE_DETAILS_WIDTH_KEY}
          defaultWidth={300}
          minWidth={300}
          maxWidth={480}
          ariaLabel="Issue details"
        >
          <div className="linear-issue-details-shell">
            <LinearIssueActionBar issue={issue} />
            <div className="linear-issue-details-scroll">
              <LinearIssueDetailsPanel
                issue={issue}
                onStatusChange={handleStatusChange}
                onPriorityChange={handlePriorityChange}
                onEstimateChange={handleEstimateChange}
                onLabelAdd={handleLabelAdd}
              />
            </div>
          </div>
        </ResizablePanel>
      ) : null}
    </div>
  );
}
