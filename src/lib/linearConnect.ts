import { connectLinearOAuth, getHealth } from "./api";
import { openExternalUrl } from "./openExternalUrl";

export async function connectLinearOAuthAndWait(options?: {
  pollAttempts?: number;
  pollIntervalMs?: number;
}): Promise<{ connected: boolean; message?: string }> {
  const pollAttempts = options?.pollAttempts ?? 120;
  const pollIntervalMs = options?.pollIntervalMs ?? 2000;

  const { authUrl } = await connectLinearOAuth();
  await openExternalUrl(authUrl);

  for (let attempt = 0; attempt < pollAttempts; attempt += 1) {
    await new Promise((resolve) => window.setTimeout(resolve, pollIntervalMs));
    const health = await getHealth();
    if (health.hasLinearOAuthAuth) {
      return { connected: true };
    }
  }

  return {
    connected: false,
    message:
      "Browser sign-in started. Keep BacksterOS Agent open until the success page appears, then return here.",
  };
}
