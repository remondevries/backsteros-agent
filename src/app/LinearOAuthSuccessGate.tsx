import { ConnectGateShell } from "./ConnectGateShell";

export function LinearOAuthSuccessGate({
  cursorStepComplete = false,
  onGoToSetup,
}: {
  cursorStepComplete?: boolean;
  onGoToSetup: () => void | Promise<void>;
}) {
  return (
    <ConnectGateShell
      brand="backster-linear"
      integrationConnected
      progressStep="linear"
      linearStepComplete
      cursorStepComplete={cursorStepComplete}
      title="Connected to Linear"
      description="Thank you for connecting. You're all set to use BacksterOS."
    >
      <div className="linear-connect-gate-actions">
        <button
          type="button"
          className="btn-primary linear-connect-gate-primary"
          onClick={() => {
            void onGoToSetup();
          }}
        >
          Go to setup
        </button>
      </div>
    </ConnectGateShell>
  );
}
