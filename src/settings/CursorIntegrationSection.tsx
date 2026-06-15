import { useMemo } from "react";
import { ComposerModeToggle } from "../chat/ComposerModeToggle";
import type { ComposerMode } from "../chat/composerMode";
import { openExternalUrl } from "../lib/openExternalUrl";
import { ApiKeyField, IntegrationStatusLine, IntegrationStatusMessages } from "./integrationShared";
import { CursorModelSettings } from "./CursorModelSettings";
import { useApiKeyIntegration } from "./useApiKeyIntegration";

export type CursorSettingsView = "general" | "api-key";

export function CursorIntegrationSection({
  activeView,
  composerMode,
  saving,
  userProfilePath,
  agentProfilePath,
  onComposerModeChange,
  onEditAgentProfile,
  onEditUserProfile,
  onSecretsUpdated,
}: {
  activeView: CursorSettingsView;
  composerMode: ComposerMode;
  saving: boolean;
  userProfilePath: string | null;
  agentProfilePath: string | null;
  onComposerModeChange: (mode: ComposerMode) => void;
  onEditAgentProfile: () => void;
  onEditUserProfile: () => void;
  onSecretsUpdated?: () => void | Promise<void>;
}) {
  const integration = useApiKeyIntegration("cursor", onSecretsUpdated);

  const showModelSettings = useMemo(() => {
    if (integration.configured) return true;
    return integration.testResult?.ok === true;
  }, [integration.configured, integration.testResult?.ok]);

  return (
    <>
      {activeView === "general" ? (
        <>
          <section className="settings-section">
            <h3 className="settings-subsection-title">Composer</h3>
            <p className="settings-hint settings-hint-spaced-top">
              Test runs automation playbooks with deterministic local responses. Auto uses the fast
              model. Max uses the latest Opus model.
            </p>
            <div className="settings-row settings-row-model">
              <ComposerModeToggle
                mode={composerMode}
                onChange={onComposerModeChange}
                disabled={saving}
              />
            </div>
            <p className="settings-hint settings-hint-spaced">
              You can also set <code>BACKSTER_EXECUTION_MODE=test</code> for one-off runs.
            </p>
          </section>

          <section className="settings-section">
            <h3 className="settings-subsection-title">Agent profiles</h3>
            <p className="settings-hint settings-hint-spaced-top">
              Markdown read on every Cursor agent turn for Backster&apos;s persona and your identity
              context. Changes apply on the next message.
            </p>
            <div className="settings-row settings-row-profiles">
              <button type="button" className="btn-secondary" onClick={onEditAgentProfile}>
                Edit agent persona
              </button>
              <button type="button" className="btn-secondary" onClick={onEditUserProfile}>
                Edit user profile
              </button>
            </div>
            {(agentProfilePath || userProfilePath) && (
              <p className="settings-hint settings-hint-spaced">
                {agentProfilePath && <>Agent: {agentProfilePath}</>}
                {agentProfilePath && userProfilePath && " · "}
                {userProfilePath && <>User: {userProfilePath}</>}
              </p>
            )}
          </section>

          <section className="settings-section">
            <CursorModelSettings enabled={showModelSettings} />
          </section>
        </>
      ) : null}

      {activeView === "api-key" ? (
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

          <IntegrationStatusMessages message={integration.message} error={integration.error} />
        </section>
      ) : null}
    </>
  );
}
