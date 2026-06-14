import { openExternalUrl } from "./openExternalUrl";
import { pushNotification } from "./notifications";

export function buildLinearIssueCursorLink(input: {
  url: string;
  branchName?: string | null;
}): string {
  const branch = input.branchName?.trim();
  if (branch) {
    return `cursor://vscode.git/checkout?ref=${encodeURIComponent(branch)}`;
  }

  return input.url.trim();
}

export async function openLinearIssueInCursor(input: {
  url: string;
  branchName?: string | null;
}): Promise<void> {
  await openExternalUrl(buildLinearIssueCursorLink(input));
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  const trimmed = text.trim();
  if (!trimmed) return false;

  try {
    await navigator.clipboard.writeText(trimmed);
    return true;
  } catch {
    return false;
  }
}

export async function copyTextToClipboardWithNotification(
  text: string,
  notification: {
    message: string;
    issueId?: string;
  },
): Promise<boolean> {
  const copied = await copyTextToClipboard(text);
  if (!copied) {
    pushNotification({
      kind: "error",
      title: "Could not access the clipboard.",
      issueId: notification.issueId,
      durationMs: 4000,
      variant: "clipboard",
    });
    return false;
  }

  pushNotification({
    kind: "info",
    title: notification.message,
    issueId: notification.issueId,
    durationMs: 3000,
    variant: "clipboard",
  });
  return true;
}
