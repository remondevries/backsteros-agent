import { describe, expect, test } from "bun:test";
import { resolveWorkflowStateId, type LinearWorkflowState } from "./project-context.ts";

const states: LinearWorkflowState[] = [
  { id: "ready", name: "Ready to Start", type: "unstarted" },
  { id: "progress", name: "In Progress", type: "started" },
  { id: "backlog", name: "Backlog", type: "backlog" },
];

describe("project-context", () => {
  test("resolveWorkflowStateId matches preferred names case-insensitively", () => {
    expect(resolveWorkflowStateId(states, ["In Progress"])).toBe("progress");
    expect(resolveWorkflowStateId(states, ["ready to start"])).toBe("ready");
  });

  test("resolveWorkflowStateId falls back to workflow state type", () => {
    const sparse: LinearWorkflowState[] = [
      { id: "s1", name: "Doing", type: "started" },
      { id: "s2", name: "Queue", type: "unstarted" },
    ];
    expect(resolveWorkflowStateId(sparse, ["In Progress"], "started")).toBe("s1");
    expect(resolveWorkflowStateId(sparse, ["Ready to Start"], "unstarted")).toBe("s2");
  });
});
