import { readFileSync } from "node:fs";
import { Cursor } from "@cursor/sdk";
import {
  GEMINI_LOOKUP_MODEL,
  getCursorApiKey,
  getGeminiApiKey,
  getGoogleOAuthCredentialsPath,
  getLinearApiKey,
  isGoogleCalendarAuthenticated,
  isGoogleCalendarConfigured,
} from "./config.ts";
import { fetchCalendarEventsToday } from "./morning-review-calendar.ts";
import { linearGraphqlRequest } from "./linear/graphql.ts";
import { parseOAuthCredentialsJson } from "./integrations-secrets.ts";

const TEST_TIMEOUT_MS = 12_000;

export type IntegrationTestTarget =
  | "cursor"
  | "linear"
  | "gemini"
  | "googleCalendar"
  | "googleCalendarCredentials";

export type IntegrationConnectTestTarget = Exclude<
  IntegrationTestTarget,
  "googleCalendarCredentials"
>;

export interface IntegrationTestResult {
  ok: boolean;
  message: string;
}

export type IntegrationTestReport = Record<IntegrationConnectTestTarget, IntegrationTestResult>;

export interface IntegrationTestCredentials {
  cursorApiKey?: string;
  linearApiKey?: string;
  geminiApiKey?: string;
  googleOAuthClientId?: string;
  googleOAuthClientSecret?: string;
}

function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out`)), TEST_TIMEOUT_MS);
    }),
  ]);
}

function failure(message: string): IntegrationTestResult {
  return { ok: false, message };
}

function success(message: string): IntegrationTestResult {
  return { ok: true, message };
}

export async function testCursorIntegration(
  apiKeyOverride?: string,
): Promise<IntegrationTestResult> {
  const apiKey = apiKeyOverride?.trim() || getCursorApiKey()?.trim();
  if (!apiKey) {
    return failure("Cursor API key is not configured.");
  }

  try {
    const models = await withTimeout(Cursor.models.list({ apiKey }), "Cursor API");
    if (!Array.isArray(models) || models.length === 0) {
      return failure("Cursor API returned no models.");
    }
    return success(`Connected — ${models.length} models available.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cursor API request failed";
    return failure(message);
  }
}

export async function testLinearIntegration(
  apiKeyOverride?: string,
): Promise<IntegrationTestResult> {
  const apiKey = apiKeyOverride?.trim() || getLinearApiKey();
  if (!apiKey) {
    return failure("Linear API key is not configured.");
  }

  try {
    const data = await withTimeout(
      linearGraphqlRequest<{ viewer: { name?: string; email?: string } }>(
        `query IntegrationTestViewer { viewer { name email } }`,
        {},
        { apiKey },
      ),
      "Linear API",
    );
    const label = data.viewer.name?.trim() || data.viewer.email?.trim() || "your account";
    return success(`Connected as ${label}.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Linear API request failed";
    return failure(message);
  }
}

export async function testGeminiIntegration(
  apiKeyOverride?: string,
): Promise<IntegrationTestResult> {
  const apiKey = apiKeyOverride?.trim() || getGeminiApiKey();
  if (!apiKey) {
    return failure("Gemini API key is not configured.");
  }

  const modelId = GEMINI_LOOKUP_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent`;

  try {
    const response = await withTimeout(
      fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: "Reply with exactly: ok" }] }],
          generationConfig: { maxOutputTokens: 8, temperature: 0 },
        }),
      }),
      "Gemini API",
    );

    if (!response.ok) {
      const body = await response.text();
      let detail = `HTTP ${response.status}`;
      try {
        const parsed = JSON.parse(body) as { error?: { message?: string } };
        if (parsed.error?.message) detail = parsed.error.message;
      } catch {
        if (body.trim()) detail = body.trim().slice(0, 160);
      }
      return failure(detail);
    }

    return success(`Connected — ${modelId} responded.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gemini API request failed";
    return failure(message);
  }
}

export async function testGoogleCalendarIntegration(): Promise<IntegrationTestResult> {
  if (!isGoogleCalendarConfigured()) {
    return failure("Google OAuth credentials are not configured.");
  }

  if (!isGoogleCalendarAuthenticated()) {
    return failure("Google Calendar credentials are saved but the account is not linked yet.");
  }

  try {
    const summary = await withTimeout(fetchCalendarEventsToday(), "Google Calendar");
    const count = summary.events.length;
    const eventLabel = count === 1 ? "1 event" : `${count} events`;
    return success(`Connected — ${eventLabel} on your calendar today.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google Calendar request failed";
    return failure(message);
  }
}

function validateGoogleOAuthCredentialPair(
  clientId: string,
  clientSecret: string,
): IntegrationTestResult {
  if (!clientId || !clientSecret) {
    return failure("Client ID and client secret are both required.");
  }

  if (!clientId.includes(".apps.googleusercontent.com")) {
    return failure(
      "Client ID should be a Desktop OAuth client ending in .apps.googleusercontent.com.",
    );
  }

  if (clientSecret.length < 8) {
    return failure("Client secret looks too short.");
  }

  return success("OAuth credentials look valid.");
}

export async function testGoogleCalendarCredentials(
  credentials?: IntegrationTestCredentials,
): Promise<IntegrationTestResult> {
  const draftClientId = credentials?.googleOAuthClientId?.trim();
  const draftClientSecret = credentials?.googleOAuthClientSecret?.trim();

  if (draftClientId || draftClientSecret) {
    if (!draftClientId || !draftClientSecret) {
      return failure("Enter both the client ID and client secret to test.");
    }
    return validateGoogleOAuthCredentialPair(draftClientId, draftClientSecret);
  }

  if (!isGoogleCalendarConfigured()) {
    return failure("Google OAuth credentials are not configured.");
  }

  const credentialsPath = getGoogleOAuthCredentialsPath();
  if (!credentialsPath) {
    return failure("Google OAuth credentials are not configured.");
  }

  try {
    const parsed = parseOAuthCredentialsJson(JSON.parse(readFileSync(credentialsPath, "utf8")));
    return validateGoogleOAuthCredentialPair(parsed.client_id, parsed.client_secret);
  } catch {
    return failure("Saved Google OAuth credentials could not be read.");
  }
}

function credentialOverrideForTarget(
  target: IntegrationTestTarget,
  credentials?: IntegrationTestCredentials,
): string | undefined {
  if (!credentials) return undefined;
  if (target === "cursor") return credentials.cursorApiKey;
  if (target === "linear") return credentials.linearApiKey;
  if (target === "gemini") return credentials.geminiApiKey;
  return undefined;
}

export async function runIntegrationTest(
  target: IntegrationTestTarget,
  credentials?: IntegrationTestCredentials,
): Promise<IntegrationTestResult> {
  if (target === "googleCalendarCredentials") {
    return testGoogleCalendarCredentials(credentials);
  }

  const override = credentialOverrideForTarget(target, credentials);
  if (target === "cursor") return testCursorIntegration(override);
  if (target === "linear") return testLinearIntegration(override);
  if (target === "gemini") return testGeminiIntegration(override);
  return testGoogleCalendarIntegration();
}

export async function runAllIntegrationTests(
  credentials?: IntegrationTestCredentials,
): Promise<IntegrationTestReport> {
  const entries = await Promise.all(
    INTEGRATION_TEST_TARGETS.map(
      async (target) => [target, await runIntegrationTest(target, credentials)] as const,
    ),
  );
  return Object.fromEntries(entries) as IntegrationTestReport;
}

export const INTEGRATION_TEST_TARGETS = [
  "cursor",
  "linear",
  "gemini",
  "googleCalendar",
] as const satisfies readonly IntegrationConnectTestTarget[];

export async function runIntegrationTests(
  target: IntegrationTestTarget | "all",
  credentials?: IntegrationTestCredentials,
): Promise<IntegrationTestReport | IntegrationTestResult> {
  if (target === "all") {
    return runAllIntegrationTests(credentials);
  }
  return runIntegrationTest(target, credentials);
}
