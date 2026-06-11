import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchCursorModels,
  getSettings,
  updateSettings,
  type CursorModelSummary,
} from "../lib/api";
import { SettingsOptionPicker } from "./SettingsOptionPicker";

function pickInitialModelId(
  savedId: string | null | undefined,
  fallbackId: string,
  models: CursorModelSummary[],
): string {
  if (savedId && models.some((model) => model.id === savedId)) {
    return savedId;
  }
  if (models.some((model) => model.id === fallbackId)) {
    return fallbackId;
  }
  return models[0]?.id ?? fallbackId;
}

function preferComposerModel(models: CursorModelSummary[]): string {
  const composer = models.find((model) => /composer/i.test(model.id));
  return composer?.id ?? models[0]?.id ?? "composer-2.5";
}

function preferOpusModel(models: CursorModelSummary[]): string {
  const opusModels = models.filter(
    (model) =>
      /opus/i.test(model.id) ||
      /opus/i.test(model.displayName) ||
      model.aliases?.some((alias) => /opus/i.test(alias)),
  );
  if (opusModels.length === 0) {
    return models[0]?.id ?? "claude-opus-4-8";
  }
  return opusModels.sort((left, right) => right.id.localeCompare(left.id))[0]!.id;
}

export function CursorModelSettings({
  enabled,
}: {
  enabled: boolean;
}) {
  const [models, setModels] = useState<CursorModelSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoModelId, setAutoModelId] = useState("");
  const [maxModelId, setMaxModelId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadModels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [settings, modelResponse] = await Promise.all([
        getSettings(),
        fetchCursorModels(),
      ]);
      const nextModels = modelResponse.models;
      setModels(nextModels);
      setAutoModelId(
        pickInitialModelId(
          settings.autoModelId,
          preferComposerModel(nextModels),
          nextModels,
        ),
      );
      setMaxModelId(
        pickInitialModelId(
          settings.maxModelId,
          preferOpusModel(nextModels),
          nextModels,
        ),
      );
    } catch (err) {
      setModels([]);
      setError(err instanceof Error ? err.message : "Failed to load Cursor models");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void loadModels();
  }, [enabled, loadModels]);

  const modelOptions = useMemo(
    () =>
      models.map((model) => ({
        value: model.id,
        label: model.displayName || model.id,
        description: model.id,
      })),
    [models],
  );

  async function saveModelSelection(nextAutoModelId: string, nextMaxModelId: string) {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await updateSettings({
        autoModelId: nextAutoModelId,
        maxModelId: nextMaxModelId,
      });
      setMessage("Model preferences saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save model preferences");
    } finally {
      setSaving(false);
    }
  }

  async function handleAutoModelChange(nextAutoModelId: string) {
    setAutoModelId(nextAutoModelId);
    await saveModelSelection(nextAutoModelId, maxModelId);
  }

  async function handleMaxModelChange(nextMaxModelId: string) {
    setMaxModelId(nextMaxModelId);
    await saveModelSelection(autoModelId, nextMaxModelId);
  }

  if (!enabled) return null;

  return (
    <div className="settings-cursor-models">
      <h3 className="settings-subsection-title">Models</h3>
      <p className="settings-hint settings-hint-spaced-top">
        Choose which Cursor model to use for Auto and Max composer modes.
      </p>

      {loading ? (
        <p className="settings-hint">Loading available models…</p>
      ) : models.length === 0 ? (
        <p className="settings-hint">
          {error ?? "No models available. Test the API key to load models from your account."}
        </p>
      ) : (
        <>
          <label className="settings-field-label" htmlFor="cursor-auto-model">
            Auto mode
          </label>
          <p className="settings-hint">Fast model used when composer is set to Auto.</p>
          <div className="settings-row settings-row-project-picker">
            <SettingsOptionPicker
              id="cursor-auto-model"
              value={autoModelId}
              disabled={saving}
              options={modelOptions}
              onChange={(value) => {
                void handleAutoModelChange(value);
              }}
            />
          </div>

          <label className="settings-field-label" htmlFor="cursor-max-model">
            Max mode
          </label>
          <p className="settings-hint">High-capability model used when composer is set to Max.</p>
          <div className="settings-row settings-row-project-picker">
            <SettingsOptionPicker
              id="cursor-max-model"
              value={maxModelId}
              disabled={saving}
              options={modelOptions}
              onChange={(value) => {
                void handleMaxModelChange(value);
              }}
            />
          </div>
        </>
      )}

      {message && <p className="settings-hint settings-hint-spaced">{message}</p>}
      {error && models.length > 0 && (
        <p className="error-text settings-hint-spaced">{error}</p>
      )}
    </div>
  );
}
