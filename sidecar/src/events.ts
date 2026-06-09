import { categorizeTool, enrichToolResult, getToolLabel } from "./enrichers/index.ts";
import type { AgentEvent, ToolCategory } from "./types.ts";
import type { SDKMessage } from "@cursor/sdk";

function workspaceToolName(args?: unknown): string | undefined {
  const root = args && typeof args === "object" ? (args as Record<string, unknown>) : {};
  const nested =
    root.args && typeof root.args === "object" ? (root.args as Record<string, unknown>) : {};
  const combined = { ...nested, ...root };
  return typeof combined.toolName === "string" ? combined.toolName : undefined;
}

interface RunState {
  runId: string;
  startedAt: number;
  lastAssistantText: string;
  toolCalls: Map<
    string,
    { name: string; category: ToolCategory; startedAt: number; label: string }
  >;
}

export function createRunState(runId: string): RunState {
  return {
    runId,
    startedAt: Date.now(),
    lastAssistantText: "",
    toolCalls: new Map(),
  };
}

export async function mapSdkMessageToEvents(
  message: SDKMessage,
  state: RunState,
): Promise<AgentEvent[]> {
  const events: AgentEvent[] = [];
  const runId = state.runId;

  switch (message.type) {
    case "assistant": {
      const text = message.message.content
        .filter((block): block is { type: "text"; text: string } => block.type === "text")
        .map((block) => block.text)
        .join("");

      if (text) {
        if (text.startsWith(state.lastAssistantText)) {
          const delta = text.slice(state.lastAssistantText.length);
          state.lastAssistantText = text;
          if (delta) {
            events.push({ type: "message.delta", runId, text: delta });
          }
        } else {
          state.lastAssistantText += text;
          events.push({ type: "message.delta", runId, text });
        }
      }

      for (const block of message.message.content) {
        if (block.type === "tool_use") {
          const category = categorizeTool(block.name, block.input);
          const label = getToolLabel(block.name, "running", block.input);
          state.toolCalls.set(block.id, {
            name: block.name,
            category,
            startedAt: Date.now(),
            label,
          });
          events.push({
            type: "tool.started",
            runId,
            toolCallId: block.id,
            toolName: block.name,
            category,
            label,
          });
          events.push({
            type: "activity.step",
            runId,
            stepId: block.id,
            kind: category,
            label,
            status: "running",
            toolName: block.name,
          });
        }
      }
      break;
    }
    case "tool_call": {
      const existing = state.toolCalls.get(message.call_id);
      const category = existing?.category ?? categorizeTool(message.name, message.args);
      const label = getToolLabel(message.name, message.status, message.args);

      if (message.status === "running") {
        events.push({
          type: "tool.updated",
          runId,
          toolCallId: message.call_id,
          args: message.args,
          label,
        });
        if (!existing) {
          state.toolCalls.set(message.call_id, {
            name: message.name,
            category,
            startedAt: Date.now(),
            label,
          });
          events.push({
            type: "tool.started",
            runId,
            toolCallId: message.call_id,
            toolName: message.name,
            category,
            label,
          });
        }
      }

      if (message.status === "completed" || message.status === "error") {
        const startedAt = existing?.startedAt ?? Date.now();
        const durationMs = Date.now() - startedAt;
        const structured = await enrichToolResult(message.name, message.result, message.args);
        events.push({
          type: "tool.completed",
          runId,
          toolCallId: message.call_id,
          toolName: message.name,
          category,
          result: message.result,
          structured,
        });
        events.push({
          type: "activity.step",
          runId,
          stepId: message.call_id,
          kind: category,
          label,
          status: message.status === "completed" ? "completed" : "error",
          toolName: message.name,
          durationMs,
        });

        if (structured?.type === "linear_issues") {
          events.push({
            type: "entities.created",
            runId,
            entityType: "linear_issue",
            items: structured.items,
          });
        }

        if (structured?.type === "markdown_files") {
          events.push({
            type: "entities.updated",
            runId,
            entityType: "markdown_file",
            items: structured.items,
          });
        }

        if (structured?.type === "calendar_events") {
          events.push({
            type: "entities.created",
            runId,
            entityType: "calendar_event",
            items: structured.items,
          });
        }

        if (structured?.type === "whoop_snapshots") {
          events.push({
            type: "entities.created",
            runId,
            entityType: "whoop_snapshot",
            items: structured.items,
          });
        }
      }
      break;
    }
    case "thinking": {
      if (message.text) {
        events.push({
          type: "activity.step",
          runId,
          stepId: `thinking-${Date.now()}`,
          kind: "generic",
          label: message.text.slice(0, 120),
          status: "running",
        });
      }
      break;
    }
    default:
      break;
  }

  return events;
}

export function createRunLifecycleEvents(
  runId: string,
  state: RunState,
  status: "finished" | "error" | "cancelled",
): AgentEvent[] {
  const durationMs = Date.now() - state.startedAt;
  return [
    { type: "activity.completed", runId, durationMs },
    { type: "run.completed", runId, status, durationMs },
  ];
}
