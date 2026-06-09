import { describe, expect, test } from "bun:test";
import {
  filterOpenLinearIssues,
  isCompletedLinearIssue,
} from "./linear.ts";
import type { LinearIssueEntity } from "../types.ts";

function issue(partial: Partial<LinearIssueEntity>): LinearIssueEntity {
  return {
    id: partial.id ?? "BAC-1",
    title: partial.title ?? "Test issue",
    ...partial,
  };
}

describe("isCompletedLinearIssue", () => {
  test("detects completed state types", () => {
    expect(isCompletedLinearIssue(issue({ stateType: "completed" }))).toBe(true);
    expect(isCompletedLinearIssue(issue({ stateType: "canceled" }))).toBe(true);
  });

  test("detects done/completed status names", () => {
    expect(isCompletedLinearIssue(issue({ status: "Done" }))).toBe(true);
    expect(isCompletedLinearIssue(issue({ status: "Completed" }))).toBe(true);
    expect(isCompletedLinearIssue(issue({ status: "In Progress" }))).toBe(false);
  });

  test("does not treat active workflow statuses as completed", () => {
    expect(isCompletedLinearIssue(issue({ status: "QA Done", stateType: "started" }))).toBe(
      false,
    );
    expect(
      isCompletedLinearIssue(issue({ status: "Review Complete", stateType: "started" })),
    ).toBe(false);
  });
});

describe("filterOpenLinearIssues", () => {
  test("removes completed issues from multi-issue lists", () => {
    const filtered = filterOpenLinearIssues([
      issue({ id: "BAC-1", status: "In Progress" }),
      issue({ id: "BAC-2", status: "Done" }),
      issue({ id: "BAC-3", status: "Completed" }),
    ]);

    expect(filtered.map((item) => item.id)).toEqual(["BAC-1"]);
  });

  test("keeps a single issue even when completed", () => {
    const filtered = filterOpenLinearIssues([issue({ id: "BAC-9", status: "Done" })]);
    expect(filtered).toHaveLength(1);
  });
});
