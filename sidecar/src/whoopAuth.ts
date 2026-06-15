import { existsSync, writeFileSync } from "node:fs";
import { getTotemEnvPath } from "./config.ts";

const TOTEM_ENV_TEMPLATE = `# Whoop / Totem tokens for BacksterOS Agent
# Sign in via Settings → Whoop (email + password), or paste tokens manually below.
WHOOP_EMAIL=
WHOOP_IOS_BEARER_TOKEN=
WHOOP_COGNITO_REFRESH_TOKEN=
WHOOP_USER_ID=
WHOOP_INSTALLATION_ID=

# Optional IANA timezone (e.g. Europe/Amsterdam). Leave blank for auto-detect.
# WHOOP_TIMEZONE=
`;

export function ensureTotemEnvTemplate(): string {
  const path = getTotemEnvPath();
  if (!existsSync(path)) {
    writeFileSync(path, TOTEM_ENV_TEMPLATE, { mode: 0o600 });
  }
  return path;
}

export function getWhoopSetupInfo() {
  const envPath = ensureTotemEnvTemplate();
  return {
    envPath,
    docsUrl: "https://github.com/briangaoo/totem#authentication",
  };
}
