import { getGoogleCalendarAccountId } from "../config.ts";

export function calendarGuidance(): string {
  const accountId = getGoogleCalendarAccountId();
  return `[Google Calendar]
- Use Google Calendar MCP tools for schedule lookups, availability checks, and event changes.
- The configured account nickname is "${accountId}". Pass account: "${accountId}" when the schema supports it.
- If manage-accounts returns zero accounts, tell the user to connect Google Calendar from the app banner.
- OAuth must complete in the system browser, not inside the app webview.
- Do not claim Calendar is unavailable unless a Google Calendar MCP tool call failed in this run.`;
}
