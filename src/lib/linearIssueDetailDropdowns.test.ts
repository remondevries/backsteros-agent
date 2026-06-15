import { describe, expect, test } from "bun:test";
import {
  buildLinearAssigneeDropdownOptions,
  buildLinearDueDateDropdownOptions,
  buildLinearEstimateDropdownOptions,
  buildLinearEstimateScaleValues,
  buildLinearPriorityDropdownOptions,
  DEFAULT_LINEAR_TEAM_ESTIMATION_SETTINGS,
  isLinearNoEstimateValue,
  isLinearPickDueDateValue,
  LINEAR_NO_DUE_DATE_VALUE,
  LINEAR_PICK_DUE_DATE_VALUE,
  linearAssigneeDropdownValue,
  linearAssigneeIdFromDropdownValue,
  linearDueDateDropdownValue,
  linearDueDateFromDropdownValue,
  linearEstimateDropdownValue,
  linearEstimateLabelFromValue,
  linearPriorityDropdownValue,
  resolveLinearTeamEstimationSettings,
} from "./linearIssueDetailDropdowns";

describe("linearIssueDetailDropdowns", () => {
  test("builds priority options for all Linear priority levels", () => {
    expect(buildLinearPriorityDropdownOptions()).toHaveLength(5);
    expect(buildLinearPriorityDropdownOptions()[2]).toMatchObject({
      value: "2",
      label: "High",
      shortcut: "3",
    });
  });

  test("maps priority numbers to dropdown values", () => {
    expect(linearPriorityDropdownValue(3)).toBe("3");
    expect(linearPriorityDropdownValue(null)).toBe("0");
  });

  test("builds estimate scale from no estimate through 5 points", () => {
    expect(
      buildLinearEstimateScaleValues({
        issueEstimationType: "fibonacci",
        issueEstimationAllowZero: false,
        issueEstimationExtended: true,
      }),
    ).toEqual([0, 1, 2, 3, 4, 5]);
  });

  test("starts estimate dropdown with no estimate", () => {
    const options = buildLinearEstimateDropdownOptions({
      issueEstimationType: "linear",
      issueEstimationAllowZero: false,
      issueEstimationExtended: false,
    });

    expect(options).toHaveLength(6);
    expect(options[0]).toMatchObject({
      value: "0",
      label: "No estimate",
      shortcut: "1",
    });
    expect(options[5]).toMatchObject({
      value: "5",
      label: "5 Points",
      shortcut: "6",
    });
  });

  test("returns no estimate options when estimation is disabled", () => {
    expect(
      buildLinearEstimateDropdownOptions({
        issueEstimationType: "notUsed",
        issueEstimationAllowZero: false,
        issueEstimationExtended: false,
      }),
    ).toEqual([]);
  });

  test("uses default estimation settings when team settings are missing", () => {
    expect(
      resolveLinearTeamEstimationSettings(null, { allowDefaultWhenMissing: true }),
    ).toEqual(DEFAULT_LINEAR_TEAM_ESTIMATION_SETTINGS);
    expect(
      buildLinearEstimateDropdownOptions(
        resolveLinearTeamEstimationSettings(null, { allowDefaultWhenMissing: true }),
      ),
    ).toHaveLength(6);
  });

  test("does not default estimation settings when disabled on team", () => {
    expect(
      resolveLinearTeamEstimationSettings(
        {
          issueEstimationType: "notUsed",
          issueEstimationAllowZero: false,
          issueEstimationExtended: false,
        },
        { allowDefaultWhenMissing: true },
      ),
    ).toBeNull();
  });

  test("defaults unset estimates to no estimate", () => {
    expect(
      linearEstimateDropdownValue(null, {
        issueEstimationType: "fibonacci",
        issueEstimationAllowZero: false,
        issueEstimationExtended: false,
      }),
    ).toBe("0");
  });

  test("caps estimates above 5 at 5 points", () => {
    expect(
      linearEstimateDropdownValue(8, {
        issueEstimationType: "fibonacci",
        issueEstimationAllowZero: false,
        issueEstimationExtended: true,
      }),
    ).toBe("5");
  });

  test("labels no estimate values", () => {
    expect(
      linearEstimateLabelFromValue("0", {
        issueEstimationType: "fibonacci",
        issueEstimationAllowZero: true,
        issueEstimationExtended: false,
      }),
    ).toBe("No estimate");
    expect(isLinearNoEstimateValue("0")).toBe(true);
    expect(isLinearNoEstimateValue("3")).toBe(false);
  });

  test("builds assignee options with unassigned first", () => {
    const options = buildLinearAssigneeDropdownOptions([
      { id: "user-2", name: "Sam", username: "sam", avatarUrl: null },
      { id: "user-1", name: "Alex", username: "alex", avatarUrl: null },
    ]);

    expect(options[0]).toMatchObject({ value: "__none__", label: "No assignee" });
    expect(options[1]).toMatchObject({ value: "user-1", label: "alex" });
    expect(linearAssigneeDropdownValue("user-1")).toBe("user-1");
    expect(linearAssigneeIdFromDropdownValue("__none__")).toBeNull();
  });

  test("builds due date options with presets and clear action", () => {
    const now = new Date(2026, 5, 13);
    const options = buildLinearDueDateDropdownOptions(null, now);

    expect(options[0]).toMatchObject({ value: "2026-06-13", label: "Today" });
    expect(options[1]).toMatchObject({ value: "2026-06-14", label: "Tomorrow" });
    expect(options.at(-2)).toMatchObject({ value: LINEAR_PICK_DUE_DATE_VALUE, label: "Pick a date…" });
    expect(options.at(-1)).toMatchObject({ value: LINEAR_NO_DUE_DATE_VALUE, label: "No due date" });
  });

  test("includes current due date when it is not a preset", () => {
    const options = buildLinearDueDateDropdownOptions("2026-12-25", new Date(2026, 5, 13));
    expect(options[0]).toMatchObject({ value: "2026-12-25" });
  });

  test("maps due date dropdown values", () => {
    expect(linearDueDateDropdownValue(null)).toBe(LINEAR_NO_DUE_DATE_VALUE);
    expect(linearDueDateDropdownValue("2026-06-13")).toBe("2026-06-13");
    expect(linearDueDateFromDropdownValue(LINEAR_NO_DUE_DATE_VALUE)).toBeNull();
    expect(linearDueDateFromDropdownValue("2026-06-13")).toBe("2026-06-13");
    expect(isLinearPickDueDateValue(LINEAR_PICK_DUE_DATE_VALUE)).toBe(true);
  });
});
