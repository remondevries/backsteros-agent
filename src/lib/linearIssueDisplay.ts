const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/** Order of issue status groups when grouping by state. Matched case-insensitively on the key. */
export const ISSUE_STATE_ORDER = [
  "triage",
  "backlog",
  "ready to start",
  "in progress",
  "on hold",
  "in review",
  "completed",
  "done",
  "todo",
  "to do",
  "planned",
  "maintenance",
  "development",
  "canceled",
  "duplicate",
] as const;

function formatLocalYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getTodayYmdLocal(): string {
  return formatLocalYmd(new Date());
}

function parseYmdLocal(ymd: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return new Date(year, month - 1, day);
}

/**
 * When Linear's issue title is `Title — description`, return the short head for compact rows.
 */
export function linearIssueTitleForCardDisplay(title: string | null | undefined): string {
  const trimmed = (title ?? "").trim();
  if (!trimmed) return "";
  const match = /^(.*?)\s+-\s+.+$/u.exec(trimmed);
  if (match?.[1]) {
    const head = match[1].trim();
    if (head.length > 0) return head;
  }
  return trimmed;
}

/** Compact due-date label for issue list meta pills (Paper 2TE-0). */
export function formatIssueDueMetaLabel(dueDate: string | null | undefined): string | null {
  const ymd = (dueDate ?? "").trim().slice(0, 10);
  if (!ymd) return null;

  const today = getTodayYmdLocal();
  if (ymd === today) return "Today";

  const due = parseYmdLocal(ymd);
  if (!due) return null;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (ymd === formatLocalYmd(tomorrow)) return "Tomorrow";

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (ymd === formatLocalYmd(yesterday)) return "Yesterday";

  const month = MONTH_NAMES[due.getMonth()];
  if (!month) return null;
  return `${month} ${due.getDate()}`;
}

export function statusOrderIndex(status: string): number {
  const normalized = status.toLowerCase().trim();
  const exact = ISSUE_STATE_ORDER.indexOf(normalized as (typeof ISSUE_STATE_ORDER)[number]);
  if (exact !== -1) return exact;

  for (let index = 0; index < ISSUE_STATE_ORDER.length; index++) {
    const candidate = ISSUE_STATE_ORDER[index]!;
    if (normalized.includes(candidate) || candidate.includes(normalized)) {
      return index;
    }
  }

  return ISSUE_STATE_ORDER.length;
}
