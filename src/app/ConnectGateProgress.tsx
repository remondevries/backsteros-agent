import {
  CONNECT_GATE_PROGRESS_STEPS,
  connectGateStepComplete,
  type ConnectGateProgressStepId,
} from "../../sidecar/src/connectGateProgressConfig.ts";

export type ConnectGateProgressStep = ConnectGateProgressStepId;

function ConnectGateStepCompleteIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
      <path
        d="M6 0a6 6 0 1 1 0 12A6 6 0 0 1 6 0Zm-.705 8.737L9.63 4.403 8.392 3.166 5.295 6.263l-1.7-1.702L2.356 5.8l2.938 2.938Z"
      />
    </svg>
  );
}

function ConnectGateStepCircleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 12 12"
      width="12"
      height="12"
      aria-hidden="true"
    >
      <circle cx="6" cy="6" r="5.5" fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

export function ConnectGateProgress({
  activeStep,
  linearComplete,
  cursorComplete,
  setupComplete = false,
  onStepClick,
}: {
  activeStep: ConnectGateProgressStep;
  linearComplete: boolean;
  cursorComplete: boolean;
  setupComplete?: boolean;
  onStepClick?: (step: ConnectGateProgressStep) => void;
}) {
  const progress = {
    activeStep,
    linearComplete,
    cursorComplete,
    setupComplete,
  };

  return (
    <nav className="connect-gate-progress" aria-label="Setup progress">
      <ol className="connect-gate-progress-list">
        {CONNECT_GATE_PROGRESS_STEPS.map((step) => {
          const complete = connectGateStepComplete(step.id, progress);
          const isActive = step.id === activeStep;
          const canNavigateToLinear =
            step.id === "linear" &&
            complete &&
            activeStep !== "linear" &&
            typeof onStepClick === "function";
          const canNavigateToCursor =
            step.id === "cursor" &&
            cursorComplete &&
            activeStep !== "cursor" &&
            typeof onStepClick === "function";
          const canNavigateToStep = canNavigateToLinear || canNavigateToCursor;

          const stepClassName = [
            "connect-gate-progress-step",
            complete && "connect-gate-progress-step--complete",
            isActive && "connect-gate-progress-step--current",
            isActive && !complete && "connect-gate-progress-step--active",
            canNavigateToStep && "connect-gate-progress-step--clickable",
          ]
            .filter(Boolean)
            .join(" ");

          const stepContent = (
            <>
              <span className="connect-gate-progress-step-icon">
                {complete ? <ConnectGateStepCompleteIcon /> : <ConnectGateStepCircleIcon />}
              </span>
              <span className="connect-gate-progress-step-label">{step.label}</span>
            </>
          );

          return (
            <li key={step.id} className="connect-gate-progress-item">
              {canNavigateToStep ? (
                <button
                  type="button"
                  className={stepClassName}
                  onClick={() => onStepClick(step.id)}
                  aria-label={
                    step.id === "linear" ? "Go back to Linear connection" : "Next step"
                  }
                >
                  {stepContent}
                </button>
              ) : (
                <span className={stepClassName} aria-current={isActive ? "step" : undefined}>
                  {stepContent}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
