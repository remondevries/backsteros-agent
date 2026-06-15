import { describe, expect, test } from "bun:test";
import {
  linearProjectsToDropdownOptions,
  resolveOrganizationFilteredProjectOptions,
} from "./linearOrganizationProjectDropdown";

describe("resolveOrganizationFilteredProjectOptions", () => {
  const all = [
    { value: "p1", label: "Alpha" },
    { value: "p2", label: "Beta" },
  ];
  const teamOnly = [{ value: "p1", label: "Alpha" }];

  test("returns all projects when no organization is selected", () => {
    expect(
      resolveOrganizationFilteredProjectOptions(all, teamOnly, null, null),
    ).toEqual(all);
  });

  test("returns all projects while team projects are still loading", () => {
    expect(
      resolveOrganizationFilteredProjectOptions(all, teamOnly, "team-a", null),
    ).toEqual(all);
  });

  test("returns filtered team projects when organization is selected and loaded", () => {
    expect(
      resolveOrganizationFilteredProjectOptions(all, teamOnly, "team-a", "team-a"),
    ).toEqual(teamOnly);
  });
});

describe("linearProjectsToDropdownOptions", () => {
  test("maps projects to dropdown options with shortcuts", () => {
    const options = linearProjectsToDropdownOptions(
      [
        { id: "p1", name: "One" },
        { id: "p2", name: "Two" },
      ],
      () => null,
      1,
    );
    expect(options).toHaveLength(2);
    expect(options[0]?.value).toBe("p1");
    expect(options[0]?.shortcut).toBe("2");
  });
});
