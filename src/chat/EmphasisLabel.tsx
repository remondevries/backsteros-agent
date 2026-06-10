import { InlineDetailPill } from "./InlineDetailPill";
import { WhoopIcon } from "./WhoopIcon";

export function EmphasisLabel({ text }: { text: string }) {
  return (
    <span className="inline-emphasis-label" title={text}>
      {text}
    </span>
  );
}

export function WhoopSleepDurationLabel({
  duration,
  onClick,
}: {
  duration: string;
  onClick?: () => void;
}) {
  return (
    <InlineDetailPill
      icon={<WhoopIcon size={18} variant="solid" />}
      value={duration}
      scoreVariant="sleep"
      onClick={onClick ?? (() => {})}
      ariaLabel={`Whoop sleep duration ${duration}${onClick ? " — open Whoop dashboard" : ""}`}
      title={onClick ? "Open Whoop dashboard" : "Whoop sleep duration"}
    />
  );
}
