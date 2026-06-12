import type { McpServerConfig } from "@cursor/sdk";
import {
  getGoogleCalendarAccountId,
  getGoogleCalendarTokenPath,
  getGoogleOAuthCredentialsPath,
  getWhoopEnv,
  isGoogleCalendarConfigured,
} from "./config.ts";
import { getLinearAuthToken, linearAuthorizationHeader } from "./linear/auth-token.ts";
import type { ToolSelection } from "./tool-routing.ts";

export function getLinearMcpServers(): Record<string, McpServerConfig> {
  const headers: Record<string, string> = {};
  const apiKey = getLinearAuthToken();
  if (apiKey) {
    headers.Authorization = linearAuthorizationHeader(apiKey);
  }

  return {
    linear: {
      type: "http",
      url: "https://mcp.linear.app/mcp",
      ...(Object.keys(headers).length > 0 ? { headers } : {}),
    },
  };
}

export function getGoogleCalendarMcpServers(): Record<string, McpServerConfig> | null {
  const credentialsPath = getGoogleOAuthCredentialsPath();
  if (!isGoogleCalendarConfigured() || !credentialsPath) {
    return null;
  }

  return {
    "google-calendar": {
      type: "stdio",
      command: "npx",
      args: ["-y", "@cocal/google-calendar-mcp"],
      env: {
        GOOGLE_OAUTH_CREDENTIALS: credentialsPath,
        GOOGLE_CALENDAR_MCP_TOKEN_PATH: getGoogleCalendarTokenPath(),
        GOOGLE_ACCOUNT_MODE: getGoogleCalendarAccountId(),
      },
    },
  };
}

export function getWhoopMcpServers(): Record<string, McpServerConfig> | null {
  const whoopEnv = getWhoopEnv();
  if (!whoopEnv.WHOOP_COGNITO_REFRESH_TOKEN && !whoopEnv.WHOOP_IOS_BEARER_TOKEN) {
    return null;
  }

  return {
    totem: {
      type: "stdio",
      command: "npx",
      args: ["-y", "@briangaoo/totem@1.4.3", "start"],
      env: {
        ...whoopEnv,
        MCP_TRANSPORT: "stdio",
        WHOOP_TOKEN_STORE: "memory",
      },
    },
  };
}

export function getMcpServersForSelection(
  tools: ToolSelection,
): Record<string, McpServerConfig> | undefined {
  const servers: Record<string, McpServerConfig> = {};

  if (tools.linear) {
    Object.assign(servers, getLinearMcpServers());
  }

  if (tools.calendar) {
    const calendarServers = getGoogleCalendarMcpServers();
    if (calendarServers) {
      Object.assign(servers, calendarServers);
    }
  }

  if (tools.whoop) {
    const whoopServers = getWhoopMcpServers();
    if (whoopServers) {
      Object.assign(servers, whoopServers);
    }
  }

  return Object.keys(servers).length > 0 ? servers : undefined;
}
