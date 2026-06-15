import { describe, expect, test } from "vitest";
import {
  computeLinearProjectStatusFillRatio,
  computeLinearProjectStatusIconModel,
  describeLinearProjectCompletedCheckTransform,
  describeLinearProjectStatusHexagonPath,
  describeLinearProjectStatusPieWedge,
  LINEAR_PROJECT_COMPLETED_CHECK_PATH,
} from "./linearProjectStatusIcon";
import { sortLinearWorkflowStates } from "./linearStatusIcon";

const projectStatuses = sortLinearWorkflowStates([
  { id: "backlog", name: "Backlog", type: "backlog", position: 0 },
  { id: "planned", name: "Planned", type: "planned", position: 1 },
  { id: "active", name: "In Progress", type: "started", position: 2 },
  { id: "done", name: "Completed", type: "completed", position: 3 },
]);

const lightScheme = { colorScheme: "light" as const };

describe("computeLinearProjectStatusIconModel", () => {
  test("fills planned and in-progress icons across planned, started, and completed", () => {
    expect(
      computeLinearProjectStatusIconModel({
        stateId: "planned",
        projectStatuses,
        ...lightScheme,
      }),
    ).toEqual({
      kind: "hexagon",
      color: "oklch(0.831 0.170 85.0)",
      fillRatio: 0,
    });

    expect(
      computeLinearProjectStatusIconModel({
        stateId: "active",
        projectStatuses,
        ...lightScheme,
      }),
    ).toEqual({
      kind: "hexagon",
      color: "oklch(0.831 0.170 85.0)",
      fillRatio: 0.5,
    });
  });

  test("leaves backlog icons empty", () => {
    expect(
      computeLinearProjectStatusIconModel({
        stateId: "backlog",
        projectStatuses,
        ...lightScheme,
      }),
    ).toEqual({
      kind: "hexagon",
      color: "oklch(0.813 0.010 258.3)",
      fillRatio: 0,
    });
  });

  test("uses completed hex icon for completed projects", () => {
    expect(
      computeLinearProjectStatusIconModel({
        stateId: "done",
        projectStatuses,
        ...lightScheme,
      }),
    ).toEqual({
      kind: "completed",
      color: "oklch(0.571 0.170 274.4)",
    });
  });

  test("leaves wedge icons empty when fill statuses are unavailable", () => {
    expect(
      computeLinearProjectStatusIconModel({
        status: "In Progress",
        stateType: "started",
        ...lightScheme,
      }),
    ).toEqual({
      kind: "hexagon",
      color: "oklch(0.831 0.170 85.0)",
      fillRatio: 0,
    });
  });
});

describe("computeLinearProjectStatusFillRatio", () => {
  test("returns zero for backlog and canceled statuses", () => {
    expect(
      computeLinearProjectStatusFillRatio(
        projectStatuses,
        projectStatuses.find((status) => status.id === "backlog")!,
      ),
    ).toBe(0);
  });

  test("interpolates across planned, started, and completed positions", () => {
    expect(
      computeLinearProjectStatusFillRatio(
        projectStatuses,
        projectStatuses.find((status) => status.id === "planned")!,
      ),
    ).toBe(0);
    expect(
      computeLinearProjectStatusFillRatio(
        projectStatuses,
        projectStatuses.find((status) => status.id === "active")!,
      ),
    ).toBe(0.5);
    expect(
      computeLinearProjectStatusFillRatio(
        projectStatuses,
        projectStatuses.find((status) => status.id === "done")!,
      ),
    ).toBe(1);
  });

  test("interpolates within a type when multiple statuses share it", () => {
    const workspaceStatuses = sortLinearWorkflowStates([
      { id: "planned-a", name: "Planned", type: "planned", position: 1 },
      { id: "planned-b", name: "Ready", type: "planned", position: 2 },
      { id: "active", name: "In Progress", type: "started", position: 3 },
      { id: "done", name: "Completed", type: "completed", position: 4 },
    ]);

    expect(
      computeLinearProjectStatusFillRatio(
        workspaceStatuses,
        workspaceStatuses.find((status) => status.id === "planned-a")!,
      ),
    ).toBe(0);
    expect(
      computeLinearProjectStatusFillRatio(
        workspaceStatuses,
        workspaceStatuses.find((status) => status.id === "planned-b")!,
      ),
    ).toBeCloseTo(0.495, 2);
    expect(
      computeLinearProjectStatusFillRatio(
        workspaceStatuses,
        workspaceStatuses.find((status) => status.id === "active")!,
      ),
    ).toBe(0.5);
  });

  test("uses only the passed workspace statuses for the fill range", () => {
    const sparseProjectStatuses = sortLinearWorkflowStates([
      { id: "backlog", name: "Backlog", type: "backlog", position: 0 },
      { id: "active", name: "In Progress", type: "started", position: 3 },
    ]);

    const inProgress = sparseProjectStatuses.find((status) => status.id === "active")!;

    expect(computeLinearProjectStatusFillRatio(sparseProjectStatuses, inProgress)).toBe(0.5);
  });

  test("always treats completed as 100% on the project status scale", () => {
    expect(
      computeLinearProjectStatusFillRatio(
        projectStatuses,
        projectStatuses.find((status) => status.id === "done")!,
      ),
    ).toBe(1);
  });
});

describe("hexagon geometry", () => {
  test("returns a closed hex path", () => {
    expect(describeLinearProjectStatusHexagonPath()).toMatch(/^M .+ Z$/);
  });

  test("returns a wedge path for partial fill", () => {
    expect(describeLinearProjectStatusPieWedge(0.25)).toMatch(/^M 7 7 L .+ A .+ Z$/);
  });

  test("exports a completed check path", () => {
    expect(LINEAR_PROJECT_COMPLETED_CHECK_PATH.startsWith("M13.78")).toBe(true);
    expect(LINEAR_PROJECT_COMPLETED_CHECK_PATH.endsWith("Z")).toBe(true);
  });

  test("centers and scales the completed check inside the icon", () => {
    expect(describeLinearProjectCompletedCheckTransform()).toBe(
      "translate(7 7) scale(0.595) translate(-8 -8)",
    );
  });
});
