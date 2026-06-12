import { describe, expect, test } from "bun:test";
import {
  buildLinearEstimateDropdownOptions,
  buildLinearEstimateScaleValues,
  buildLinearPriorityDropdownOptions,
  isLinearNoEstimateValue,
  linearEstimateDropdownValue,
  linearEstimateLabelFromValue,
  linearPriorityDropdownValue,
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
});
