import { LetterNoteIcon, MeetingNoteIcon } from "../../chat/VaultNoteIcon";
import {
  LINEAR_MEETING_DOCUMENT_ICON,
  normalizeLinearDocumentIcon,
} from "../../lib/linearDocumentIcons";
import { DocumentNoteIcon } from "./DocumentNoteIcon";

export type LinearDocumentNoteIconFallback = "document" | "letter";

export function LinearDocumentNoteIcon({
  icon,
  className,
  size = 16,
  fallback = "document",
}: {
  icon?: string | null;
  className?: string;
  size?: number;
  fallback?: LinearDocumentNoteIconFallback;
}) {
  if (normalizeLinearDocumentIcon(icon) === LINEAR_MEETING_DOCUMENT_ICON) {
    return <MeetingNoteIcon className={className} size={size} />;
  }

  if (fallback === "letter") {
    return <LetterNoteIcon className={className} size={size} />;
  }

  return <DocumentNoteIcon className={className} size={size} />;
}
