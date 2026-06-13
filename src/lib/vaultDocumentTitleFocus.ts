import { focusPageTiptapEditor } from "./tiptapEditorFocus";

export type VaultDocumentTitleFocusRegistration = {
  focusTitle: () => void;
};

let registration: VaultDocumentTitleFocusRegistration | null = null;

export function registerVaultDocumentTitleFocus(
  next: VaultDocumentTitleFocusRegistration,
): () => void {
  registration = next;
  return () => {
    if (registration === next) {
      registration = null;
    }
  };
}

export function focusVaultDocumentTitle(): boolean {
  if (!registration) return false;
  registration.focusTitle();
  return true;
}

export function focusVaultDocumentBodyEditor(): boolean {
  return focusPageTiptapEditor();
}

export function handleVaultDocumentTitleEnter(
  event: React.KeyboardEvent<HTMLInputElement>,
): void {
  if (event.key !== "Enter" || event.nativeEvent.isComposing) return;

  event.preventDefault();
  event.currentTarget.blur();
  focusVaultDocumentBodyEditor();
}
