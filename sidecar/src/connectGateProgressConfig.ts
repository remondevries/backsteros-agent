/** Shared connect-gate progress steps — keep in sync with `ConnectGateProgress` in the app. */

export type ConnectGateProgressStepId = "linear" | "cursor" | "setup";

export const CONNECT_GATE_PROGRESS_STEPS: ReadonlyArray<{
  id: ConnectGateProgressStepId;
  label: string;
}> = [
  { id: "linear", label: "Linear" },
  { id: "cursor", label: "Cursor Agent" },
  { id: "setup", label: "Setup" },
];

export type ConnectGateProgressState = {
  activeStep: ConnectGateProgressStepId;
  linearComplete: boolean;
  cursorComplete: boolean;
  setupComplete?: boolean;
};

export function connectGateStepComplete(
  stepId: ConnectGateProgressStepId,
  progress: ConnectGateProgressState,
): boolean {
  if (stepId === "linear") return progress.linearComplete;
  if (stepId === "cursor") return progress.cursorComplete;
  return progress.setupComplete ?? false;
}

export const CONNECT_GATE_PROGRESS_INCOMPLETE: ConnectGateProgressState = {
  activeStep: "linear",
  linearComplete: false,
  cursorComplete: false,
  setupComplete: false,
};

/** Linear OAuth success is still the Linear step until the user continues (Next step / Go to setup). */
export function connectGateProgressAfterLinearOAuth(hasCursorApiKey: boolean): ConnectGateProgressState {
  return {
    activeStep: "linear",
    linearComplete: true,
    cursorComplete: hasCursorApiKey,
    setupComplete: false,
  };
}
