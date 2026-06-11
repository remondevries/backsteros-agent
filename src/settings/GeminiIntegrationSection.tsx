import { ApiKeyField, IntegrationStatusLine, IntegrationStatusMessages } from "./integrationShared";
import { useApiKeyIntegration } from "./useApiKeyIntegration";

export function GeminiIntegrationSection({
  onSecretsUpdated,
}: {
  onSecretsUpdated?: () => void | Promise<void>;
}) {
  const integration = useApiKeyIntegration("gemini", onSecretsUpdated);

  return (
    <section className="settings-section">
      <p className="settings-hint settings-hint-spaced-top">
        Powers Gemini Lookup. Keys are stored locally in <code>~/.backsteros-agent/.env</code>.
      </p>
      <p className="settings-hint settings-hint-spaced">
        Enter a key and test it to save. Remove clears the saved key when the field is empty.
      </p>
      <IntegrationStatusLine connected={integration.configured} />

      <ApiKeyField
        id="gemini-api-key"
        label="API key"
        hint="Optional. Used for research and lookup in the Gemini view."
        value={integration.draft}
        configured={integration.configured}
        savedPreview={integration.savedPreview}
        unsetPlaceholder="AIza..."
        allowRemove
        testState={integration.testState}
        testResult={integration.testResult}
        saving={integration.saving}
        onChange={integration.updateDraft}
        onTest={() => {
          void integration.handleTest();
        }}
        onRemove={() => {
          void integration.handleRemove();
        }}
      />

      <IntegrationStatusMessages message={integration.message} error={integration.error} />
    </section>
  );
}
