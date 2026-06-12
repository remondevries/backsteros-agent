import type { ActiveLinearDocument, ActiveLinearIssue, ActiveVaultDocument } from "../app/contentPanelNavigation";
import type { LinearWorkspaceSelection } from "../app/linearWorkspaceSelection";
import {
  defaultLinearWorkspaceViewId,
  linearWorkspaceViewLabel,
  type LinearWorkspaceViewId,
} from "../app/linearProjectViews";

export type ChatFocusContentSnapshot =
  | {
      kind: "linear_issue";
      description: string | null;
    }
  | {
      kind: "linear_document";
      title: string;
      content: string;
    }
  | {
      kind: "vault_document";
      title: string;
      body: string;
    }
  | {
      kind: "linear_workspace";
      summary: string | null;
      description: string | null;
    };

export type ComposerContextItem = {
  id: string;
  label: string;
  status?: string;
  stateType?: string;
  issueIdentifier?: string;
  issueTitle?: string;
};

export type ChatFocusContext =
  | {
      kind: "linear_issue";
      issueId: string;
      identifier: string;
      title: string;
      description?: string | null;
      status?: string;
      stateType?: string;
    }
  | {
      kind: "linear_document";
      documentId: string;
      title: string;
      projectId?: string;
      content?: string;
    }
  | {
      kind: "vault_document";
      path: string;
      title: string;
      body?: string;
    }
  | {
      kind: "linear_workspace";
      workspaceKind: "team" | "project";
      workspaceId: string;
      name: string;
      view: LinearWorkspaceViewId;
      summary?: string | null;
      description?: string | null;
    };

export function buildChatFocusContext(options: {
  activeLinearIssue: ActiveLinearIssue | null;
  activeLinearDocument: ActiveLinearDocument | null;
  activeVaultDocument: ActiveVaultDocument | null;
  linearSelection: LinearWorkspaceSelection | null;
  linearWorkspaceView: LinearWorkspaceViewId | null;
  focusContentSnapshot: ChatFocusContentSnapshot | null;
}): ChatFocusContext | null {
  const {
    activeLinearIssue,
    activeLinearDocument,
    activeVaultDocument,
    linearSelection,
    linearWorkspaceView,
    focusContentSnapshot,
  } = options;

  if (activeLinearIssue) {
    const snapshot =
      focusContentSnapshot?.kind === "linear_issue" ? focusContentSnapshot : null;
    return {
      kind: "linear_issue",
      issueId: activeLinearIssue.id,
      identifier: activeLinearIssue.identifier,
      title: activeLinearIssue.title,
      description: snapshot?.description,
      status: activeLinearIssue.status,
      stateType: activeLinearIssue.stateType,
    };
  }

  if (activeLinearDocument) {
    const snapshot =
      focusContentSnapshot?.kind === "linear_document" ? focusContentSnapshot : null;
    return {
      kind: "linear_document",
      documentId: activeLinearDocument.id,
      title: snapshot?.title ?? activeLinearDocument.title,
      projectId: activeLinearDocument.projectId,
      content: snapshot?.content,
    };
  }

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

  if (linearSelection) {
    const snapshot =
      focusContentSnapshot?.kind === "linear_workspace" ? focusContentSnapshot : null;
    const view =
      linearWorkspaceView ?? defaultLinearWorkspaceViewId(linearSelection.kind);
    return {
      kind: "linear_workspace",
      workspaceKind: linearSelection.kind,
      workspaceId: linearSelection.id,
      name: linearSelection.name,
      view,
      summary: snapshot?.summary,
      description: snapshot?.description,
    };
  }

  return null;
}

export function chatFocusContextLabel(context: ChatFocusContext): string {
  if (context.kind === "linear_issue") {
    return `${context.identifier} ${context.title}`;
  }
  if (context.kind === "linear_document") {
    return context.title;
  }
  if (context.kind === "vault_document") {
    return context.title;
  }
  const viewLabel = linearWorkspaceViewLabel(context.workspaceKind, context.view);
  return `${context.name} · ${viewLabel}`;
}

export function composerContextItems(context: ChatFocusContext): ComposerContextItem[] {
  if (context.kind === "linear_issue") {
    return [
      {
        id: context.issueId,
        label: `${context.identifier} · ${context.title}`,
        issueIdentifier: context.identifier,
        issueTitle: context.title,
        status: context.status,
        stateType: context.stateType,
      },
    ];
  }
  if (context.kind === "linear_document") {
    return [{ id: context.documentId, label: context.title }];
  }
  if (context.kind === "vault_document") {
    return [{ id: context.path, label: context.title }];
  }
  const viewLabel = linearWorkspaceViewLabel(context.workspaceKind, context.view);
  return [{ id: context.workspaceId, label: `${context.name} · ${viewLabel}` }];
}

export function isChatFocusContextLoading(
  context: ChatFocusContext,
  snapshot: ChatFocusContentSnapshot | null,
): boolean {
  if (context.kind === "linear_issue") {
    return snapshot?.kind !== "linear_issue";
  }
  if (context.kind === "linear_document") {
    return snapshot?.kind !== "linear_document";
  }
  if (context.kind === "vault_document") {
    return snapshot?.kind !== "vault_document";
  }
  if (context.workspaceKind === "team") {
    return false;
  }
  return snapshot?.kind !== "linear_workspace";
}

export function composerPlaceholderForFocus(
  context: ChatFocusContext | null,
  agent: "cursor" | "linear",
): string | undefined {
  if (!context) return undefined;
  if (agent === "linear") {
    if (context.kind === "linear_issue") return "Ask about this issue…";
    if (context.kind === "linear_document") return "Ask about this document…";
    if (context.kind === "vault_document") return "Ask about this document…";
    return "Ask Linear…";
  }
  if (context.kind === "linear_workspace") return "Ask about this project…";
  if (context.kind === "linear_issue") return "Ask about this issue…";
  if (context.kind === "linear_document") return "Ask about this document…";
  if (context.kind === "vault_document") return "Ask about this document…";
  return undefined;
}
