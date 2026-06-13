import { describe, expect, test } from "bun:test";
import { buildStatusGroupedNavItems } from "./buildStatusGroupedNavItems";
import { contentListGroupHeaderId } from "./contentListNavigation";

describe("buildStatusGroupedNavItems", () => {
  test("includes group headers and omits collapsed children", () => {
    const toggled: string[] = [];
    const items = buildStatusGroupedNavItems({
      groups: [
        { key: "done", items: [{ id: "issue-1" }, { id: "issue-2" }] },
        { key: "todo", items: [{ id: "issue-3" }] },
      ],
      collapsedGroups: new Set(["done"]),
      groupHeaderIdPrefix: "project-issues-group",
      onToggleGroup: (groupKey) => {
        toggled.push(groupKey);
      },
      onSelect: () => {},
    });

    expect(items.map((item) => item.id)).toEqual([
      contentListGroupHeaderId("project-issues-group", "done"),
      contentListGroupHeaderId("project-issues-group", "todo"),
      "issue-3",
    ]);

    items[0]!.select();
    expect(toggled).toEqual(["done"]);
  });
});
