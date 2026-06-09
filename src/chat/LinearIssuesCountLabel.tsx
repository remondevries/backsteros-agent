import { LinearIcon } from "./LinearIcon";

export function LinearIssuesCountLabel({
  count,
  onClick,
}: {
  count: number;
  onClick: () => void;
}) {
  const issueWord = count === 1 ? "issue" : "issues";

  return (
    <button
      type="button"
      className="linear-issues-inline-label"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
      aria-label={`${count} Linear ${issueWord} — open Linear dashboard`}
      title="Open Linear dashboard"
    >
      <LinearIcon className="linear-issues-inline-label-icon" size={12} />
      <span className="linear-issues-inline-label-count">{count}</span>
    </button>
  );
}
