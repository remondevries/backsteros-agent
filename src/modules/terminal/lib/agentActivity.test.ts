import { beforeEach, describe, expect, test } from "bun:test";
import {
  __applyAgentSignalForTests,
  __resetAgentActivityForTests,
  getAgentPtyState,
  isAgentActivePty,
  isAgentWaitingPty,
  isAgentWorkingPty,
  markAgentPtyExited,
  subscribeAgentTransitions,
} from "./agentActivity";

describe("agentActivity", () => {
  beforeEach(() => {
    __resetAgentActivityForTests();
  });

  test("tracks lifecycle and substate transitions", () => {
    __applyAgentSignalForTests({
      id: 11,
      kind: "started",
      agent: "claude",
      run_id: 1,
      seq: 1,
      ts_ms: 10,
    });
    expect(isAgentActivePty(11)).toBe(true);
    expect(isAgentWorkingPty(11)).toBe(true);
    expect(isAgentWaitingPty(11)).toBe(false);
    expect(getAgentPtyState(11)?.lifecycle).toBe("activating");

    __applyAgentSignalForTests({
      id: 11,
      kind: "attention",
      run_id: 1,
      seq: 2,
      ts_ms: 20,
    });
    expect(isAgentWaitingPty(11)).toBe(true);
    expect(getAgentPtyState(11)?.lifecycle).toBe("active");

    __applyAgentSignalForTests({
      id: 11,
      kind: "finished",
      run_id: 1,
      seq: 3,
      ts_ms: 30,
    });
    expect(isAgentActivePty(11)).toBe(true);
    expect(isAgentWorkingPty(11)).toBe(false);
    expect(isAgentWaitingPty(11)).toBe(true);
    expect(getAgentPtyState(11)?.substate).toBe("waiting_for_user");

    __applyAgentSignalForTests({
      id: 11,
      kind: "exited",
      run_id: 1,
      seq: 4,
      ts_ms: 40,
    });
    expect(isAgentActivePty(11)).toBe(false);
    expect(getAgentPtyState(11)?.lifecycle).toBe("inactive");
  });

  test("ignores stale sequence signals", () => {
    __applyAgentSignalForTests({
      id: 42,
      kind: "started",
      run_id: 1,
      seq: 10,
      ts_ms: 100,
    });
    __applyAgentSignalForTests({
      id: 42,
      kind: "attention",
      run_id: 1,
      seq: 9,
      ts_ms: 101,
    });

    const state = getAgentPtyState(42);
    expect(state?.substate).toBe("working");
    expect(state?.lastSeq).toBe(10);
  });

  test("ignores stale run events from older run id", () => {
    __applyAgentSignalForTests({
      id: 77,
      kind: "started",
      run_id: 2,
      seq: 1,
      ts_ms: 100,
    });
    __applyAgentSignalForTests({
      id: 77,
      kind: "finished",
      run_id: 2,
      seq: 2,
      ts_ms: 110,
    });
    __applyAgentSignalForTests({
      id: 77,
      kind: "attention",
      run_id: 1,
      seq: 3,
      ts_ms: 120,
    });

    const state = getAgentPtyState(77);
    expect(state?.runId).toBe(2);
    expect(state?.substate).toBe("waiting_for_user");
  });

  test("supports fallback sequencing and explicit runtime exits", () => {
    __applyAgentSignalForTests({
      id: 5,
      kind: "started",
      agent: "codex",
    });
    __applyAgentSignalForTests({
      id: 5,
      kind: "working",
    });
    markAgentPtyExited(5, "pty_exit");

    const state = getAgentPtyState(5);
    expect(state?.lifecycle).toBe("inactive");
    expect(state?.lastSeq).toBe(3);
  });

  test("maps prompt and waiting kinds to waiting_for_user", () => {
    __applyAgentSignalForTests({
      id: 212,
      kind: "started",
      run_id: 1,
      seq: 1,
    });
    __applyAgentSignalForTests({
      id: 212,
      kind: "prompt",
      run_id: 1,
      seq: 2,
    });
    expect(isAgentWaitingPty(212)).toBe(true);

    __applyAgentSignalForTests({
      id: 212,
      kind: "working",
      run_id: 1,
      seq: 3,
    });
    __applyAgentSignalForTests({
      id: 212,
      kind: "waiting",
      run_id: 1,
      seq: 4,
    });
    expect(isAgentWorkingPty(212)).toBe(false);
    expect(isAgentWaitingPty(212)).toBe(true);
  });

  test("only publishes transition events for accepted state changes", () => {
    const events: string[] = [];
    const unsubscribe = subscribeAgentTransitions((_, kind) => {
      events.push(kind);
    });

    __applyAgentSignalForTests({
      id: 90,
      kind: "started",
      run_id: 1,
      seq: 1,
    });
    __applyAgentSignalForTests({
      id: 90,
      kind: "started",
      run_id: 1,
      seq: 1,
    });
    markAgentPtyExited(90, "pty_dispose");
    unsubscribe();

    expect(events).toEqual(["started", "exited"]);
  });
});
