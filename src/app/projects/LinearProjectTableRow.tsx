import { LinearPriorityIcon } from "../../chat/LinearPriorityIcon";
import { LinearProjectIcon } from "../../chat/LinearProjectIcon";
import { LinearStatusIcon } from "../../chat/LinearStatusIcon";
import { getPriorityLabel } from "../../chat/linearPriority";
import type { LinearProjectSummary } from "../../lib/api";
import {
  formatLinearProjectDate,
  formatLinearProjectProgress,
} from "../../lib/formatLinearProjectDate";
import { LinearProjectHealthLabel } from "./LinearProjectHealthLabel";

export function LinearProjectTableRow({
  project,
  selected,
  onSelect,
}: {
  project: LinearProjectSummary;
  selected: boolean;
  onSelect: () => void;
}) {
  const priorityLabel =
    project.priorityLabel?.trim() || getPriorityLabel(project.priority ?? 0);
  const startDateLabel = formatLinearProjectDate(project.startDate);
  const progressLabel = formatLinearProjectProgress(project.progress);
  const statusName = project.status?.name;
  const statusType = project.status?.type;

  return (
    <li className="workspace-status-list__item">
      <button
        type="button"
        className={[
          "linear-project-table-row",
          selected ? "linear-project-table-row--selected" : null,
        ]
          .filter(Boolean)
          .join(" ")}
        aria-current={selected ? "page" : undefined}
        onClick={onSelect}
      >
        <span className="linear-project-table-row__name">
          <LinearProjectIcon title={project.name} />
          <span className="linear-project-table-row__name-text">{project.name}</span>
          {project.health ? (
            <span className="linear-project-table-row__health linear-project-table-row__health--inline">
              <LinearProjectHealthLabel health={project.health} />
            </span>
          ) : null}
          <span className="linear-project-table-row__priority linear-project-table-row__priority--inline" title={priorityLabel}>
            <LinearPriorityIcon priority={project.priority} title={priorityLabel} />
          </span>
        </span>
        <span className="linear-project-table-row__health">
          {project.health ? <LinearProjectHealthLabel health={project.health} /> : null}
        </span>
        <span className="linear-project-table-row__priority" title={priorityLabel}>
          <LinearPriorityIcon priority={project.priority} title={priorityLabel} />
        </span>
        <span className="linear-project-table-row__date">{startDateLabel ?? ""}</span>
        <span className="linear-project-table-row__issues">
          {project.issueCount != null ? project.issueCount : ""}
        </span>
        <span className="linear-project-table-row__status">
          {statusName ? (
            <LinearStatusIcon status={statusName} stateType={statusType} title={statusName} />
          ) : null}
          {progressLabel ? (
            <span className="linear-project-table-row__progress">{progressLabel}</span>
          ) : null}
        </span>
      </button>
    </li>
  );
}
