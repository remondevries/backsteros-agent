import { useEffect, useState } from "react";
import { LinearPriorityIcon } from "../../chat/LinearPriorityIcon";
import { LinearProjectIcon } from "../../chat/LinearProjectIcon";
import { getPriorityLabel } from "../../chat/linearPriority";
import { useLinearProjectOverview } from "../../hooks/useLinearProjectOverview";
import {
  formatOverviewStartMonth,
  formatOverviewTargetDate,
} from "../../lib/linearOverviewFormat";
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
  const { overview, loading, error } = useLinearProjectOverview(projectId, enabled);
  const [descriptionExpanded, setDescriptionExpanded] = useState(true);

  useEffect(() => {
    setDescriptionExpanded(true);
  }, [projectId, overview?.description]);

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
  const description = overview.description?.trim();
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

          <ProjectOverviewMetaRow label="Notes">
            <span className="project-overview-muted">—</span>
          </ProjectOverviewMetaRow>
        </section>

        {description ? (
          <section
            className="project-overview-body"
            data-expanded={descriptionExpanded ? "true" : "false"}
          >
            <div className="project-overview-description-block">
              <button
                type="button"
                className="project-overview-description-toggle"
                aria-expanded={descriptionExpanded}
                onClick={() => setDescriptionExpanded((open) => !open)}
              >
                <span>Description</span>
                <span className="project-overview-description-chevron" aria-hidden="true">
                  ▾
                </span>
              </button>
              {descriptionExpanded ? (
                <div className="project-overview-description">{description}</div>
              ) : null}
            </div>
          </section>
        ) : null}
      </article>
    </div>
  );
}
