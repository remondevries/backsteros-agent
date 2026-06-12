import { openExternalUrl } from "./openExternalUrl";

export async function openLinearIssueInCursor(input: {
  url: string;
  branchName?: string | null;
}): Promise<void> {
  const branch = input.branchName?.trim();
  if (branch) {
    await openExternalUrl(`cursor://vscode.git/checkout?ref=${encodeURIComponent(branch)}`);
    return;
  }

  await openExternalUrl(input.url);
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
