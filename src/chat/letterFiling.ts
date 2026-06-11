export const LETTER_FILING_PAYLOAD_KIND = "letter_filing";

export const LETTER_FILING_STATUS_OPTIONS = [
  "Inbox",
  "In Progress",
  "On Hold",
  "Archive",
] as const;

export type LetterFilingStatusOption = (typeof LETTER_FILING_STATUS_OPTIONS)[number];

export interface LetterFilingOptions {
  contacts: string[];
  organizations: string[];
  projects: string[];
  statuses: LetterFilingStatusOption[];
}

export interface LetterAnalysisSummary {
  creator: string;
  organization: string;
  receivedDate: string;
  subject: string;
  summary: string;
}

export interface LetterFilingPayload {
  kind: typeof LETTER_FILING_PAYLOAD_KIND;
  assigned: string;
  status: string;
  received: string;
  organization: string;
  project: string;
  note: string;
}

export interface LetterFilingDraft {
  assigned: string;
  status: LetterFilingStatusOption;
  received: string;
  organization: string;
  project: string;
  note: string;
}

export function serializeLetterFilingPayload(payload: LetterFilingPayload): string {
  return JSON.stringify(payload);
}

export function createLetterFilingDraft(
  analysis: LetterAnalysisSummary,
  options: LetterFilingOptions,
): LetterFilingDraft {
  const assigned =
    matchOption(analysis.creator, options.contacts) ??
    matchOption(analysis.creator, options.organizations) ??
    analysis.creator;

  const organization =
    matchOption(analysis.organization, options.organizations) ?? analysis.organization;

  const note = pickLetterNote(analysis);

  return {
    assigned,
    status: "Inbox",
    received: analysis.receivedDate,
    organization,
    project: "",
    note,
  };
}

function pickLetterNote(analysis: LetterAnalysisSummary): string {
  if (analysis.subject?.trim()) {
    return analysis.subject.trim();
  }
  if (analysis.summary?.trim()) {
    return analysis.summary.trim();
  }
  return "";
}

function matchOption(value: string, options: string[]): string | null {
  const needle = value.trim();
  if (!needle) return null;

  const exact = options.find(
    (option) => option.localeCompare(needle, undefined, { sensitivity: "accent" }) === 0,
  );
  if (exact) return exact;

  const partial = options.find(
    (option) =>
      option.toLowerCase().includes(needle.toLowerCase()) ||
      needle.toLowerCase().includes(option.toLowerCase()),
  );
  return partial ?? null;
}

export function draftToLetterFilingPayload(draft: LetterFilingDraft): LetterFilingPayload {
  return {
    kind: LETTER_FILING_PAYLOAD_KIND,
    assigned: draft.assigned,
    status: draft.status,
    received: draft.received,
    organization: draft.organization,
    project: draft.project,
    note: draft.note,
  };
}

export function isPdfAttachmentFile(file: File): boolean {
  return (
    file.type.trim().toLowerCase() === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

export function isPdfPendingAttachment(attachment: {
  mimeType: string;
  name: string;
}): boolean {
  return (
    attachment.mimeType.trim().toLowerCase() === "application/pdf" ||
    attachment.name.toLowerCase().endsWith(".pdf")
  );
}
