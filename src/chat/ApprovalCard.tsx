import { isObsidianApprovalAction } from "./approvalBrand";
import { ObsidianIcon } from "./ObsidianIcon";

export function ApprovalCard({
  summary,
  action,
  path,
  description,
  onApprove,
  onReject,
  resolved,
  approved,
}: {
  summary: string;
  action: string;
  path?: string;
  description?: string;
  onApprove: () => void;
  onReject: () => void;
  resolved?: boolean;
  approved?: boolean;
}) {
  const isObsidian = isObsidianApprovalAction(action);

  if (resolved) {
    return (
      <div className="approval-card resolved">
        {approved ? "Approved" : "Rejected"}: {summary}
      </div>
    );
  }

  return (
    <div className="approval-card">
      <div className="approval-title">
        {isObsidian ? (
          <span className="approval-brand-row">
            <ObsidianIcon size={14} />
            <span>Obsidian requires approval</span>
          </span>
        ) : (
          "Approval required"
        )}
      </div>
      {description ? <div className="approval-description">{description}</div> : null}
      <div className="approval-summary">{summary}</div>
      {!isObsidian ? (
        <div className="approval-meta">
          {action}
          {path ? ` · ${path}` : ""}
        </div>
      ) : null}
      <div className="approval-actions">
        <button type="button" className="approval-btn approval-btn-reject" onClick={onReject}>
          Reject
        </button>
        <button type="button" className="approval-btn approval-btn-approve" onClick={onApprove}>
          Approve
        </button>
      </div>
    </div>
  );
}
