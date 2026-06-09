import type { StructuredPayload, ToolCategory } from "./types.ts";
import { enrichCalendarResult } from "./calendar.ts";
import { enrichLinearResult } from "./linear.ts";
import { enrichNotesResult } from "./notes.ts";
import { enrichWhoopResult } from "./whoop.ts";

function argsRecord(args?: unknown): Record<string, unknown> {
  return args && typeof args === "object" ? (args as Record<string, unknown>) : {};
}

function linearArgs(args?: unknown): Record<string, unknown> {
  const root = argsRecord(args);
  const nested = argsRecord(root.args);
  return { ...nested, ...root };
}

function workspaceToolName(args?: unknown): string | undefined {
  const argsObj = linearArgs(args);
  return typeof argsObj.toolName === "string" ? argsObj.toolName : undefined;
}

export function categorizeTool(toolName: string, args?: unknown): ToolCategory {
  const name = toolName.toLowerCase();
  const argsObj = argsRecord(args);
  const innerTool = workspaceToolName(args)?.toLowerCase() ?? "";

  if (
    argsObj.providerIdentifier === "linear" ||
    name.includes("linear") ||
    name.startsWith("mcp_linear")
  ) {
    return "linear";
  }

  const calendarToolPattern =
    /(?:^|[-_])(list-events|search-events|get-freebusy|list-calendars|create-event|update-event|delete-event|respond-to-event|get-event|get-current-time|manage-accounts|list-colors)(?:$|[-_])/;

  if (
    argsObj.providerIdentifier === "google-calendar" ||
    name.includes("google-calendar") ||
    name.startsWith("mcp_google-calendar") ||
    name.startsWith("mcp_google_calendar") ||
    calendarToolPattern.test(name) ||
    calendarToolPattern.test(innerTool)
  ) {
    return "calendar";
  }

  if (
    argsObj.providerIdentifier === "totem" ||
    argsObj.providerIdentifier === "whoop" ||
    name.includes("totem") ||
    name.includes("whoop") ||
    name.startsWith("mcp_totem") ||
    name.startsWith("mcp_whoop") ||
    innerTool.startsWith("whoop_")
  ) {
    return "whoop";
  }

  if (
    innerTool.includes("workspace") ||
    innerTool.includes("count_workspace") ||
    innerTool.includes("list_workspace") ||
    innerTool.includes("read_workspace") ||
    innerTool.includes("write_workspace") ||
    innerTool.includes("append_workspace") ||
    innerTool.includes("today_daily_note") ||
    innerTool.includes("run_workspace_shell")
  ) {
    return "notes";
  }

  if (
    name.includes("read") ||
    name.includes("write") ||
    name.includes("edit") ||
    name.includes("glob") ||
    name.includes("grep") ||
    name.includes("search") ||
    name.includes("delete") ||
    name.includes("file")
  ) {
    return "notes";
  }
  return "generic";
}

export function getToolLabel(
  toolName: string,
  status: "running" | "completed" | "error",
  args?: unknown,
): string {
  const category = categorizeTool(toolName, args);
  const argsObj = linearArgs(args);
  const innerTool =
    typeof argsObj.toolName === "string" ? argsObj.toolName.toLowerCase() : toolName.toLowerCase();

  if (category === "linear") {
    const issueId = argsObj.issueId ?? argsObj.identifier ?? argsObj.id;
    if (typeof issueId === "string") {
      return status === "running"
        ? `Reading Linear issue ${issueId}…`
        : `Read Linear issue ${issueId}`;
    }
    if (innerTool.includes("create")) {
      return status === "running" ? "Creating Linear issue…" : "Created Linear issue";
    }
    if (innerTool.includes("list") || innerTool.includes("search")) {
      return status === "running" ? "Searching Linear…" : "Linear search completed";
    }
    return status === "running" ? "Querying Linear…" : "Linear task completed";
  }

  if (category === "calendar") {
    if (innerTool.includes("create")) {
      return status === "running" ? "Creating calendar event…" : "Created calendar event";
    }
    if (innerTool.includes("update")) {
      return status === "running" ? "Updating calendar event…" : "Updated calendar event";
    }
    if (innerTool.includes("delete")) {
      return status === "running" ? "Deleting calendar event…" : "Deleted calendar event";
    }
    if (innerTool.includes("freebusy") || innerTool.includes("free-busy")) {
      return status === "running" ? "Checking calendar availability…" : "Checked availability";
    }
    if (innerTool.includes("search") || innerTool.includes("list-events")) {
      return status === "running" ? "Searching calendar…" : "Calendar search completed";
    }
    if (innerTool.includes("list-calendars")) {
      return status === "running" ? "Listing calendars…" : "Listed calendars";
    }
    if (innerTool.includes("manage-accounts") || innerTool.includes("auth")) {
      return status === "running" ? "Connecting Google Calendar…" : "Google Calendar connected";
    }
    return status === "running" ? "Querying Google Calendar…" : "Calendar task completed";
  }

  if (category === "whoop") {
    if (innerTool.includes("whoop_today") || innerTool.includes("whoop_day")) {
      return status === "running" ? "Fetching Whoop snapshot…" : "Fetched Whoop snapshot";
    }
    if (innerTool.includes("recovery")) {
      return status === "running" ? "Fetching Whoop recovery…" : "Fetched Whoop recovery";
    }
    if (innerTool.includes("sleep")) {
      return status === "running" ? "Fetching Whoop sleep…" : "Fetched Whoop sleep";
    }
    if (innerTool.includes("strain")) {
      return status === "running" ? "Fetching Whoop strain…" : "Fetched Whoop strain";
    }
    if (innerTool.includes("workout") || innerTool.includes("lift")) {
      return status === "running" ? "Fetching Whoop activity…" : "Fetched Whoop activity";
    }
    if (innerTool.includes("journal")) {
      return status === "running" ? "Fetching Whoop journal…" : "Fetched Whoop journal";
    }
    if (innerTool.includes("coach")) {
      return status === "running" ? "Asking Whoop Coach…" : "Whoop Coach responded";
    }
    return status === "running" ? "Querying Whoop…" : "Whoop task completed";
  }

  if (category === "notes") {
    const inner = workspaceToolName(args);
    if (inner === "count_workspace_files") {
      const folder = argsObj.path;
      return status === "running"
        ? `Counting files in ${folder ?? "workspace"}…`
        : `Counted files in ${folder ?? "workspace"}`;
    }
    if (inner === "list_workspace_entries") {
      const folder = argsObj.path;
      return status === "running"
        ? `Listing ${folder ?? "workspace"}…`
        : `Listed ${folder ?? "workspace"}`;
    }
    if (inner === "read_workspace_file") {
      const file = argsObj.path;
      return status === "running" ? `Reading ${file ?? "file"}…` : `Read ${file ?? "file"}`;
    }
    if (inner === "write_workspace_file") {
      const file = argsObj.path;
      return status === "running" ? `Writing ${file ?? "file"}…` : `Wrote ${file ?? "file"}`;
    }
    if (inner === "append_workspace_file") {
      const file = argsObj.path;
      return status === "running" ? `Updating ${file ?? "file"}…` : `Updated ${file ?? "file"}`;
    }
    if (inner === "today_daily_note") {
      return status === "running" ? "Opening today's daily note…" : "Loaded today's daily note";
    }
    if (inner === "run_workspace_shell") {
      const command = argsObj.command;
      const preview =
        typeof command === "string"
          ? command.length > 48
            ? `${command.slice(0, 48)}…`
            : command
          : "command";
      return status === "running"
        ? `Running shell: ${preview}`
        : `Shell completed: ${preview}`;
    }

    const path = argsObj.path ?? argsObj.file_path ?? argsObj.target_file;
    if (typeof path === "string") {
      const fileName = path.split("/").pop() ?? path;
      if (toolName.toLowerCase().includes("delete")) {
        return status === "running"
          ? `Waiting to delete ${fileName}…`
          : `Deleted ${fileName}`;
      }
      if (toolName.toLowerCase().includes("write") || toolName.toLowerCase().includes("edit")) {
        return status === "running" ? `Editing ${fileName}…` : `Edited ${fileName}`;
      }
      return status === "running" ? `Searching notes for ${fileName}…` : `Found ${fileName}`;
    }
    const query = argsObj.query ?? argsObj.pattern;
    if (typeof query === "string") {
      return status === "running" ? `Searching notes for "${query}"…` : "Search completed";
    }
    return status === "running" ? "Working with notes…" : "Notes task completed";
  }

  return status === "running" ? `Running ${toolName}…` : `${toolName} completed`;
}

export async function enrichToolResult(
  toolName: string,
  result: unknown,
  args?: unknown,
): Promise<StructuredPayload | undefined> {
  const category = categorizeTool(toolName, args);
  if (category === "linear") {
    return enrichLinearResult(result, args, toolName);
  }
  if (category === "calendar") {
    return enrichCalendarResult(result, toolName, args);
  }
  if (category === "whoop") {
    return enrichWhoopResult(result, toolName, args);
  }
  if (category === "notes") {
    return enrichNotesResult(toolName, result);
  }
  return undefined;
}

export { enrichLinearResult, getLinearIssueDisplayId } from "./linear.ts";
export { enrichCalendarResult } from "./calendar.ts";
export { enrichNotesResult } from "./notes.ts";
export { enrichWhoopResult } from "./whoop.ts";
