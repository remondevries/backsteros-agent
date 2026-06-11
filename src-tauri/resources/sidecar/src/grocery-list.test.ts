import { describe, expect, test } from "bun:test";
import {
  buildGroceryListConfirmationResponse,
  GROCERY_LIST_TEST_MODE_MESSAGE,
  isGroceryListBlockedInTestMode,
  isGroceryListQuickAction,
} from "./grocery-list.ts";

describe("grocery-list", () => {
  test("blocks grocery list in test execution mode", () => {
    const previous = process.env.BACKSTER_EXECUTION_MODE;
    process.env.BACKSTER_EXECUTION_MODE = "test";
    try {
      expect(isGroceryListBlockedInTestMode()).toBe(true);
      expect(GROCERY_LIST_TEST_MODE_MESSAGE).toContain("Auto or Max");
      expect(GROCERY_LIST_TEST_MODE_MESSAGE).toContain("Gemini");
      expect(GROCERY_LIST_TEST_MODE_MESSAGE).toContain("Linear");
    } finally {
      if (previous == null) {
        delete process.env.BACKSTER_EXECUTION_MODE;
      } else {
        process.env.BACKSTER_EXECUTION_MODE = previous;
      }
    }
  });

  test("recognizes grocery list quick action", () => {
    expect(isGroceryListQuickAction("grocery-list")).toBe(true);
    expect(isGroceryListQuickAction("daily-capture")).toBe(false);
  });

  test("builds confirmation response for current week", () => {
    const response = buildGroceryListConfirmationResponse(
      [
        { name: "Milk", quantity: "2" },
        { name: "Apples" },
      ],
      25,
      true,
    );
    expect(response).toContain("{{update:");
    expect(response).toContain("I have added 2x Milk and Apples to your grocery list of this week.");
  });

  test("appends a Linear issue link tag when issueUrl is provided", () => {
    const response = buildGroceryListConfirmationResponse(
      [{ name: "Coffee" }],
      25,
      true,
      "https://linear.app/family/issue/FAM-118/week-24",
    );
    expect(response).toContain(
      "I have added Coffee to your grocery list of this week.\n{{linear-issue-link:view_grocery_list|https://linear.app/family/issue/FAM-118/week-24}}",
    );
  });

  test("confirmation uses items from the current message, not merged Linear totals", () => {
    const response = buildGroceryListConfirmationResponse([{ name: "Coffee" }], 25, true);
    expect(response).toContain("I have added Coffee to your grocery list of this week.");
    expect(response).not.toContain("2x Coffee");
  });

  test("builds confirmation response for another week", () => {
    const response = buildGroceryListConfirmationResponse([{ name: "Bread" }], 30, false);
    expect(response).toContain("I have added Bread to your grocery list of week 30.");
  });

  test("returns empty-state confirmation when nothing was added", () => {
    expect(buildGroceryListConfirmationResponse([], 25, true)).toBe(
      "I couldn't find any grocery items in that message.",
    );
  });
});
