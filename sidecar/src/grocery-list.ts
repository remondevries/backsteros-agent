import { addGroceryItemsToLinear, type GroceryLinearItem } from "./grocery-linear.ts";
import { formatGroceryItemLabel } from "./llm-extract/tasks/grocery-items.ts";
import { isTestExecutionMode } from "./execution-mode.ts";
import { buildLinearIssueLinkToken } from "./inline-link-tokens.ts";
import { buildUpdateConfirmationToken } from "./update-confirmation.ts";

export const GROCERY_LIST_QUICK_ACTION_ID = "grocery-list";

export const GROCERY_LIST_TEST_MODE_MESSAGE =
  "Grocery list only runs in Auto or Max mode. Test mode uses local stand-ins, but this flow needs Gemini to read your message and Linear to update your weekly grocery issue. Switch the composer to Auto or Max in Settings, then try again.";

export function isGroceryListBlockedInTestMode(): boolean {
  return isTestExecutionMode();
}

function formatAddedItemSummary(added: GroceryLinearItem[]): string {
  const labels = added.map((item) => formatGroceryItemLabel(item));
  if (labels.length === 0) return "";
  if (labels.length === 1) return labels[0]!;
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels.at(-1)}`;
}

export async function addGroceryItemsFromMessage(
  message: string,
  options: { groceryWeek?: string; now?: Date } = {},
) {
  return addGroceryItemsToLinear(message, {
    groceryWeek: options.groceryWeek,
    now: options.now,
  });
}

export function buildGroceryListConfirmationResponse(
  added: GroceryLinearItem[],
  week: number,
  isCurrentWeek: boolean,
  issueUrl?: string,
): string {
  if (added.length === 0) {
    return "I couldn't find any grocery items in that message.";
  }

  const summary = formatAddedItemSummary(added);
  const weekPhrase = isCurrentWeek ? "this week" : `week ${week}`;
  const linkToken = issueUrl?.trim()
    ? buildLinearIssueLinkToken("view grocery list", issueUrl)
    : "";
  const message = linkToken
    ? `I have added ${summary} to your grocery list of ${weekPhrase}.\n${linkToken}`
    : `I have added ${summary} to your grocery list of ${weekPhrase}.`;

  return buildUpdateConfirmationToken(summary, `grocery list of ${weekPhrase}`, message);
}

export function isGroceryListQuickAction(quickActionId?: string): boolean {
  return quickActionId === GROCERY_LIST_QUICK_ACTION_ID;
}
