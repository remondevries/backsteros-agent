export const GROCERY_LIST_ACTION_ID = "grocery-list";

export const GROCERY_LIST_LABEL = "Grocery list";

export const GROCERY_LIST_MESSAGE_LABEL = "Grocery";


export function isGroceryListMessage(quickActionId?: string): boolean {
  return quickActionId === GROCERY_LIST_ACTION_ID;
}

export function isGroceryListComposerMode(composerQuickActionId?: string | null): boolean {
  return composerQuickActionId === GROCERY_LIST_ACTION_ID;
}

export function isGroceryListFlowMessage(quickActionId?: string): boolean {
  return isGroceryListMessage(quickActionId);
}

export function parseGroceryShortcut(
  text: string,
): { kind: "activate" } | { kind: "send"; body: string } | null {
  const trimmed = text.trim();
  if (!/^\/(?:gr|grocery)(?:\s|$)/i.test(trimmed)) return null;

  const body = trimmed
    .replace(/^\/grocery\s*/i, "")
    .replace(/^\/gr\s*/i, "")
    .trim();
  if (!body) return { kind: "activate" };
  return { kind: "send", body };
}
