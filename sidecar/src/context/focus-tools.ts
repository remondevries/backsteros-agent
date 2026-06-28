import type { FocusContextInput } from "./focus.ts";
import type { ToolSelection } from "../tool-routing.ts";

/** Whether Linear MCP should be attached for this focus (document body is injected separately). */
export function focusContextUsesLinearMcp(input: FocusContextInput): boolean {
  if (input.kind === "linear_workspace") {
    return true;
  }
  if (input.kind === "linear_document") {
    return false;
  }
  if (input.kind === "linear_issue") {
    return input.description === undefined;
  }
  return false;
}

export function toolSelectionForFocusContext(input: FocusContextInput): ToolSelection {
  return {
    obsidian: input.kind === "vault_document" || input.kind === "vault_folder",
    linear: focusContextUsesLinearMcp(input),
    calendar: false,
    whoop: false,
  };
}
