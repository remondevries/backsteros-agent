import type { ActiveLinearDocument, ActiveLinearIssue, ActiveVaultDocument, ActiveVaultFolder } from "../app/contentPanelNavigation";
import type { LinearWorkspaceSelection } from "../app/linearWorkspaceSelection";
import {
  defaultLinearWorkspaceViewId,
  linearWorkspaceViewLabel,
  type LinearWorkspaceViewId,
} from "../app/linearProjectViews";
import { vaultNavItemIdFromPath } from "../command-palette/vaultNavFromPath";
import type { VaultNavItemId } from "./vaultNavFolders";
import {
  vaultFolderPathFromDocumentPath,
  vaultFolderTitle,
} from "./vaultFolderContext";

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

export type ComposerContextVaultBreadcrumb = {
  folderPath: string;
  folderName: string;
  navItemId: VaultNavItemId | null;
  documentTitle?: string;
};

export type ComposerContextItem = {
  id: string;
  label: string;
  status?: string;
  stateType?: string;
  issueIdentifier?: string;
  issueTitle?: string;
  vaultBreadcrumb?: ComposerContextVaultBreadcrumb;
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
      kind: "vault_folder";
      path: string;
      name: string;
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
  activeVaultFolder: ActiveVaultFolder | null;
  vaultChatContextOverride?: ActiveVaultFolder | null;
  linearSelection: LinearWorkspaceSelection | null;
  linearWorkspaceView: LinearWorkspaceViewId | null;
  focusContentSnapshot: ChatFocusContentSnapshot | null;
}): ChatFocusContext | null {
  const {
    activeLinearIssue,
    activeLinearDocument,
    activeVaultDocument,
    activeVaultFolder,
    vaultChatContextOverride = null,
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

  if (vaultChatContextOverride) {
    return {
      kind: "vault_folder",
      path: vaultChatContextOverride.path,
      name: vaultChatContextOverride.title,
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

  if (activeVaultFolder) {
    return {
      kind: "vault_folder",
      path: activeVaultFolder.path,
      name: activeVaultFolder.title,
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
  if (context.kind === "vault_folder") {
    return `${context.name} folder`;
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
    const folderPath = vaultFolderPathFromDocumentPath(context.path);
    const folderName = vaultFolderTitle(folderPath);
    return [
      {
        id: context.path,
        label: context.title,
        vaultBreadcrumb: {
          folderPath,
          folderName,
          navItemId: vaultNavItemIdFromPath(folderPath),
          documentTitle: context.title,
        },
      },
    ];
  }
  if (context.kind === "vault_folder") {
    return [
      {
        id: context.path,
        label: context.name,
        vaultBreadcrumb: {
          folderPath: context.path,
          folderName: context.name,
          navItemId: vaultNavItemIdFromPath(context.path),
        },
      },
    ];
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
  if (context.kind === "vault_folder") {
    return false;
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
    if (context.kind === "vault_folder") return "Ask about this folder…";
    return "Ask Linear…";
  }
  if (context.kind === "linear_workspace") return "Ask about this project…";
  if (context.kind === "linear_issue") return "Ask about this issue…";
  if (context.kind === "linear_document") return "Ask about this document…";
  if (context.kind === "vault_document") return "Ask about this document…";
  if (context.kind === "vault_folder") return "Ask about this folder…";
  return undefined;
}
