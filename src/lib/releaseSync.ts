export function normalizeBuildSha(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === "unknown") {
    return null;
  }
  return trimmed;
}

export function formatBuildShaLabel(value: string | null | undefined): string {
  const normalized = normalizeBuildSha(value);
  if (!normalized) {
    return "unknown";
  }
  return normalized.slice(0, 7);
}

export function buildShasMatch(
  clientSha: string | null | undefined,
  serverSha: string | null | undefined,
): boolean {
  const client = normalizeBuildSha(clientSha);
  const server = normalizeBuildSha(serverSha);
  if (!client || !server) {
    return true;
  }
  if (client === server) {
    return true;
  }
  return client.startsWith(server) || server.startsWith(client);
}

export function getClientAppBuildSha(): string {
  return import.meta.env.VITE_APP_BUILD_SHA?.trim() || "unknown";
}

export function describeDesktopReleaseMismatch(
  clientSha: string | null | undefined,
  serverSha: string | null | undefined,
): string | null {
  if (buildShasMatch(clientSha, serverSha)) {
    return null;
  }

  return `Desktop UI (${formatBuildShaLabel(clientSha)}) is behind the server (${formatBuildShaLabel(serverSha)}). Rebuild the app from the deployed commit: npm run tauri:build`;
}
