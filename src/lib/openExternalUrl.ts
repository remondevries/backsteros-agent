import {
  buildObsidianUri,
  isOpenableExternalUrl,
} from "./obsidianUri";
import {
  isLinearAppUrl,
  isLinearOAuthUrl,
  isLinearWebUrl,
  resolveLinearOpenUrl,
} from "./linear/linearLink";

export {
  buildObsidianUri,
  getVaultName,
  isObsidianUrl,
  isOpenableExternalUrl,
  linkifyWikilinks,
  parseObsidianUrl,
} from "./obsidianUri";

export async function openLocalFile(path: string): Promise<void> {
  const normalized = path.replace(/\\/g, "/");
  const url = normalized.startsWith("file://") ? normalized : `file://${normalized}`;

  try {
    const { open } = await import("@tauri-apps/plugin-shell");
    await open(url);
    return;
  } catch {
    // Browser dev mode or non-Tauri shell.
  }

  window.open(url, "_blank", "noopener,noreferrer");
}

export async function openExternalUrl(url: string): Promise<void> {
  const trimmed = url.trim();
  const targetUrl =
    isLinearOAuthUrl(trimmed) || !isLinearWebUrl(trimmed)
      ? trimmed
      : resolveLinearOpenUrl(trimmed);
  if (!isOpenableExternalUrl(targetUrl) && !isLinearAppUrl(targetUrl)) return;

  try {
    const { open } = await import("@tauri-apps/plugin-shell");
    await open(targetUrl);
    return;
  } catch {
    // Browser dev mode or non-Tauri shell.
  }

  window.open(targetUrl, "_blank", "noopener,noreferrer");
}

export async function openObsidianNote(vaultName: string, filePath: string): Promise<void> {
  await openExternalUrl(buildObsidianUri(vaultName, filePath));
}
