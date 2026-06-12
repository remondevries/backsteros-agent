import type { ActiveLinearIssue, ActiveVaultDocument } from "../app/contentPanelNavigation";

export type ChatFocusContentSnapshot =
  | {
      kind: "linear_issue";
      description: string | null;
    }
  | {
      kind: "vault_document";
      title: string;
      body: string;
    };

export type ChatFocusContext =
  | {
      kind: "linear_issue";
      issueId: string;
      identifier: string;
      title: string;
      description?: string | null;
    }
  | {
      kind: "vault_document";
      path: string;
      title: string;
      body?: string;
    };

export function buildChatFocusContext(options: {
  activeLinearIssue: ActiveLinearIssue | null;
  activeVaultDocument: ActiveVaultDocument | null;
  focusContentSnapshot: ChatFocusContentSnapshot | null;
}): ChatFocusContext | null {
  const { activeLinearIssue, activeVaultDocument, focusContentSnapshot } = options;

  if (activeVaultDocument) {
    const snapshot =
      focusContentSnapshot?.kind === "vault_document" ? focusContentSnapshot : null;
    return {
      kind: "vault_document",
      path: activeVaultDocument.path,
      title: snapshot?.title ?? activeVaultDocument.title,
      body: snapshot?.body,
    };
  }

  if (activeLinearIssue) {
    const snapshot =
      focusContentSnapshot?.kind === "linear_issue" ? focusContentSnapshot : null;
    return {
      kind: "linear_issue",
      issueId: activeLinearIssue.id,
      identifier: activeLinearIssue.identifier,
      title: activeLinearIssue.title,
      description: snapshot?.description,
    };
  }

  return null;
}

export function chatFocusContextLabel(context: ChatFocusContext): string {
  if (context.kind === "linear_issue") {
    return `${context.identifier} ${context.title}`;
  }
  return context.title;
}
