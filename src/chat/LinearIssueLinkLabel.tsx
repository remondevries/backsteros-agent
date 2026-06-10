import { InlineDetailPill } from "./InlineDetailPill";
import { LinearIcon } from "./LinearIcon";
import { openExternalUrl } from "../lib/openExternalUrl";

export function LinearIssueLinkLabel({
  label,
  url,
}: {
  label: string;
  url: string;
}) {
  return (
    <InlineDetailPill
      icon={<LinearIcon size={18} />}
      value={label}
      onClick={() => {
        void openExternalUrl(url);
      }}
      ariaLabel={`${label} — open in Linear`}
      title="Open in Linear"
    />
  );
}
