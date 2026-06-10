import { InlineDetailPill } from "./InlineDetailPill";
import { WhoopIcon } from "./WhoopIcon";

export function WhoopRecoveryScoreLabel({
  score,
  onClick,
}: {
  score: number;
  onClick: () => void;
}) {
  return (
    <InlineDetailPill
      icon={<WhoopIcon size={18} variant="solid" />}
      value={score}
      scoreVariant="recovery"
      onClick={onClick}
      ariaLabel={`Whoop recovery score ${score} — open Whoop dashboard`}
      title="Open Whoop dashboard"
    />
  );
}
