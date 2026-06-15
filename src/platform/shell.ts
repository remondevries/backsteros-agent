import {
  buildObsidianUri,
  isOpenableExternalUrl,
} from "../lib/obsidianUri";
import {
  isLinearAppUrl,
  isLinearOAuthUrl,
  isLinearWebUrl,
  resolveLinearOpenUrl,
} from "../lib/linear/linearLink";
import { isTauriRuntime } from "./runtime";

export async function openLocalFile(path: string): Promise<void> {
  const normalized = path.replace(/\\/g, "/");
  const url = normalized.startsWith("file://") ? normalized : `file://${normalized}`;

  if (isTauriRuntime()) {
    try {
      const { open } = await import("@tauri-apps/plugin-shell");
      await open(url);
      return;
    } catch {
      // Fall through to browser handling.
    }
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

  if (isTauriRuntime()) {
    try {
      const { open } = await import("@tauri-apps/plugin-shell");
      await open(targetUrl);
      return;
    } catch {
      // Fall through to browser handling.
    }
  }

  window.open(targetUrl, "_blank", "noopener,noreferrer");
}

export async function openObsidianNote(vaultName: string, filePath: string): Promise<void> {
  await openExternalUrl(buildObsidianUri(vaultName, filePath));
}
