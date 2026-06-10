import { InlineDetailPill } from "./InlineDetailPill";
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
    <InlineDetailPill
      icon={<LinearIcon size={18} />}
      value={count}
      onClick={onClick}
      ariaLabel={`${count} Linear ${issueWord} — open Linear dashboard`}
      title="Open Linear dashboard"
    />
  );
}
