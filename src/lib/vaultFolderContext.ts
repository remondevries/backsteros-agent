import type { ChatFocusContext } from "./chatFocusContext";

export function vaultFolderTitle(path: string): string {
  const parts = path.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? path;
}

export function parentVaultFolderPath(folderPath: string): string | null {
  const parts = folderPath.split("/").filter(Boolean);
  if (parts.length <= 1) return null;
  parts.pop();
  return parts.join("/");
}

export function vaultFolderPathFromDocumentPath(documentPath: string): string {
  const parts = documentPath.split("/").filter(Boolean);
  parts.pop();
  return parts.join("/");
}

export function canWidenVaultChatContext(context: ChatFocusContext): boolean {
  if (context.kind === "vault_document") return true;
  if (context.kind === "vault_folder") {
    return parentVaultFolderPath(context.path) !== null;
  }
  return false;
}

export function vaultChatContextGoUpLabel(context: ChatFocusContext): string {
  if (context.kind === "vault_document") {
    const folderPath = vaultFolderPathFromDocumentPath(context.path);
    return `${vaultFolderTitle(folderPath)} folder`;
  }
  if (context.kind === "vault_folder") {
    const parent = parentVaultFolderPath(context.path);
    return parent ? `${vaultFolderTitle(parent)} folder` : "Parent folder";
  }
  return "Folder";
}

export function resolveVaultChatContextGoUpTarget(
  context: ChatFocusContext,
): { path: string; title: string } | null {
  if (context.kind === "vault_document") {
    const path = vaultFolderPathFromDocumentPath(context.path);
    return { path, title: vaultFolderTitle(path) };
  }
  if (context.kind === "vault_folder") {
    const parent = parentVaultFolderPath(context.path);
    if (!parent) return null;
    return { path: parent, title: vaultFolderTitle(parent) };
  }
  return null;
}
