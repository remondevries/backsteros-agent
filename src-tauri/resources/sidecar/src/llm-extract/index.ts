import { isTestExecutionMode } from "../execution-mode.ts";
import { callGeminiJsonExtract } from "./gemini-client.ts";
import { getLlmExtractTask, listLlmExtractTasks } from "./registry.ts";
import type { LlmExtractTaskId, RunLlmExtractOptions } from "./types.ts";
import { LlmExtractError } from "./types.ts";

export { LlmExtractError, listLlmExtractTasks };
export type { LlmExtractTaskId, RunLlmExtractOptions };
export type { GroceryItemsExtractOutput, GroceryItemExtract } from "./tasks/grocery-items.ts";

export async function runLlmExtract<TOutput>(
  taskId: LlmExtractTaskId,
  message: string,
  options: RunLlmExtractOptions = {},
): Promise<TOutput> {
  const trimmed = message.trim();
  if (!trimmed) {
    throw new LlmExtractError(taskId, "Message is empty");
  }

  const task = getLlmExtractTask(taskId);
  if (!task) {
    throw new LlmExtractError(taskId, `Unknown extraction task: ${taskId}`, { isRetryable: false });
  }

  if (isTestExecutionMode() && task.heuristicExtract) {
    return task.heuristicExtract(trimmed, options.context) as TOutput;
  }

  try {
    const raw = await callGeminiJsonExtract(
      task.systemInstruction,
      task.buildUserPrompt(trimmed, options.context),
      { signal: options.signal },
    );
    return task.parseOutput(raw) as TOutput;
  } catch (error) {
    if (task.heuristicExtract && error instanceof LlmExtractError && error.isRetryable) {
      return task.heuristicExtract(trimmed, options.context) as TOutput;
    }
    if (error instanceof LlmExtractError) {
      throw new LlmExtractError(taskId, error.message, { isRetryable: error.isRetryable });
    }
    const messageText = error instanceof Error ? error.message : "Extraction failed";
    throw new LlmExtractError(taskId, messageText, { isRetryable: true });
  }
}
