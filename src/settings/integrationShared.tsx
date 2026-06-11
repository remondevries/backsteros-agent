import { useState, type ReactNode } from "react";
import type { IntegrationTestResult } from "../lib/api";

export type ApiKeyTarget = "cursor" | "linear" | "gemini";
export type FieldTestState = "idle" | "testing" | "saving" | "failed";

export function apiKeyLabel(target: ApiKeyTarget): string {
  if (target === "cursor") return "Cursor";
  if (target === "linear") return "Linear";
  return "Gemini";
}

export function savedKeyPreviewParts(preview: string | undefined): { mask: string; suffix: string } | null {
  if (!preview) return null;
  if (preview === "...") return { mask: "••••", suffix: "" };
  const suffix = preview.startsWith("...") ? preview.slice(3) : preview;
  return { mask: "••••••••", suffix };
}

export function IntegrationStatusLine({ connected }: { connected: boolean }) {
  return (
    <p className="settings-hint">
      Status: <strong>{connected ? "Connected" : "Not connected"}</strong>
    </p>
  );
}

export function IntegrationTestFeedback({
  result,
}: {
  result: IntegrationTestResult | undefined;
}) {
  if (!result) return null;
  return (
    <p
      className={[
        "settings-integration-test-result",
        result.ok ? "settings-integration-test-result--ok" : "settings-integration-test-result--error",
      ].join(" ")}
      role="status"
    >
      {result.message}
    </p>
  );
}

export function IntegrationStatusMessages({
  message,
  error,
}: {
  message: string | null;
  error: string | null;
}) {
  return (
    <>
      {message && <p className="settings-hint settings-hint-spaced">{message}</p>}
      {error && <p className="error-text settings-hint-spaced">{error}</p>}
    </>
  );
}

export function IntegrationSecretInput({
  id,
  label,
  hint,
  value,
  configured,
  savedPreview,
  unsetPlaceholder,
  inputType = "password",
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  value: string;
  configured: boolean;
  savedPreview?: string;
  unsetPlaceholder: string;
  inputType?: "password" | "text";
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  const draft = value.trim();
  const showSavedActions = !draft && configured;
  const previewParts = savedKeyPreviewParts(savedPreview);
  const showSavedValue = showSavedActions && !focused && previewParts !== null;
  const savedSuffix = previewParts?.suffix;

  return (
    <>
      <label className="settings-field-label" htmlFor={id}>
        {label}
      </label>
      {hint ? <p className="settings-hint">{hint}</p> : null}
      <div className="settings-row settings-row-with-test">
        <div
          className={[
            "settings-integration-input-wrap",
            focused || draft ? "settings-integration-input-wrap--editing" : "",
          ].join(" ")}
        >
          {showSavedValue && previewParts && (
            <span className="settings-integration-saved-value" aria-hidden="true">
              <span className="settings-integration-saved-value-mask">{previewParts.mask}</span>
              {previewParts.suffix ? (
                <span className="settings-integration-saved-value-suffix">{previewParts.suffix}</span>
              ) : null}
            </span>
          )}
          <input
            id={id}
            type={inputType}
            autoComplete="off"
            value={value}
            disabled={disabled}
            placeholder={configured ? undefined : unsetPlaceholder}
            aria-label={
              savedSuffix
                ? `${label} saved, ending in ${savedSuffix}. Enter a new value to replace.`
                : label
            }
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onChange={(event) => onChange(event.target.value)}
          />
        </div>
      </div>
    </>
  );
}

export function ApiKeyField({
  id,
  label,
  hint,
  value,
  configured,
  savedPreview,
  unsetPlaceholder,
  allowRemove,
  testState,
  testResult,
  saving,
  onChange,
  onTest,
  onRemove,
}: {
  id: string;
  label: string;
  hint: ReactNode;
  value: string;
  configured: boolean;
  savedPreview?: string;
  unsetPlaceholder: string;
  allowRemove: boolean;
  testState: FieldTestState;
  testResult: IntegrationTestResult | undefined;
  saving: boolean;
  onChange: (value: string) => void;
  onTest: () => void;
  onRemove: () => void;
}) {
  const [focused, setFocused] = useState(false);
  const draft = value.trim();
  const testing = testState === "testing";
  const savingField = testState === "saving";
  const showSavedActions = !draft && configured;
  const showDraftTest = Boolean(draft);
  const showEmptyTest = !draft && !configured;
  const testEnabled = !saving && !testing && !savingField && (showDraftTest || showSavedActions);
  const removeEnabled = !saving && !testing && !savingField && allowRemove && showSavedActions;
  const previewParts = savedKeyPreviewParts(savedPreview);
  const showSavedValue = showSavedActions && !focused && previewParts !== null;
  const savedSuffix = previewParts?.suffix;

  return (
    <>
      <label className="settings-field-label" htmlFor={id}>
        {label}
      </label>
      <p className="settings-hint">{hint}</p>
      <div className="settings-row settings-row-with-test">
        <div
          className={[
            "settings-integration-input-wrap",
            focused || draft ? "settings-integration-input-wrap--editing" : "",
          ].join(" ")}
        >
          {showSavedValue && previewParts && (
            <span className="settings-integration-saved-value" aria-hidden="true">
              <span className="settings-integration-saved-value-mask">{previewParts.mask}</span>
              {previewParts.suffix ? (
                <span className="settings-integration-saved-value-suffix">{previewParts.suffix}</span>
              ) : null}
            </span>
          )}
          <input
            id={id}
            type="password"
            autoComplete="off"
            value={value}
            disabled={saving}
            placeholder={configured ? undefined : unsetPlaceholder}
            aria-label={
              savedSuffix
                ? `${label} saved, ending in ${savedSuffix}. Enter a new key to replace.`
                : label
            }
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onChange={(event) => onChange(event.target.value)}
          />
        </div>
        <div className="settings-integration-actions">
          {(showDraftTest || showSavedActions || showEmptyTest) && (
            <button
              type="button"
              className="btn-secondary settings-integration-test-button"
              disabled={!testEnabled}
              onClick={onTest}
            >
              {testing ? "Testing…" : savingField ? "Saving…" : "Test"}
            </button>
          )}
          {showSavedActions && allowRemove && (
            <button
              type="button"
              className="btn-secondary settings-integration-test-button settings-integration-test-button--remove"
              disabled={!removeEnabled}
              onClick={onRemove}
            >
              Remove
            </button>
          )}
        </div>
      </div>
      <IntegrationTestFeedback result={testResult} />
    </>
  );
}
