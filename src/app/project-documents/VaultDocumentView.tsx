import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LinearIssueEntity } from "../../chat/types";
import { LinearStatusIcon } from "../../chat/LinearStatusIcon";
import { TiptapEditor } from "../../editor/TiptapEditor";
import { useContentPanelBarState } from "../../hooks/useContentPanelBarState";
import { useVaultDocument } from "../../hooks/useVaultDocument";
import { useVaultDocumentWhoopSnapshot } from "../../hooks/useVaultDocumentWhoopSnapshot";
import { fetchLinearIssuesByDueDates } from "../../lib/api";
import { isDailyVaultNotePath } from "../../lib/vaultNotePaths";
import { groupLinearIssuesByStatus } from "../../linear/groupLinearIssuesByStatus";
import { useContentPanelNavigation } from "../contentPanelNavigation";
import { ProjectIssueRow } from "../project-issues/ProjectIssueRow";
import { requestLinearIssueViewMode } from "../project-issues/issueViewModeIntent";
import { LinearIcon } from "../../chat/LinearIcon";
import { DocumentNoteIcon } from "./DocumentNoteIcon";
import { VaultDocumentWhoopHeader } from "./VaultDocumentWhoopHeader";

const SAVE_DEBOUNCE_MS = 800;
const DAILY_NOTE_PATH_PATTERN = /^Daily\/(\d{4}-\d{2}-\d{2})\.md$/i;

function dailyDateFromPath(path: string): string | null {
  const normalized = path.replace(/\\/g, "/");
  const match = DAILY_NOTE_PATH_PATTERN.exec(normalized);
  return match?.[1] ?? null;
}

export function VaultDocumentView({ path }: { path: string }) {
  const isDailyNote = isDailyVaultNotePath(path);
  const dailyDateHint = isDailyNote ? dailyDateFromPath(path) : null;
  const { updateActiveVaultDocument, setFocusContentSnapshot, setActiveLinearIssue } =
    useContentPanelNavigation();
  const { document, loading, refreshing, error, save, refresh } = useVaultDocument(path);
  const [whoopRefreshKey, setWhoopRefreshKey] = useState(0);
  const { snapshot: whoopSnapshot, loading: whoopLoading } = useVaultDocumentWhoopSnapshot(
    isDailyNote ? document : null,
    { refreshKey: whoopRefreshKey, expectedPath: path, expectedDate: dailyDateHint },
  );
  const [titleDraft, setTitleDraft] = useState("");
  const [bodyDraft, setBodyDraft] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [dueDateIssues, setDueDateIssues] = useState<LinearIssueEntity[]>([]);
  const [dueDateIssuesLoading, setDueDateIssuesLoading] = useState(false);
  const [dueDateIssuesError, setDueDateIssuesError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleRef = useRef(titleDraft);
  const bodyRef = useRef(bodyDraft);
  const userEditedRef = useRef(false);
  const dueDate = document?.date?.trim() || dailyDateHint || null;
  titleRef.current = titleDraft;
  bodyRef.current = bodyDraft;

  useContentPanelBarState({
    saving,
    dirty,
    error: saveError ?? error,
    loading: loading && !document,
    loadingMessage: "Loading document…",
    refreshing,
    onRefresh: () => {
      setWhoopRefreshKey((current) => current + 1);
      void refresh();
    },
  });

  useEffect(() => {
    setDirty(false);
    setSaveError(null);
    userEditedRef.current = false;
  }, [path]);

  useEffect(() => {
    if (!document || document.path !== path) return;
    if (dirty || userEditedRef.current) return;
    setTitleDraft(document.title);
    setBodyDraft(document.body);
  }, [dirty, document, path]);

  useEffect(() => {
    if (!document || document.path !== path) return;
    setFocusContentSnapshot({
      kind: "vault_document",
      title: titleDraft,
      body: bodyDraft,
    });
  }, [bodyDraft, document, path, setFocusContentSnapshot, titleDraft]);

  useEffect(() => {
    if (!isDailyNote || !dueDate) {
      setDueDateIssues([]);
      setDueDateIssuesLoading(false);
      setDueDateIssuesError(null);
      return;
    }

    let cancelled = false;
    setDueDateIssuesLoading(true);
    setDueDateIssuesError(null);

    void fetchLinearIssuesByDueDates([dueDate])
      .then((result) => {
        if (cancelled) return;
        setDueDateIssues(result.issuesByDueDate[dueDate] ?? []);
      })
      .catch((fetchError) => {
        if (cancelled) return;
        setDueDateIssues([]);
        setDueDateIssuesError(
          fetchError instanceof Error ? fetchError.message : "Failed to load due-date issues",
        );
      })
      .finally(() => {
        if (cancelled) return;
        setDueDateIssuesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dueDate, isDailyNote]);

  const groupedDueDateIssues = useMemo(() => groupLinearIssuesByStatus(dueDateIssues), [dueDateIssues]);
  const showStatusGrouping = groupedDueDateIssues.length > 1;

  const openLinearIssue = useCallback(
    (issue: LinearIssueEntity, mode: "issue" | "terminal" = "issue") => {
      if (mode === "terminal") {
        requestLinearIssueViewMode(issue.id, "terminal");
      }
      setActiveLinearIssue({
        id: issue.id,
        identifier: issue.identifier ?? issue.id,
        title: issue.title,
        status: issue.status,
        stateType: issue.stateType,
        sourceVaultDocumentPath: path,
        sourceVaultDocumentTitle: titleDraft.trim() || document?.title || dailyDateHint || "Daily",
      });
    },
    [dailyDateHint, document?.title, path, setActiveLinearIssue, titleDraft],
  );

  const persist = useCallback(
    async (title: string, body: string) => {
      setSaving(true);
      setSaveError(null);
      try {
        const saveErrorMessage = await save({ title, body });
        if (saveErrorMessage) {
          setSaveError(saveErrorMessage);
          return;
        }
        setDirty(false);
        updateActiveVaultDocument({ title: title.trim() || document?.title || "Untitled" });
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : "Failed to save document");
      } finally {
        setSaving(false);
      }
    },
    [document?.title, save, updateActiveVaultDocument],
  );

  const scheduleSave = useCallback(
    (title: string, body: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        void persist(title, body);
      }, SAVE_DEBOUNCE_MS);
    },
    [persist],
  );

  useEffect(
    () => () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    },
    [],
  );

  const handleTitleFocus = () => {
    userEditedRef.current = true;
  };

  const handleTitleChange = (nextTitle: string) => {
    setTitleDraft(nextTitle);
    if (!userEditedRef.current) return;
    setDirty(true);
    setSaveError(null);
    scheduleSave(nextTitle, bodyRef.current);
  };

  const handleBodyFocus = () => {
    userEditedRef.current = true;
  };

  const handleBodyChange = (nextBody: string) => {
    setBodyDraft(nextBody);
    if (!userEditedRef.current) return;
    setDirty(true);
    setSaveError(null);
    scheduleSave(titleRef.current, nextBody);
  };

  const handleBlur = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (dirty && userEditedRef.current) {
      void persist(titleRef.current, bodyRef.current);
    }
  };

  if (!document) {
    return <div className="vault-document-scroll" />;
  }

  return (
    <div className="vault-document-scroll">
      <article className={`vault-document${isDailyNote ? " vault-document--daily" : ""}`}>
        {isDailyNote && whoopSnapshot ? <VaultDocumentWhoopHeader snapshot={whoopSnapshot} /> : null}
        {isDailyNote && !whoopSnapshot && whoopLoading && document.date ? (
          <p className="vault-document-whoop-status">Loading Whoop…</p>
        ) : null}
        <header className="vault-document-header">
          {!isDailyNote ? (
            <div className="vault-document-icon" aria-hidden="true">
              <DocumentNoteIcon size={16} />
            </div>
          ) : null}
          <input
            type="text"
            className="vault-document-title"
            value={titleDraft}
            onChange={(event) => handleTitleChange(event.target.value)}
            onFocus={handleTitleFocus}
            onBlur={handleBlur}
            placeholder="Untitled"
            aria-label="Document title"
          />
        </header>
        <div className="vault-document-body-editor">
          <TiptapEditor
            value={bodyDraft}
            onChange={handleBodyChange}
            onFocus={handleBodyFocus}
            onBlur={handleBlur}
            format="markdown"
            placeholder="Start writing…"
            className="vault-document-tiptap"
          />
        </div>
        {isDailyNote && dueDate ? (
          <section className="vault-document-linear-issues">
            <p className="vault-document-linear-issues-title">
              <span className="vault-document-linear-issues-title-icon" aria-hidden="true">
                <LinearIcon size={14} />
              </span>
              <span>Linear</span>
            </p>
            {dueDateIssuesLoading ? (
              <p className="vault-document-linear-issues-status">Loading issues…</p>
            ) : null}
            {!dueDateIssuesLoading && dueDateIssuesError ? (
              <p className="vault-document-linear-issues-status vault-document-linear-issues-status-error">
                {dueDateIssuesError}
              </p>
            ) : null}
            {!dueDateIssuesLoading && !dueDateIssuesError ? (
              dueDateIssues.length > 0 ? (
                showStatusGrouping ? (
                  <div className="vault-document-linear-issues-groups">
                    {groupedDueDateIssues.map((group) => (
                      <section key={group.status} className="vault-document-linear-issues-group">
                        <p className="vault-document-linear-issues-group-header">
                          <span className="vault-document-linear-issues-group-icon" aria-hidden="true">
                            <LinearStatusIcon
                              status={group.status}
                              stateType={group.stateType}
                              title={group.status}
                            />
                          </span>
                          <span className="vault-document-linear-issues-group-title">{group.status}</span>
                          <span className="vault-document-linear-issues-group-count">{group.issues.length}</span>
                        </p>
                        <ul className="workspace-status-list vault-document-linear-issues-list">
                          {group.issues.map((issue) => (
                            <ProjectIssueRow
                              key={issue.id}
                              issue={issue}
                              grouped={false}
                              leadingIcon="status"
                              showPrimaryLabel={false}
                              showProjectLabel
                              showDueMeta={false}
                              showEstimateMeta={false}
                              onClick={() => {
                                openLinearIssue(issue);
                              }}
                              onTerminalIndicatorClick={() => {
                                openLinearIssue(issue, "terminal");
                              }}
                            />
                          ))}
                        </ul>
                      </section>
                    ))}
                  </div>
                ) : (
                  <ul className="workspace-status-list vault-document-linear-issues-list">
                    {dueDateIssues.map((issue) => (
                      <ProjectIssueRow
                        key={issue.id}
                        issue={issue}
                        grouped={false}
                        leadingIcon="status"
                        showPrimaryLabel={false}
                        showProjectLabel
                        showDueMeta={false}
                        showEstimateMeta={false}
                        onClick={() => {
                          openLinearIssue(issue);
                        }}
                        onTerminalIndicatorClick={() => {
                          openLinearIssue(issue, "terminal");
                        }}
                      />
                    ))}
                  </ul>
                )
              ) : (
                <p className="vault-document-linear-issues-status">
                  No Linear issues due on this date.
                </p>
              )
            ) : null}
          </section>
        ) : null}
      </article>
    </div>
  );
}
