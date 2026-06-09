import type { LinearIssueEntity } from "./types";
import { LinearAssigneeAvatar } from "./LinearAssigneeAvatar";
import { LinearPriorityIcon } from "./LinearPriorityIcon";
import { LinearProjectIcon } from "./LinearProjectIcon";
import { LinearStatusIcon } from "./LinearStatusIcon";
import { formatLinearDueDate, getLinearIssueDisplayId } from "./linearIssue";
import { openExternalUrl } from "../lib/openExternalUrl";
import { getPriorityLabel } from "./linearPriority";

export function LinearIssueRow({ item, hideStatus = false }: { item: LinearIssueEntity; hideStatus?: boolean }) {
  const displayId = getLinearIssueDisplayId(item);
  const priorityLabel = getPriorityLabel(item.priority);
  const statusLabel = item.status ?? "Unknown status";
  const dueLabel = formatLinearDueDate(item.dueDate);
  const rowClassName = hideStatus ? "entity-row linear-issue-row linear-issue-row-hide-status" : "entity-row linear-issue-row";
  const row = (
    <>
      <span className="linear-issue-priority">
        <LinearPriorityIcon priority={item.priority} title={priorityLabel} />
      </span>
      <span className="linear-issue-id">{displayId}</span>
      {!hideStatus && (
        <span className="linear-issue-status">
          <LinearStatusIcon
            status={item.status}
            stateType={item.stateType}
            title={statusLabel}
          />
        </span>
      )}
      <span className="linear-issue-title">{item.title}</span>
      {(item.assigneeAvatarUrl || item.assigneeName) && (
        <span className="linear-issue-assignee">
          <LinearAssigneeAvatar
            name={item.assigneeName}
            avatarUrl={item.assigneeAvatarUrl}
          />
        </span>
      )}
    </>
  );

  return (
    <div className="linear-issue-row-wrap">
      {item.url ? (
        <a
          className={rowClassName}
          href={item.url}
          target="_blank"
          rel="noreferrer"
          onClick={(event) => {
            event.preventDefault();
            void openExternalUrl(item.url!);
          }}
        >
          {row}
        </a>
      ) : (
        <div className={rowClassName}>{row}</div>
      )}

      <div className="linear-issue-popover" role="tooltip">
        <header className="linear-issue-popover-header">
          <span className="linear-issue-popover-id">{displayId}</span>
          {item.assigneeName && (
            <span className="linear-issue-popover-assignee">
              <LinearAssigneeAvatar
                name={item.assigneeName}
                avatarUrl={item.assigneeAvatarUrl}
              />
              <span>{item.assigneeName}</span>
            </span>
          )}
        </header>

        <p className="linear-issue-popover-title">{item.title}</p>

        <div className="linear-issue-popover-divider" />

        <footer className="linear-issue-popover-meta">
          <span className="linear-issue-popover-meta-item">
            <LinearStatusIcon
              status={item.status}
              stateType={item.stateType}
              title={statusLabel}
            />
            <span>{statusLabel}</span>
          </span>
          {item.projectName && (
            <span className="linear-issue-popover-meta-item">
              <LinearProjectIcon title={item.projectName} />
              <span>{item.projectName}</span>
            </span>
          )}
          {dueLabel && (
            <span className="linear-issue-popover-meta-item">
              <span>Due {dueLabel}</span>
            </span>
          )}
          <span className="linear-issue-popover-meta-item">
            <LinearPriorityIcon priority={item.priority} title={priorityLabel} />
            <span>{priorityLabel}</span>
          </span>
        </footer>
      </div>
    </div>
  );
}
