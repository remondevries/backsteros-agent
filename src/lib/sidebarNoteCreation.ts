const SIDEBAR_SEARCH_INPUT_SELECTOR =
  ".vault-folder-explorer-search-input, .sidebar-explorer-search-input";

export type SidebarNoteCreationRegistration = {
  createNote: () => void;
};

let registration: SidebarNoteCreationRegistration | null = null;

export function registerSidebarNoteCreation(
  next: SidebarNoteCreationRegistration,
): () => void {
  registration = next;
  return () => {
    if (registration === next) {
      registration = null;
    }
  };
}

export function triggerSidebarNoteCreation(): boolean {
  if (!registration) return false;
  registration.createNote();
  return true;
}

function isHtmlElement(target: EventTarget | null): target is HTMLElement {
  return (
    target !== null &&
    typeof target === "object" &&
    "tagName" in target &&
    typeof (target as HTMLElement).tagName === "string"
  );
}

export function isSidebarNoteCreationShortcutBlocked(target: EventTarget | null): boolean {
  if (!isHtmlElement(target)) return false;
  if (target.isContentEditable) return true;

  const tag = target.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag === "INPUT") {
    return !target.matches(SIDEBAR_SEARCH_INPUT_SELECTOR);
  }

  return Boolean(target.closest('textarea, select, [contenteditable="true"]'));
}
