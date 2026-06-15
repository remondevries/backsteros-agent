import { useCallback, useEffect, useState } from "react";
import { fetchWhoopToday, getIntegrationsStatus, getWhoopSetup, type IntegrationsStatus } from "../lib/api";
import { openExternalUrl } from "../lib/openExternalUrl";
import { restartSidecarIfNeeded } from "../lib/restartSidecar";
import {
  getWhoopStatusLabel,
  isWhoopConnected,
} from "./integrationConnectionStatus";
import { IntegrationStatusLine, IntegrationStatusMessages, IntegrationTestFeedback } from "./integrationShared";

function buildWhoopSetupInstructions(setup: {
  envPath: string;
  authCommand: string;
}): string {
  return [
    `Tokens file: ${setup.envPath}`,
    "",
    "1. Add WHOOP_EMAIL=your@email.com to that file",
    `2. Run in Terminal: ${setup.authCommand}`,
    "3. Copy WHOOP_IOS_BEARER_TOKEN, WHOOP_COGNITO_REFRESH_TOKEN, WHOOP_USER_ID, and WHOOP_INSTALLATION_ID into totem.env",
    "4. Restart BacksterOS Agent or test the connection below",
  ].join("\n");
}

export function WhoopIntegrationSection({
  onSecretsUpdated,
}: {
  onSecretsUpdated?: () => void | Promise<void>;
}) {
  const [status, setStatus] = useState<IntegrationsStatus | null>(null);
  const [setupBusy, setSetupBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testOk, setTestOk] = useState<boolean | undefined>();
  const [testMessage, setTestMessage] = useState<string | undefined>();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    const next = await getIntegrationsStatus();
    setStatus(next);
  }, []);

  useEffect(() => {
    void loadStatus().catch((err) => {
      setError(err instanceof Error ? err.message : "Failed to load Whoop status");
    });
  }, [loadStatus]);

  const whoop = status?.whoop;
  const connected = whoop ? isWhoopConnected(whoop) : false;
  const busy = setupBusy || testing;

  async function handleSetup() {
    setSetupBusy(true);
    setError(null);
    setMessage(null);
    setTestOk(undefined);
    setTestMessage(undefined);
    try {
      const setup = await getWhoopSetup();
      await loadStatus();
      const instructions = buildWhoopSetupInstructions(setup);
      await navigator.clipboard.writeText(instructions);
      await openExternalUrl(setup.docsUrl);
      setMessage(
        "Setup steps copied to clipboard. Finish auth in Terminal, paste tokens into totem.env, then restart the app or test the connection.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start Whoop setup");
    } finally {
      setSetupBusy(false);
    }
  }

  async function handleTestConnection() {
    setTesting(true);
    setError(null);
    setMessage(null);
    setTestOk(undefined);
    setTestMessage(undefined);
    try {
      await restartSidecarIfNeeded();
      const result = await fetchWhoopToday({ force: true });
      await loadStatus();
      await onSecretsUpdated?.();
      if (result.authenticated && result.snapshot) {
        setTestOk(true);
        setTestMessage("Connected — today's Whoop snapshot loaded.");
        setMessage("Whoop is connected.");
        return;
      }
      if (result.error) {
        setTestOk(false);
        setTestMessage(result.error);
        return;
      }
      setTestOk(false);
      setTestMessage("Whoop tokens are missing or invalid. Run setup and paste tokens into totem.env.");
    } catch (err) {
      setTestOk(false);
      setTestMessage(err instanceof Error ? err.message : "Whoop connection test failed");
    } finally {
      setTesting(false);
    }
  }

  return (
    <section className="settings-section">
      <p className="settings-hint settings-hint-spaced-top">
        Connect Whoop through the Totem CLI. Tokens are stored locally in{" "}
        <code>{whoop?.envPath ?? "~/.backsteros-agent/totem.env"}</code>.
      </p>
      <p className="settings-hint settings-hint-spaced">
        Whoop powers recovery, sleep, and strain in daily notes, morning review, and chat tools.
      </p>

      <IntegrationStatusLine connected={connected} />
      {!connected && whoop ? (
        <p className="settings-hint settings-hint-spaced">{getWhoopStatusLabel(whoop)}</p>
      ) : null}

      {whoop?.configured && !connected ? (
        <p className="settings-hint settings-hint-spaced">
          Tokens file found at <code>{whoop.envPath}</code>. Add your Whoop tokens, then restart or
          test the connection.
        </p>
      ) : null}

      <div className="settings-row settings-row-profiles settings-hint-spaced">
        <button
          type="button"
          className="btn-secondary"
          disabled={busy}
          onClick={() => {
            void handleSetup();
          }}
        >
          {setupBusy ? "Opening setup…" : connected ? "View setup steps" : "Connect Whoop"}
        </button>
        <button
          type="button"
          className="btn-secondary settings-integration-test-button"
          disabled={busy || !whoop?.configured}
          onClick={() => {
            void handleTestConnection();
          }}
        >
          {testing ? "Testing…" : "Test connection"}
        </button>
      </div>

      <IntegrationTestFeedback
        result={
          testOk === undefined
            ? undefined
            : { ok: testOk, message: testMessage ?? (testOk ? "Connected." : "Test failed.") }
        }
      />
      <IntegrationStatusMessages message={message} error={error} />
    </section>
  );
}
