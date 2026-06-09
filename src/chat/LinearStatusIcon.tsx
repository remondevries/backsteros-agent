export type LinearStatusIconKey =
  | "triage"
  | "backlog"
  | "unstarted"
  | "started"
  | "in_review"
  | "on_hold"
  | "completed"
  | "unknown";

export function resolveLinearStatusKey(
  status?: string,
  stateType?: string,
): LinearStatusIconKey {
  const name = status?.trim().toLowerCase() ?? "";
  const type = stateType?.trim().toLowerCase() ?? "";

  if (name.includes("in review")) return "in_review";
  if (name.includes("on hold")) return "on_hold";

  if (type === "triage" || name === "triage") return "triage";
  if (type === "backlog" || name.includes("backlog")) return "backlog";
  if (type === "completed" || name === "done" || name === "completed") return "completed";
  if (type === "unstarted" || name === "todo" || name === "unstarted") return "unstarted";
  if (type === "started" || name.includes("progress")) return "started";

  if (type === "canceled" || name === "canceled" || name === "cancelled") return "unstarted";

  if (name.includes("ready to start")) return "unstarted";
  if (name.includes("review")) return "in_review";
  if (name.includes("hold")) return "on_hold";

  return "unknown";
}

function TriageIcon() {
  return (
    <path d="M7 14C10.866 14 14 10.866 14 7C14 3.134 10.866 0 7 0C3.134 0 0 3.134 0 7C0 10.866 3.134 14 7 14ZM8.013 9.508V7.982H5.987V9.508C5.987 9.929 5.477 10.155 5.149 9.879L2.174 7.371C1.942 7.175 1.942 6.825 2.174 6.629L5.149 4.121C5.477 3.845 5.987 4.071 5.987 4.492V6.018H8.013V4.492C8.013 4.071 8.523 3.845 8.851 4.121L11.826 6.629C12.058 6.825 12.058 7.175 11.826 7.371L8.851 9.879C8.523 10.155 8.013 9.929 8.013 9.508Z" />
  );
}

function BacklogIcon() {
  return (
    <path d="M13.941 7.914L11.958 7.656C11.986 7.442 12 7.223 12 7C12 6.777 11.986 6.558 11.958 6.344L13.941 6.086C13.98 6.385 14 6.69 14 7C14 7.31 13.98 7.615 13.941 7.914ZM13.469 4.32C13.233 3.751 12.924 3.22 12.554 2.739L10.968 3.957C11.233 4.302 11.453 4.681 11.621 5.087L13.469 4.32ZM11.261 1.446L10.043 3.032C9.698 2.767 9.319 2.547 8.913 2.379L9.68 0.531C10.249 0.767 10.78 1.076 11.261 1.446ZM7.914 0.059L7.656 2.042C7.442 2.014 7.223 2 7 2C6.777 2 6.558 2.014 6.344 2.042L6.086 0.059C6.385 0.02 6.69 0 7 0C7.31 0 7.615 0.02 7.914 0.059ZM4.32 0.531L5.087 2.379C4.681 2.547 4.302 2.767 3.957 3.032L2.739 1.446C3.22 1.076 3.751 0.767 4.32 0.531ZM1.446 2.739L3.032 3.957C2.767 4.302 2.547 4.681 2.379 5.087L0.531 4.32C0.767 3.751 1.076 3.22 1.446 2.739ZM0.059 6.086C0.02 6.385 0 6.69 0 7C0 7.31 0.02 7.615 0.059 7.914L2.042 7.656C2.014 7.442 2 7.223 2 7C2 6.777 2.014 6.558 2.042 6.344L0.059 6.086ZM0.531 9.68L2.379 8.913C2.547 9.319 2.767 9.698 3.032 10.043L1.446 11.261C1.076 10.78 0.767 10.249 0.531 9.68ZM2.739 12.554L3.957 10.968C4.302 11.233 4.681 11.453 5.087 11.621L4.32 13.469C3.751 13.233 3.22 12.924 2.739 12.554ZM6.086 13.941L6.344 11.958C6.558 11.986 6.777 12 7 12C7.223 12 7.442 11.986 7.656 11.958L7.914 13.941C7.615 13.98 7.31 14 7 14C6.69 14 6.385 13.98 6.086 13.941ZM9.68 13.469L8.913 11.621C9.319 11.453 9.698 11.233 10.043 10.968L11.261 12.554C10.78 12.924 10.249 13.233 9.68 13.469ZM12.554 11.261L10.968 10.043C11.233 9.698 11.453 9.319 11.621 8.913L13.469 9.68C13.233 10.249 12.924 10.78 12.554 11.261Z" />
  );
}

function UnstartedIcon() {
  return (
    <path
      d="M13 7C13 3.686 10.314 1 7 1C3.686 1 1 3.686 1 7C1 10.314 3.686 13 7 13C10.314 13 13 10.314 13 7Z"
      fill="none"
      stroke="#E2E2E2"
      strokeWidth="1.5"
    />
  );
}

function StartedIcon() {
  return (
    <>
      <path
        d="M13 7C13 3.686 10.314 1 7 1C3.686 1 1 3.686 1 7C1 10.314 3.686 13 7 13C10.314 13 13 10.314 13 7Z"
        fill="none"
        stroke="#FABD00"
        strokeWidth="1.5"
      />
      <path
        d="M7 7V3.5C7.928 3.5 8.819 3.869 9.475 4.525C10.131 5.181 10.5 6.072 10.5 7H7Z"
        fill="#FABD00"
      />
    </>
  );
}

function InReviewIcon() {
  return (
    <>
      <path
        d="M13 7C13 3.686 10.314 1 7 1C3.686 1 1 3.686 1 7C1 10.314 3.686 13 7 13C10.314 13 13 10.314 13 7Z"
        fill="none"
        stroke="#00A933"
        strokeWidth="1.5"
      />
      <path
        d="M7 7V3.5C7.692 3.5 8.369 3.705 8.944 4.09C9.52 4.474 9.969 5.021 10.234 5.661C10.498 6.3 10.568 7.004 10.433 7.683C10.298 8.362 9.964 8.985 9.475 9.475C8.985 9.964 8.362 10.298 7.683 10.433C7.004 10.568 6.3 10.498 5.661 10.234C5.021 9.969 4.474 9.52 4.09 8.944C3.705 8.369 3.5 7.692 3.5 7H7Z"
        fill="#00A933"
      />
    </>
  );
}

function OnHoldIcon() {
  return (
    <>
      <path
        d="M13 7C13 3.686 10.314 1 7 1C3.686 1 1 3.686 1 7C1 10.314 3.686 13 7 13C10.314 13 13 10.314 13 7Z"
        fill="none"
        stroke="#EB5757"
        strokeWidth="1.5"
      />
      <path
        d="M7 7V3.5C7.928 3.5 8.819 3.869 9.475 4.525C10.131 5.181 10.5 6.072 10.5 7C10.5 7.928 10.131 8.819 9.475 9.475C8.819 10.131 7.928 10.5 7 10.5V7Z"
        fill="#EB5757"
      />
    </>
  );
}

function CompletedIcon() {
  return (
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M7 0C3.134 0 0 3.134 0 7C0 10.866 3.134 14 7 14C10.866 14 14 10.866 14 7C14 3.134 10.866 0 7 0ZM11.101 5.101C11.433 4.769 11.433 4.231 11.101 3.899C10.769 3.567 10.231 3.567 9.899 3.899L5.5 8.298L4.101 6.899C3.769 6.567 3.231 6.567 2.899 6.899C2.567 7.231 2.567 7.769 2.899 8.101L4.899 10.101C5.231 10.433 5.769 10.433 6.101 10.101L11.101 5.101Z"
    />
  );
}

const ICON_FILLS: Partial<Record<LinearStatusIconKey, string>> = {
  triage: "#FF6615",
  backlog: "#BEC2C8",
  completed: "#5C6ADA",
};

export function LinearStatusIcon({
  status,
  stateType,
  title,
}: {
  status?: string;
  stateType?: string;
  title?: string;
}) {
  const iconKey = resolveLinearStatusKey(status, stateType);
  const label = status ?? stateType ?? "Unknown status";

  return (
    <svg
      className="linear-status-icon"
      viewBox="0 0 14 14"
      width="14"
      height="14"
      aria-hidden={title ? undefined : true}
      aria-label={title ? undefined : label}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      <g fill={ICON_FILLS[iconKey] ?? "none"}>
        {iconKey === "triage" && <TriageIcon />}
        {iconKey === "backlog" && <BacklogIcon />}
        {(iconKey === "unstarted" || iconKey === "unknown") && <UnstartedIcon />}
        {iconKey === "started" && <StartedIcon />}
        {iconKey === "in_review" && <InReviewIcon />}
        {iconKey === "on_hold" && <OnHoldIcon />}
        {iconKey === "completed" && <CompletedIcon />}
      </g>
    </svg>
  );
}
