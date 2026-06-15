import {
  isGoogleCalendarAuthenticated,
  isGoogleCalendarConfigured,
  isWhoopAuthenticated,
  isWhoopConfigured,
} from "../config.ts";
import { getLinearAuthToken } from "../linear/auth-token.ts";
import type { ToolSelection } from "../tool-routing.ts";

export function integrationReadinessHints(tools: ToolSelection): string[] {
  const hints: string[] = [];

  if (tools.linear && !getLinearAuthToken()) {
    hints.push(
      `[Linear setup]
Linear MCP is attached but Linear OAuth is not connected.
Connect Linear OAuth in Settings before using Linear tools.`,
    );
  }

  if (tools.calendar) {
    if (!isGoogleCalendarConfigured()) {
      hints.push(
        `[Calendar setup]
Google Calendar is not configured. Set GOOGLE_OAUTH_CREDENTIALS in ~/.backsteros-agent/.env to a Desktop OAuth JSON file.`,
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
Whoop is not configured. Open Settings → Whoop and sign in with your Whoop account.`,
      );
    } else if (!isWhoopAuthenticated()) {
      hints.push(
        `[Whoop setup]
totem.env exists but Whoop tokens are missing. Sign in again under Settings → Whoop.`,
      );
    }
  }

  return hints;
}
