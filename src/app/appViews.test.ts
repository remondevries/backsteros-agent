import { describe, expect, test } from "bun:test";
import { getAdjacentAppView } from "./appViews";

describe("getAdjacentAppView", () => {
  test("moves through sidebar views and wraps", () => {
    expect(getAdjacentAppView("lookup", "down")).toBe("chat");
    expect(getAdjacentAppView("chat", "down")).toBe("whoop");
    expect(getAdjacentAppView("whoop", "down")).toBe("linear");
    expect(getAdjacentAppView("linear", "down")).toBe("obsidian");
    expect(getAdjacentAppView("obsidian", "down")).toBe("lookup");

    expect(getAdjacentAppView("lookup", "up")).toBe("obsidian");
    expect(getAdjacentAppView("chat", "up")).toBe("lookup");
    expect(getAdjacentAppView("whoop", "up")).toBe("chat");
  });
});
