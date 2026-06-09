import { existsSync, writeFileSync } from "node:fs";
import { getTotemEnvPath } from "./config.ts";

const TOTEM_ENV_TEMPLATE = `# Whoop / Totem MCP tokens for BacksterOS Agent
# 1. Set your email (password is prompted once by \`totem auth\`)
WHOOP_EMAIL=

# 2. Run: npx -y @briangaoo/totem auth
# 3. Copy WHOOP_IOS_BEARER_TOKEN, WHOOP_COGNITO_REFRESH_TOKEN, WHOOP_USER_ID,
#    and WHOOP_INSTALLATION_ID from totem's .env into this file (or paste below)
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
    authCommand: "npx -y @briangaoo/totem auth",
    docsUrl: "https://github.com/briangaoo/totem#authentication",
  };
}
