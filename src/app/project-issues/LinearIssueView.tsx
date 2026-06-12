import { useEffect } from "react";
import { LinearPriorityIcon } from "../../chat/LinearPriorityIcon";
import { getPriorityLabel } from "../../chat/linearPriority";
import { TiptapEditor } from "../../editor/TiptapEditor";
import { useContentPanelBarState } from "../../hooks/useContentPanelBarState";
import { useLinearIssueDetail } from "../../hooks/useLinearIssueDetail";
import { useContentPanelNavigation } from "../contentPanelNavigation";

export function LinearIssueView({ issueId }: { issueId: string }) {
  const { updateActiveLinearIssue, setFocusContentSnapshot } = useContentPanelNavigation();
  const { issue, loading, refreshing, error, refresh } = useLinearIssueDetail(issueId);

  useContentPanelBarState({
    error,
    loading: loading && !issue,
    loadingMessage: "Loading issue…",
    refreshing,
    onRefresh: refresh,
  });

  useEffect(() => {
    if (!issue) return;
    updateActiveLinearIssue({
      identifier: issue.identifier,
      title: issue.title,
    });
    setFocusContentSnapshot({
      kind: "linear_issue",
      description: issue.description,
    });
  }, [issue, setFocusContentSnapshot, updateActiveLinearIssue]);

  if (!issue) {
    return <div className="linear-issue-scroll" />;
  }

  const priorityLabel = issue.priorityLabel || getPriorityLabel(issue.priority);
  const description = issue.description?.trim() ?? "";

  return (
    <div className="linear-issue-scroll">
      <article className="linear-issue">
        <header className="linear-issue-header">
          <div className="linear-issue-icon" aria-hidden="true">
            <LinearPriorityIcon priority={issue.priority} title={priorityLabel} />
          </div>
          <p className="linear-issue-identifier">{issue.identifier}</p>
          <h1 className="linear-issue-title">{issue.title}</h1>
        </header>
        <div className="linear-issue-body-editor">
          {description ? (
            <TiptapEditor
              value={description}
              onChange={() => {}}
              format="markdown"
              disabled
              className="linear-issue-tiptap"
            />
          ) : (
            <p className="linear-issue-empty">No description.</p>
          )}
        </div>
      </article>
    </div>
  );
}
