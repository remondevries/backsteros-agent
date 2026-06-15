import { ConnectGateShell } from "./ConnectGateShell";
import { ApiKeyField, IntegrationStatusMessages } from "../settings/integrationShared";
import { useApiKeyIntegration } from "../settings/useApiKeyIntegration";

export function CursorConnectGate({
  onGoToSetup,
  onLinearStepClick,
  cursorStepComplete = false,
  bootstrapNotice = null,
}: {
  onGoToSetup: () => void | Promise<void>;
  onLinearStepClick?: () => void;
  cursorStepComplete?: boolean;
  bootstrapNotice?: string | null;
}) {
  const integration = useApiKeyIntegration("cursor", undefined, { stayOnSuccess: true });
  const canGoToSetup = integration.configured || integration.testState === "success";

  return (
    <ConnectGateShell
      brand="backster-cursor"
      integrationConnected={canGoToSetup}
      progressStep="cursor"
      linearStepComplete
      cursorStepComplete={cursorStepComplete || canGoToSetup}
      onProgressStepClick={(step) => {
        if (step === "linear") {
          onLinearStepClick?.();
        }
      }}
      title="Connect to Cursor Agent"
      description="Connect your Cursor Agent to BacksterOS to access code intelligence in chat."
    >
      <div className="linear-connect-gate-body linear-connect-gate-cursor-form">
        <ApiKeyField
          id="cursor-connect-api-key"
          label="API key"
          value={integration.draft}
          configured={integration.configured}
          savedPreview={integration.savedPreview}
          unsetPlaceholder="cursor_…"
          allowRemove={false}
          testState={integration.testState}
          testResult={integration.testResult}
          saving={integration.saving}
          onChange={integration.updateDraft}
          onTest={() => {
            void integration.handleTest();
          }}
          onRetry={integration.resetForRetry}
          onRemove={() => {}}
          showVerifiedCheck
          successActionLabel="Next step"
          onSuccessAction={() => {
            void onGoToSetup();
          }}
        />
        <IntegrationStatusMessages
          message={integration.message}
          error={bootstrapNotice ?? integration.error}
        />
      </div>
    </ConnectGateShell>
  );
}
