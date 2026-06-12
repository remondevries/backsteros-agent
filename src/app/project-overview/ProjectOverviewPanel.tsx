import { useState } from "react";
import { LinearPriorityIcon } from "../../chat/LinearPriorityIcon";
import { LinearProjectIcon } from "../../chat/LinearProjectIcon";
import { getPriorityLabel } from "../../chat/linearPriority";
import { useContentPanelBarState } from "../../hooks/useContentPanelBarState";
import { useLinearProjectOverview } from "../../hooks/useLinearProjectOverview";
import {
  formatOverviewStartMonth,
  formatOverviewTargetDate,
} from "../../lib/linearOverviewFormat";
import { ProjectOverviewDescriptionEditor } from "./ProjectOverviewDescriptionEditor";
import { ProjectOverviewLeadPill, ProjectOverviewPill } from "./ProjectOverviewPill";
import { ProjectOverviewMetaRow } from "./ProjectOverviewMetaRow";
import { ProjectOverviewSkeleton } from "./ProjectOverviewSkeleton";

export function ProjectOverviewPanel({
  projectId,
  enabled,
}: {
  projectId: string;
  enabled: boolean;
}) {
  const [editorBar, setEditorBar] = useState({
    saving: false,
    dirty: false,
    error: null as string | null,
  });
  const { overview, loading, refreshing, error, refresh, saveDescription } = useLinearProjectOverview(
    projectId,
    enabled,
  );

  useContentPanelBarState({
    saving: editorBar.saving,
    dirty: editorBar.dirty,
    error: editorBar.error ?? error,
    loading: loading && !overview,
    loadingMessage: "Loading overview…",
    refreshing,
    onRefresh: refresh,
  });

  if (loading && !overview) {
    return (
      <div className="project-overview-scroll">
        <ProjectOverviewSkeleton />
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="project-overview-scroll">
        <div className="project-overview project-overview-error" role="alert">
          {error || "Failed to load overview."}
        </div>
      </div>
    );
  }

  const summary = overview.summary?.trim() || "No summary.";
  const initiative = overview.initiativeNames[0];
  const description = overview.description ?? "";
  const priorityLabel = overview.priorityLabel || getPriorityLabel(overview.priority);

  return (
    <div className="project-overview-scroll">
      <article className="project-overview">
        <header className="project-overview-header">
          <div className="project-overview-icon" aria-hidden="true">
            {overview.icon ? (
              <span className="project-overview-icon-emoji">{overview.icon}</span>
            ) : (
              <LinearProjectIcon title={overview.name} />
            )}
          </div>
          <h1 className="project-overview-title">{overview.name}</h1>
          <p className="project-overview-summary">{summary}</p>
        </header>

        <section className="project-overview-meta" aria-label="Project metadata">
          <ProjectOverviewMetaRow label="Properties">
            <ProjectOverviewPill>
              <span>{overview.state}</span>
            </ProjectOverviewPill>
            <ProjectOverviewPill>
              <LinearPriorityIcon priority={overview.priority} title={priorityLabel} />
              <span>{priorityLabel}</span>
            </ProjectOverviewPill>
            {overview.leadName ? (
              <ProjectOverviewLeadPill
                name={overview.leadName}
                avatarUrl={overview.leadAvatarUrl}
              />
            ) : null}
            <ProjectOverviewPill className="project-overview-pill-dates">
              <span className="project-overview-dates-muted">Start</span>
              <span>{formatOverviewStartMonth(overview.startDate)}</span>
              <span className="project-overview-dates-arrow" aria-hidden="true">
                →
              </span>
              <span>{formatOverviewTargetDate(overview.targetDate)}</span>
            </ProjectOverviewPill>
          </ProjectOverviewMetaRow>

          <ProjectOverviewMetaRow label="Initiatives">
            {initiative ? (
              <ProjectOverviewPill>
                <span>{initiative}</span>
              </ProjectOverviewPill>
            ) : (
              <span className="project-overview-muted">—</span>
            )}
          </ProjectOverviewMetaRow>
        </section>

        <ProjectOverviewDescriptionEditor
          projectId={projectId}
          value={description}
          onSave={saveDescription}
          onBarStateChange={setEditorBar}
        />
      </article>
    </div>
  );
}
