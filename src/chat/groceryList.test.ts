import { describe, expect, test } from "bun:test";
import {
  GROCERY_LIST_ACTION_ID,
  GROCERY_LIST_MESSAGE_LABEL,
  isGroceryListComposerMode,
  isGroceryListMessage,
  parseGroceryShortcut,
} from "./groceryList";

describe("groceryList", () => {
  test("parseGroceryShortcut handles activate and send", () => {
    expect(parseGroceryShortcut("/gr")).toEqual({ kind: "activate" });
    expect(parseGroceryShortcut("/gr ")).toEqual({ kind: "activate" });
    expect(parseGroceryShortcut("/grocery")).toEqual({ kind: "activate" });
    expect(parseGroceryShortcut("/gr milk, eggs and bread")).toEqual({
      kind: "send",
      body: "milk, eggs and bread",
    });
    expect(parseGroceryShortcut("/grocery oat milk")).toEqual({
      kind: "send",
      body: "oat milk",
    });
    expect(parseGroceryShortcut("plain text")).toBeNull();
  });

  test("recognizes grocery list quick action", () => {
    expect(isGroceryListMessage(GROCERY_LIST_ACTION_ID)).toBe(true);
    expect(isGroceryListMessage("daily-capture")).toBe(false);
    expect(isGroceryListComposerMode(GROCERY_LIST_ACTION_ID)).toBe(true);
    expect(isGroceryListComposerMode(null)).toBe(false);
    expect(GROCERY_LIST_MESSAGE_LABEL).toBe("Grocery");
  });
});
