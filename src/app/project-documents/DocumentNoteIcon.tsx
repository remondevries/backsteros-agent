import { DocumentIcon } from "../../ui/icons/DocumentIcon";

export function DocumentNoteIcon({
  className,
  size = 16,
}: {
  className?: string;
  size?: number;
}) {
  return <DocumentIcon className={className} size={size} />;
}
