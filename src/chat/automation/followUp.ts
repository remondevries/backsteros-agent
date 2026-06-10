import type { ChatMessage } from "../types";
import type { AutomationFlowVariant } from "./types";

export function createFlowAssistantMessage({
  text,
  flowVariant,
  flowRunId,
  presentation,
}: {
  text: string;
  flowVariant: AutomationFlowVariant;
  flowRunId?: string;
  presentation?: "backster";
}): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role: "assistant",
    text,
    flowVariant,
    flowRunId,
    presentation,
    createdAt: Date.now(),
  };
}

export function shouldScheduleFlowFollowUp({
  messages,
  runId,
  pacingKey,
  enqueuedKeys,
  hasPromptForRun,
}: {
  messages: Array<Pick<ChatMessage, "role" | "flowVariant" | "text" | "flowRunId">>;
  runId: string;
  pacingKey: string;
  enqueuedKeys: Set<string>;
  hasPromptForRun: (
    messages: Array<Pick<ChatMessage, "role" | "flowVariant" | "text" | "flowRunId">>,
    runId: string,
  ) => boolean;
}): boolean {
  if (hasPromptForRun(messages, runId)) return false;
  if (enqueuedKeys.has(pacingKey)) return false;
  return true;
}

export function markFlowFollowUpEnqueued(enqueuedKeys: Set<string>, pacingKey: string): void {
  enqueuedKeys.add(pacingKey);
}

export function scheduleFlowFollowUp({
  enqueueReveal,
  pacingKey,
  onReveal,
}: {
  enqueueReveal: (reveal: () => void, id?: string) => void;
  pacingKey: string;
  onReveal: () => void;
}): void {
  enqueueReveal(onReveal, pacingKey);
}