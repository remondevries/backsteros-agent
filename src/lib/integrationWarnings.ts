export interface CalendarHealthSnapshot {
  hasGoogleCalendarCredentials: boolean;
  hasGoogleCalendarAuth: boolean;
}

export interface CalendarStartupWarning {
  message: string | null;
  needsConnect: boolean;
}

export function getCalendarStartupWarning(
  health: CalendarHealthSnapshot,
): CalendarStartupWarning {
  if (!health.hasGoogleCalendarCredentials) {
    return { message: null, needsConnect: false };
  }

  if (!health.hasGoogleCalendarAuth) {
    return {
      message:
        "Google Calendar is configured but not linked yet. Connect your Google account in your browser (not inside this window).",
      needsConnect: true,
    };
  }

  return { message: null, needsConnect: false };
}
