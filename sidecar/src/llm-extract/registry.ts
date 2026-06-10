import {
  GROCERY_ITEMS_EXTRACT_TASK,
  type GroceryItemsExtractOutput,
} from "./tasks/grocery-items.ts";
import type { LlmExtractTaskDefinition, LlmExtractTaskId } from "./types.ts";

const TASKS: LlmExtractTaskDefinition<unknown>[] = [
  GROCERY_ITEMS_EXTRACT_TASK,
];

export function listLlmExtractTasks(): Array<{ id: LlmExtractTaskId; description: string }> {
  return TASKS.map((task) => ({ id: task.id, description: task.description }));
}

export function getLlmExtractTask(taskId: string): LlmExtractTaskDefinition<unknown> | undefined {
  return TASKS.find((task) => task.id === taskId);
}

export type { GroceryItemsExtractOutput };
