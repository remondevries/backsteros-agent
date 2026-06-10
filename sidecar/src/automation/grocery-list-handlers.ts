import {
  addGroceryItemsFromMessage,
  buildGroceryListConfirmationResponse,
  GROCERY_LIST_TEST_MODE_MESSAGE,
  isGroceryListBlockedInTestMode,
  isGroceryListQuickAction,
} from "../grocery-list.ts";
import { normalizeGroceryWeekForAutomation } from "../grocery-linear.ts";
import { getGroceryLinearTracePath, traceGroceryLinear } from "../grocery-linear-trace.ts";
import type { AutomationHandler, AutomationHandlerContext } from "./types.ts";

export async function runGroceryListAutomation(ctx: AutomationHandlerContext): Promise<void> {
  const trimmed = ctx.text.trim();
  if (!trimmed) {
    ctx.completeFailed("Grocery list message is empty");
    return;
  }

  const extractStepId = `grocery-extract-${ctx.runId}`;

  if (isGroceryListBlockedInTestMode()) {
    ctx.logStep(
      extractStepId,
      "generic",
      "Grocery list requires Auto or Max mode",
      "error",
      "grocery_list",
    );
    ctx.setLastAssistantText(GROCERY_LIST_TEST_MODE_MESSAGE);
    ctx.broadcastAssistantMessage(GROCERY_LIST_TEST_MODE_MESSAGE);
    ctx.completeFinished();
    return;
  }

  ctx.logStep(extractStepId, "generic", "Extracting grocery items", "running", "grocery_list");

  try {
    const groceryWeek = normalizeGroceryWeekForAutomation(ctx.groceryWeek);
    const result = await addGroceryItemsFromMessage(trimmed, { groceryWeek });
    ctx.logStep(
      extractStepId,
      "generic",
      result.added.length > 0 ? `Added ${result.added.length} item(s)` : "No new grocery items found",
      "completed",
      "grocery_list",
    );

    if (result.createdIssue) {
      ctx.logStep(
        `grocery-issue-${ctx.runId}`,
        "linear",
        result.issueIdentifier
          ? `Created Linear issue ${result.issueIdentifier}`
          : "Created grocery week issue in Linear",
        "completed",
        "grocery_list",
      );
    } else if (result.added.length > 0) {
      ctx.logStep(
        `grocery-issue-${ctx.runId}`,
        "linear",
        result.issueIdentifier
          ? `Updated Linear issue ${result.issueIdentifier}`
          : "Updated grocery week issue in Linear",
        "completed",
        "grocery_list",
      );
    }

    const response = buildGroceryListConfirmationResponse(
      result.added,
      result.week.week,
      result.week.isCurrentWeek,
      result.issueUrl,
    );
    ctx.setLastAssistantText(response);
    ctx.broadcastAssistantMessage(response);
    ctx.completeFinished();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Grocery list update failed";
    traceGroceryLinear("error", message, { runId: ctx.runId, groceryWeek: ctx.groceryWeek });
    ctx.logStep(extractStepId, "generic", message, "error", "grocery_list");
    ctx.logStep(
      `grocery-trace-${ctx.runId}`,
      "generic",
      `Trace log: ${getGroceryLinearTracePath()}`,
      "completed",
      "grocery_list",
    );
    ctx.completeFailed(message);
  }
}

export const GROCERY_LIST_HANDLER: AutomationHandler = {
  id: "grocery-list",
  matches: (quickActionId) => isGroceryListQuickAction(quickActionId),
  run: runGroceryListAutomation,
};
