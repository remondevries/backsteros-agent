import { describe, expect, test } from "bun:test";
import {
  buildVaultFolderNavItems,
  DAILY_MONTH_GROUP_HEADER_PREFIX,
} from "./buildVaultFolderNavItems";
import { contentListGroupHeaderId } from "./contentListNavigation";

describe("buildVaultFolderNavItems", () => {
  test("includes month group headers and toggles collapsed children", () => {
    const toggled: string[] = [];
    const items = buildVaultFolderNavItems({
      activeNavItem: "daily",
      showDailyMonthGroups: true,
      nonFileEntries: [],
      groupedDailyEntries: [
        {
          key: "2026-06",
          label: "June 2026",
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
          key: "2026-05",
          label: "May 2026",
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
      collapsedMonthGroups: new Set(["2026-05"]),
      filteredEntries: [],
      dailyIssuesByDueDate: {},
      handlers: {
        clearDashboard: () => {},
        openDirectory: () => {},
        openFile: () => {},
        openLinearIssue: () => {},
        toggleMonthGroup: (groupKey) => {
          toggled.push(groupKey);
        },
      },
    });

    expect(items.map((item) => item.id)).toEqual([
      contentListGroupHeaderId(DAILY_MONTH_GROUP_HEADER_PREFIX, "2026-06"),
      "Daily/2026-06-13.md",
      contentListGroupHeaderId(DAILY_MONTH_GROUP_HEADER_PREFIX, "2026-05"),
    ]);

    items[0]!.select();
    expect(toggled).toEqual(["2026-06"]);
  });
});
