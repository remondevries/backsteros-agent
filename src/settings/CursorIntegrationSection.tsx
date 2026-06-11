import { useMemo } from "react";
import { openExternalUrl } from "../lib/openExternalUrl";
import { ApiKeyField, IntegrationStatusLine, IntegrationStatusMessages } from "./integrationShared";
import { CursorModelSettings } from "./CursorModelSettings";
import { useApiKeyIntegration } from "./useApiKeyIntegration";

export function CursorIntegrationSection({
  onSecretsUpdated,
}: {
  onSecretsUpdated?: () => void | Promise<void>;
}) {
  const integration = useApiKeyIntegration("cursor", onSecretsUpdated);

  const showModelSettings = useMemo(() => {
    if (integration.configured) return true;
    return integration.testResult?.ok === true;
  }, [integration.configured, integration.testResult?.ok]);

  return (
    <section className="settings-section">
      <p className="settings-hint settings-hint-spaced-top">
        Required for chat. Keys are stored locally in <code>~/.backsteros-agent/.env</code>.
      </p>
      <p className="settings-hint settings-hint-spaced">
        Enter a key and test it to save.
      </p>
      <IntegrationStatusLine connected={integration.configured} />

      <ApiKeyField
        id="cursor-api-key"
        label="API key"
        hint={
          <>
            Get one from{" "}
            <a
              href="https://cursor.com/dashboard/integrations"
              onClick={(event) => {
                event.preventDefault();
                void openExternalUrl("https://cursor.com/dashboard/integrations");
              }}
            >
              Cursor Dashboard → Integrations
            </a>
            .
          </>
        }
        value={integration.draft}
        configured={integration.configured}
        savedPreview={integration.savedPreview}
        unsetPlaceholder="cursor_..."
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

      <CursorModelSettings enabled={showModelSettings} />

      <IntegrationStatusMessages message={integration.message} error={integration.error} />
    </section>
  );
}
