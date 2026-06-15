import { describe, expect, test } from "vitest";
import {
  computeLinearStatusFillRatio,
  computeLinearStatusIconModel,
  describeLinearStatusPieWedge,
  sortLinearWorkflowStates,
} from "./linearStatusIcon";

const workflowStates = sortLinearWorkflowStates([
  { id: "backlog", name: "Backlog", type: "backlog", position: 0, color: "#bec2c8" },
  { id: "todo", name: "Todo", type: "unstarted", position: 1, color: "#e2e2e2" },
  { id: "progress", name: "In Progress", type: "started", position: 2, color: "#fabd00" },
  { id: "review", name: "In Review", type: "started", position: 3, color: "#00a933" },
  { id: "done", name: "Done", type: "completed", position: 4, color: "#5c6ada" },
]);

const lightScheme = { colorScheme: "light" as const };

describe("computeLinearStatusIconModel", () => {
  test("uses workflow position to derive fill ratios", () => {
    expect(
      computeLinearStatusIconModel({
        stateId: "todo",
        workflowStates,
        ...lightScheme,
      }),
    ).toEqual({
      kind: "ring",
      color: "oklch(0.813 0.000 0.0)",
      fillRatio: 0,
    });

    expect(
      computeLinearStatusIconModel({
        stateId: "progress",
        workflowStates,
        ...lightScheme,
      }),
    ).toEqual({
      kind: "ring",
      color: "oklch(0.831 0.170 85.0)",
      fillRatio: 1 / 3,
    });

    expect(
      computeLinearStatusIconModel({
        stateId: "review",
        workflowStates,
        ...lightScheme,
      }),
    ).toEqual({
      kind: "ring",
      color: "oklch(0.639 0.197 145.7)",
      fillRatio: 2 / 3,
    });
  });

  test("keeps special icons for non-progress categories", () => {
    expect(
      computeLinearStatusIconModel({
        stateId: "backlog",
        workflowStates,
        ...lightScheme,
      }),
    ).toEqual({
      kind: "backlog",
      color: "oklch(0.813 0.010 258.3)",
    });

    expect(
      computeLinearStatusIconModel({
        stateId: "done",
        workflowStates,
        ...lightScheme,
      }),
    ).toEqual({
      kind: "completed",
      color: "oklch(0.571 0.170 274.4)",
    });
  });

  test("uses position spacing when workflow positions are uneven", () => {
    const unevenWorkflow = sortLinearWorkflowStates([
      { id: "todo", name: "Todo", type: "unstarted", position: 10, color: "#e2e2e2" },
      { id: "progress", name: "In Progress", type: "started", position: 50, color: "#fabd00" },
      { id: "review", name: "In Review", type: "started", position: 90, color: "#00a933" },
      { id: "done", name: "Done", type: "completed", position: 100, color: "#5c6ada" },
    ]);

    const todo = unevenWorkflow.find((state) => state.id === "todo")!;
    const progress = unevenWorkflow.find((state) => state.id === "progress")!;
    const review = unevenWorkflow.find((state) => state.id === "review")!;

    expect(computeLinearStatusFillRatio(unevenWorkflow, todo)).toBe(0);
    expect(computeLinearStatusFillRatio(unevenWorkflow, progress)).toBeCloseTo(40 / 90, 5);
    expect(computeLinearStatusFillRatio(unevenWorkflow, review)).toBeCloseTo(80 / 90, 5);
  });

  test("interpolates across unstarted, started, and completed", () => {
    const workflow = sortLinearWorkflowStates([
      { id: "todo", name: "Todo", type: "unstarted", position: 0, color: "#e2e2e2" },
      { id: "progress", name: "In Progress", type: "started", position: 50, color: "#fabd00" },
      { id: "done", name: "Done", type: "completed", position: 100, color: "#5c6ada" },
    ]);

    expect(
      computeLinearStatusFillRatio(
        workflow,
        workflow.find((state) => state.id === "progress")!,
      ),
    ).toBe(0.5);
  });

  test("scales fill from sparse custom workflow positions", () => {
    const customWorkflow = sortLinearWorkflowStates([
      { id: "todo", name: "Todo", type: "unstarted", position: 0, color: "#e2e2e2" },
      { id: "ready", name: "Ready", type: "unstarted", position: 100, color: "#e2e2e2" },
      { id: "progress", name: "In Progress", type: "started", position: 400, color: "#fabd00" },
      { id: "qa", name: "QA", type: "started", position: 800, color: "#00a933" },
      { id: "review", name: "In Review", type: "started", position: 900, color: "#00a933" },
      { id: "done", name: "Done", type: "completed", position: 1000, color: "#5c6ada" },
    ]);

    expect(
      computeLinearStatusFillRatio(customWorkflow, customWorkflow.find((state) => state.id === "ready")!),
    ).toBeCloseTo(100 / 1000, 5);
    expect(
      computeLinearStatusFillRatio(customWorkflow, customWorkflow.find((state) => state.id === "progress")!),
    ).toBeCloseTo(400 / 1000, 5);
    expect(
      computeLinearStatusFillRatio(customWorkflow, customWorkflow.find((state) => state.id === "review")!),
    ).toBeCloseTo(900 / 1000, 5);
  });

  test("returns zero fill when workflow states are unavailable", () => {
    expect(
      computeLinearStatusIconModel({
        status: "In Review",
        stateType: "started",
        ...lightScheme,
      }),
    ).toEqual({
      kind: "ring",
      color: "oklch(0.831 0.170 85.0)",
      fillRatio: 0,
    });
  });
});

describe("describeLinearStatusPieWedge", () => {
  test("returns empty path for zero fill", () => {
    expect(describeLinearStatusPieWedge(0)).toBe("");
  });

  test("returns a closed wedge path for partial fill", () => {
    expect(describeLinearStatusPieWedge(0.25)).toMatch(/^M 7 7 L .+ A 3\.5 3\.5 0 0 1 .+ Z$/);
  });
});
