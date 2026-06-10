import {
  GOOD_MORNING_FEEL_HANDLER,
  GOOD_MORNING_INITIAL_HANDLER,
} from "./good-morning-handlers.ts";
import { DAILY_CAPTURE_HANDLER } from "./daily-capture-handlers.ts";
import {
  GOOD_NIGHT_INITIAL_HANDLER,
  GOOD_NIGHT_REFLECTION_HANDLER,
} from "./good-night-handlers.ts";
import { GROCERY_LIST_HANDLER } from "./grocery-list-handlers.ts";
import type { AutomationHandler, AutomationHandlerContext } from "./types.ts";

export const AUTOMATION_HANDLERS: AutomationHandler[] = [
  GOOD_MORNING_INITIAL_HANDLER,
  GOOD_MORNING_FEEL_HANDLER,
  GOOD_NIGHT_INITIAL_HANDLER,
  GOOD_NIGHT_REFLECTION_HANDLER,
  DAILY_CAPTURE_HANDLER,
  GROCERY_LIST_HANDLER,
];

export function findAutomationHandler(quickActionId?: string): AutomationHandler | undefined {
  if (!quickActionId) return undefined;
  return AUTOMATION_HANDLERS.find((handler) => handler.matches(quickActionId));
}

export async function dispatchAutomationHandler(
  quickActionId: string | undefined,
  ctx: AutomationHandlerContext,
): Promise<boolean> {
  const handler = findAutomationHandler(quickActionId);
  if (!handler) return false;
  await handler.run(ctx);
  return true;
}
