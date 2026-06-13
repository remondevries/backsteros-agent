import { describe, expect, test } from "bun:test";
import {
  buildVaultFolderNavItems,
  DAILY_WEEK_GROUP_HEADER_PREFIX,
} from "./buildVaultFolderNavItems";
import { contentListGroupHeaderId } from "./contentListNavigation";

describe("buildVaultFolderNavItems", () => {
  test("includes week group headers and toggles collapsed children", () => {
    const toggled: string[] = [];
    const items = buildVaultFolderNavItems({
      activeNavItem: "daily",
      showDailyWeekGroups: true,
      nonFileEntries: [],
      groupedDailyEntries: [
        {
          key: "2026-w24",
          label: "Week 24",
          entries: [
            {
              kind: "file",
              path: "Daily/2026-06-13.md",
              name: "2026-06-13.md",
              date: "2026-06-13",
            },
          ],
        },
        {
          key: "2026-w23",
          label: "Week 23",
          entries: [
            {
              kind: "file",
              path: "Daily/2026-06-06.md",
              name: "2026-06-06.md",
              date: "2026-06-06",
            },
          ],
        },
      ],
      collapsedWeekGroups: new Set(["2026-w23"]),
      filteredEntries: [],
      dailyIssuesByDueDate: {},
      handlers: {
        clearDashboard: () => {},
        openDirectory: () => {},
        openFile: () => {},
        openLinearIssue: () => {},
        toggleWeekGroup: (groupKey) => {
          toggled.push(groupKey);
        },
      },
    });

    expect(items.map((item) => item.id)).toEqual([
      contentListGroupHeaderId(DAILY_WEEK_GROUP_HEADER_PREFIX, "2026-w24"),
      "Daily/2026-06-13.md",
      contentListGroupHeaderId(DAILY_WEEK_GROUP_HEADER_PREFIX, "2026-w23"),
    ]);

    items[0]!.select();
    expect(toggled).toEqual(["2026-w24"]);
  });
});
