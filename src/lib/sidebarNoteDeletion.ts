import { isDailyVaultNotePath } from "./vaultNotePaths";

const SIDEBAR_SEARCH_INPUT_SELECTOR =
  ".vault-folder-explorer-search-input, .sidebar-explorer-search-input";

export type SidebarNoteDeletionRegistration = {
  openDeleteConfirm: () => void;
};

let registration: SidebarNoteDeletionRegistration | null = null;
let confirmOpen = false;

export function registerSidebarNoteDeletion(
  next: SidebarNoteDeletionRegistration,
): () => void {
  registration = next;
  return () => {
    if (registration === next) {
      registration = null;
    }
  };
}

export function triggerSidebarNoteDeletionRequest(): boolean {
  if (!registration) return false;
  registration.openDeleteConfirm();
  return true;
}

export function setSidebarNoteDeletionConfirmOpen(open: boolean): void {
  confirmOpen = open;
}

export function isSidebarNoteDeletionConfirmOpen(): boolean {
  return confirmOpen;
}

function isHtmlElement(target: EventTarget | null): target is HTMLElement {
  return (
    target !== null &&
    typeof target === "object" &&
    "tagName" in target &&
    typeof (target as HTMLElement).tagName === "string"
  );
}

export function isSidebarNoteDeletionShortcutBlocked(target: EventTarget | null): boolean {
  if (!isHtmlElement(target)) return false;
  if (target.isContentEditable) return true;

  const tag = target.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag === "INPUT") {
    return !target.matches(SIDEBAR_SEARCH_INPUT_SELECTOR);
  }

  return Boolean(target.closest('textarea, select, [contenteditable="true"]'));
}

export function isDeletableVaultDocumentPath(path: string): boolean {
  const normalized = path.trim().replace(/\\/g, "/");
  if (!normalized || !normalized.toLowerCase().endsWith(".md")) return false;
  if (isDailyVaultNotePath(normalized)) return false;
  const topFolder = normalized.split("/")[0] ?? "";
  return topFolder !== "Workouts";
}

export function resolveSidebarNoteDeletionTarget(focusedId: string | null): string | null {
  if (!focusedId) return null;
  if (!isDeletableVaultDocumentPath(focusedId)) return null;
  return focusedId;
}

export function vaultDocumentDisplayName(path: string, title?: string | null): string {
  const trimmedTitle = title?.trim();
  if (trimmedTitle) return trimmedTitle;
  const segments = path.trim().replace(/\\/g, "/").split("/");
  const fileName = segments[segments.length - 1] ?? path;
  return fileName.replace(/\.md$/i, "") || "Untitled";
}
