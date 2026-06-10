import { describe, expect, test } from "bun:test";
import {
  buildUpdateConfirmationToken,
  formatUpdateConfirmationMessage,
  parseUpdateConfirmationToken,
} from "./updateConfirmation";

describe("updateConfirmation", () => {
  test("formats the standard update message", () => {
    expect(formatUpdateConfirmationMessage({ what: "update", where: "daily note" })).toBe(
      "I've updated for you the update in daily note.",
    );
    expect(formatUpdateConfirmationMessage({ what: "issue status", where: "Linear" })).toBe(
      "I've updated for you the issue status in Linear.",
    );
  });

  test("builds and parses update tokens", () => {
    const token = buildUpdateConfirmationToken("issue status", "Linear");
    expect(token).toBe("{{update:issue status|Linear}}");
    expect(parseUpdateConfirmationToken(token)).toEqual({
      what: "issue status",
      where: "Linear",
    });
  });

  test("returns null for non-update text", () => {
    expect(parseUpdateConfirmationToken("Hello there.")).toBeNull();
  });

  test("parses multiline grocery confirmation with nested inline link token", () => {
    const token =
      "{{update:Chicken|grocery list of this week|I have added Chicken to your grocery list of this week.\n{{linear-issue-link:view_grocery_list|https://linear.app/family/issue/FAM-118}}}}";
    expect(parseUpdateConfirmationToken(token)).toEqual({
      what: "Chicken",
      where: "grocery list of this week",
      message:
        "I have added Chicken to your grocery list of this week.\n{{linear-issue-link:view_grocery_list|https://linear.app/family/issue/FAM-118}}",
    });
  });
});
