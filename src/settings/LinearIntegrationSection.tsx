import type { LinearIssueLinkMode } from "../chat/types";
import { LinearProjectPicker } from "./LinearProjectPicker";
import { SettingsOptionPicker } from "./SettingsOptionPicker";
import { ApiKeyField, IntegrationStatusLine, IntegrationStatusMessages } from "./integrationShared";
import { useApiKeyIntegration } from "./useApiKeyIntegration";

const LINEAR_LINK_MODE_OPTIONS: {
  value: LinearIssueLinkMode;
  label: string;
  description: string;
}[] = [
  {
    value: "external",
    label: "Web URL",
    description: "Open issue links in your browser",
  },
  {
    value: "internal",
    label: "Linear app",
    description: "Open issue links in the Linear desktop app",
  },
];

export function LinearIntegrationSection({
  issueLinkMode,
  groceryLinearProjectId,
  saving,
  onIssueLinkModeChange,
  onGroceryLinearProjectIdChange,
  onSecretsUpdated,
}: {
  issueLinkMode: LinearIssueLinkMode;
  groceryLinearProjectId: string;
  saving: boolean;
  onIssueLinkModeChange: (value: LinearIssueLinkMode) => void;
  onGroceryLinearProjectIdChange: (value: string) => void;
  onSecretsUpdated?: () => void | Promise<void>;
}) {
  const integration = useApiKeyIntegration("linear", onSecretsUpdated);

  return (
    <section className="settings-section">
      <p className="settings-hint settings-hint-spaced-top">
        Enables Linear MCP tools in chat and the Linear dashboard. Keys are stored locally in{" "}
        <code>~/.backsteros-agent/.env</code>.
      </p>
      <p className="settings-hint settings-hint-spaced">
        Enter a key and test it to save. Remove clears the saved key when the field is empty.
      </p>
      <IntegrationStatusLine connected={integration.configured} />

      <ApiKeyField
        id="linear-api-key"
        label="API key"
        hint="Optional. Required for Linear tools, issue links, and the grocery list automation."
        value={integration.draft}
        configured={integration.configured}
        savedPreview={integration.savedPreview}
        unsetPlaceholder="lin_..."
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

      <h3 className="settings-subsection-title">App preferences</h3>

      <label className="settings-field-label" htmlFor="issue-link-mode">
        Issue link destination
      </label>
      <p className="settings-hint">
        Choose how Linear issue links open when you click them in chat or the Linear view.
      </p>
      <div className="settings-row settings-row-project-picker">
        <SettingsOptionPicker
          id="issue-link-mode"
          value={issueLinkMode}
          disabled={saving}
          options={LINEAR_LINK_MODE_OPTIONS}
          onChange={onIssueLinkModeChange}
        />
      </div>

      <label className="settings-field-label" htmlFor="grocery-linear-project">
        Grocery list project
      </label>
      <p className="settings-hint">
        Weekly grocery items are added as checkboxes on a Linear issue in this project.
      </p>
      <div className="settings-row settings-row-project-picker">
        <LinearProjectPicker
          id="grocery-linear-project"
          value={groceryLinearProjectId}
          disabled={saving}
          onChange={onGroceryLinearProjectIdChange}
        />
      </div>
    </section>
  );
}
