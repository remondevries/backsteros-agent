import {
  getLinearApiKey,
  isGoogleCalendarAuthenticated,
  isGoogleCalendarConfigured,
  isWhoopAuthenticated,
  isWhoopConfigured,
} from "../config.ts";
import type { ToolSelection } from "../tool-routing.ts";

export function integrationReadinessHints(tools: ToolSelection): string[] {
  const hints: string[] = [];

  if (tools.linear && !getLinearApiKey()) {
    hints.push(
      `[Linear setup]
Linear MCP is attached but LINEAR_API_KEY is not set in ~/.backster-agent/.env.
If Linear requests fail, add your API key or authenticate Linear MCP in Cursor.`,
    );
  }

  if (tools.calendar) {
    if (!isGoogleCalendarConfigured()) {
      hints.push(
        `[Calendar setup]
Google Calendar is not configured. Set GOOGLE_OAUTH_CREDENTIALS in ~/.backster-agent/.env to a Desktop OAuth JSON file.`,
      );
    } else if (!isGoogleCalendarAuthenticated()) {
      hints.push(
        `[Calendar setup]
Google Calendar credentials exist but the account is not linked yet.
Ask the user to connect Google Calendar before creating or updating events.`,
      );
    }
  }

  if (tools.whoop) {
    if (!isWhoopConfigured()) {
      hints.push(
        `[Whoop setup]
Whoop is not configured. Run \`npx -y @briangaoo/totem auth\` and save tokens to ~/.backster-agent/totem.env.`,
      );
    } else if (!isWhoopAuthenticated()) {
      hints.push(
        `[Whoop setup]
totem.env exists but Whoop tokens are missing. Re-run totem auth and update ~/.backster-agent/totem.env.`,
      );
    }
  }

  return hints;
}
