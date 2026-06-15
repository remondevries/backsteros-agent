import { describe, expect, test } from "bun:test";
import {
  connectGateProgressAfterLinearOAuth,
  CONNECT_GATE_PROGRESS_STEPS,
} from "./connectGateProgressConfig.ts";

describe("connectGateProgressConfig", () => {
  test("includes Linear, Cursor Agent, and Setup steps", () => {
    expect(CONNECT_GATE_PROGRESS_STEPS.map((step) => step.id)).toEqual([
      "linear",
      "cursor",
      "setup",
    ]);
  });

  test("after Linear OAuth without Cursor key stays on Linear step", () => {
    expect(connectGateProgressAfterLinearOAuth(false)).toEqual({
      activeStep: "linear",
      linearComplete: true,
      cursorComplete: false,
      setupComplete: false,
    });
  });

  test("after Linear OAuth with Cursor key stays on Linear step", () => {
    expect(connectGateProgressAfterLinearOAuth(true)).toEqual({
      activeStep: "linear",
      linearComplete: true,
      cursorComplete: true,
      setupComplete: false,
    });
  });
});
