import type { StructuredPayload } from "../types";
import { EntityListCard } from "../EntityListCard";
import { ToolResultCard } from "../ToolResultCard";

export function renderStructuredPayload(payload: StructuredPayload) {
  return <EntityListCard payload={payload} />;
}

export function renderGenericTool(toolName: string, result?: unknown) {
  return <ToolResultCard toolName={toolName} result={result} />;
}

export const toolRenderers = {
  linear: renderStructuredPayload,
  notes: renderStructuredPayload,
  generic: renderGenericTool,
};
