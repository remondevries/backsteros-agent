/** Sentinel value for clearing a Linear document project in property dropdowns. */
export const LINEAR_NO_PROJECT_VALUE = "__no_project__";

export function isInboxOrganizationTeam(
  teamId: string | null | undefined,
  inboxTeamId: string | null | undefined,
): boolean {
  const id = teamId?.trim();
  const inboxId = inboxTeamId?.trim();
  if (!id || !inboxId) return false;
  return id === inboxId;
}

/** Inbox documents live on the inbox team in Linear; treat that as unassigned in the UI. */
export function linearDocumentOrganizationDropdownValue(
  teamId: string | null | undefined,
  options?: { inboxSection?: boolean; inboxTeamId?: string | null | undefined },
): string | null {
  const trimmed = teamId?.trim();
  if (!trimmed) return null;
  if (options?.inboxSection && isInboxOrganizationTeam(trimmed, options.inboxTeamId)) {
    return null;
  }
  return trimmed;
}

export const LINEAR_NO_MEETING_SCHEDULE_VALUE = "__no_meeting_schedule__";

const MEETING_SCHEDULE_VALUE_PATTERN = /^(\d{4}-\d{2}-\d{2})(?:\s+(\d{2}:\d{2}))?$/;

export function linearDocumentProjectIdFromDropdownValue(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed === LINEAR_NO_PROJECT_VALUE) return null;
  return trimmed;
}

export function linearDocumentProjectDropdownValue(projectId: string | null | undefined): string {
  const trimmed = projectId?.trim();
  return trimmed || LINEAR_NO_PROJECT_VALUE;
}

export function meetingScheduleDropdownValue(
  date: string | null | undefined,
  time: string | null | undefined,
): string {
  const ymd = (date ?? "").trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    return LINEAR_NO_MEETING_SCHEDULE_VALUE;
  }
  const hm = (time ?? "").trim();
  return hm ? `${ymd} ${hm}` : ymd;
}

export function meetingScheduleFromDropdownValue(value: string): {
  date: string | null;
  time: string | null;
} {
  if (value === LINEAR_NO_MEETING_SCHEDULE_VALUE) {
    return { date: null, time: null };
  }

  const match = MEETING_SCHEDULE_VALUE_PATTERN.exec(value.trim());
  if (!match?.[1]) {
    return { date: null, time: null };
  }

  return {
    date: match[1],
    time: match[2] ?? null,
  };
}
