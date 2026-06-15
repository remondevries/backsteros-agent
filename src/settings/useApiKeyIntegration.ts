import { useCallback, useEffect, useState } from "react";
import {
  getIntegrationsStatus,
  runIntegrationTest,
  updateIntegrationSecrets,
  type IntegrationTestCredentials,
  type IntegrationTestResult,
  type IntegrationsStatus,
} from "../lib/api";
import { restartSidecarIfNeeded } from "../lib/restartSidecar";
import { apiKeyLabel, type ApiKeyTarget, type FieldTestState } from "./integrationShared";

function credentialForDraft(target: ApiKeyTarget, draft: string): IntegrationTestCredentials {
  if (!draft) return {};
  if (target === "cursor") return { cursorApiKey: draft };
  return { geminiApiKey: draft };
}

function secretFieldForTarget(status: IntegrationsStatus | null, target: ApiKeyTarget) {
  if (target === "cursor") return status?.cursorApiKey;
  return status?.geminiApiKey;
}

export function useApiKeyIntegration(
  target: ApiKeyTarget,
  onSecretsUpdated?: () => void | Promise<void>,
  options?: { stayOnSuccess?: boolean },
) {
  const stayOnSuccess = options?.stayOnSuccess ?? false;
  const [status, setStatus] = useState<IntegrationsStatus | null>(null);
  const [draft, setDraft] = useState("");
  const [testState, setTestState] = useState<FieldTestState>("idle");
  const [testResult, setTestResult] = useState<IntegrationTestResult | undefined>();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    const next = await getIntegrationsStatus();
    setStatus(next);
  }, []);

  useEffect(() => {
    void loadStatus().catch((err) => {
      setError(err instanceof Error ? err.message : "Failed to load integration status");
    });
  }, [loadStatus]);

  function resetTestState() {
    setTestState("idle");
    setTestResult(undefined);
  }

  function resetForRetry() {
    setDraft("");
    resetTestState();
    setError(null);
    setMessage(null);
  }

  function updateDraft(value: string) {
    setDraft(value);
    resetTestState();
  }

  async function saveDraft(apiKey: string) {
    const payload =
      target === "cursor"
        ? { cursorApiKey: apiKey }
        : { geminiApiKey: apiKey };
    const next = await updateIntegrationSecrets(payload);
    setStatus(next);
    setDraft("");
    if (!stayOnSuccess) {
      resetTestState();
      await restartSidecarIfNeeded();
      await onSecretsUpdated?.();
      setMessage(`${apiKeyLabel(target)} API key saved.`);
      return;
    }

    await restartSidecarIfNeeded();
  }

  async function handleTest() {
    setTestState("testing");
    setError(null);
    setMessage(null);
    const trimmedDraft = draft.trim();
    try {
      const result = await runIntegrationTest(target, credentialForDraft(target, trimmedDraft));
      if (!result.ok) {
        setTestResult(result);
        setTestState("failed");
        return;
      }

      if (trimmedDraft) {
        setTestState("saving");
        try {
          await saveDraft(trimmedDraft);
          if (stayOnSuccess) {
            setTestResult(undefined);
            setTestState("success");
          } else {
            setTestResult({ ok: true, message: result.message });
            setTestState("idle");
          }
        } catch (err) {
          const failure = {
            ok: false,
            message: err instanceof Error ? err.message : "Failed to save API key",
          };
          setTestResult(failure);
          setTestState("failed");
        }
        return;
      }

      if (stayOnSuccess && result.ok) {
        setTestResult(undefined);
        setTestState("success");
      } else {
        setTestResult(result);
        setTestState("idle");
      }
    } catch (err) {
      const failure = {
        ok: false,
        message: err instanceof Error ? err.message : "Integration test failed",
      };
      setTestResult(failure);
      setTestState("failed");
    }
  }

  async function handleRemove() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const payload =
        target === "cursor"
          ? { cursorApiKey: "" }
          : { geminiApiKey: "" };
      const next = await updateIntegrationSecrets(payload);
      setStatus(next);
      setDraft("");
      resetTestState();
      await restartSidecarIfNeeded();
      await onSecretsUpdated?.();
      setMessage(`${apiKeyLabel(target)} API key removed.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove API key");
    } finally {
      setSaving(false);
    }
  }

  const fieldStatus = secretFieldForTarget(status, target);

  return {
    draft,
    updateDraft,
    configured: Boolean(fieldStatus?.configured),
    savedPreview: fieldStatus?.preview,
    testState,
    testResult,
    saving,
    message,
    error,
    handleTest,
    handleRemove,
    resetForRetry,
  };
}
