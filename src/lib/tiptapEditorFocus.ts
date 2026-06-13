export type TiptapEditorFocusRegistration = {
  id: string;
  getDom: () => HTMLElement;
  focus: () => boolean;
  isFocused: () => boolean;
  blur: () => void;
};

let registrations: TiptapEditorFocusRegistration[] = [];
let previousFocusElement: HTMLElement | null = null;
let restoreOnEscape = false;
let suppressBlurClear = false;

function isVisibleEditorDom(dom: HTMLElement): boolean {
  return dom.isConnected && dom.offsetParent !== null;
}

function isRestorableFocusTarget(element: HTMLElement): boolean {
  if (typeof document !== "undefined") {
    if (element === document.body || element === document.documentElement) return false;
  }
  return element.isConnected;
}

function asRestorableFocusTarget(active: Element | null | undefined): HTMLElement | null {
  if (!active || typeof active !== "object") return null;
  const candidate = active as HTMLElement;
  if (typeof candidate.focus !== "function") return null;
  if (!isRestorableFocusTarget(candidate)) return null;
  return candidate;
}

function pickActiveRegistration(): TiptapEditorFocusRegistration | null {
  const visible = registrations.filter((registration) =>
    isVisibleEditorDom(registration.getDom()),
  );
  if (visible.length === 0) return null;

  const preferred = visible.find((registration) =>
    registration.getDom().closest(
      ".content-panel-main, .linear-issue-layout, .vault-document-scroll, .project-overview",
    ),
  );
  return preferred ?? visible[visible.length - 1] ?? null;
}

export function registerTiptapEditorFocus(
  registration: TiptapEditorFocusRegistration,
): () => void {
  registrations = [...registrations.filter((entry) => entry.id !== registration.id), registration];
  return () => {
    registrations = registrations.filter((entry) => entry.id !== registration.id);
  };
}

export function clearTiptapEditorFocusRestore(): void {
  previousFocusElement = null;
  restoreOnEscape = false;
}

export function shouldRestoreTiptapEditorFocus(): boolean {
  if (!restoreOnEscape) return false;
  const registration = pickActiveRegistration();
  return registration?.isFocused() ?? false;
}

export function focusPageTiptapEditor(): boolean {
  const registration = pickActiveRegistration();
  if (!registration) return false;

  if (registration.isFocused()) {
    return true;
  }

  const active =
    typeof document !== "undefined" ? document.activeElement : null;
  const restorableActive = asRestorableFocusTarget(active);
  if (restorableActive) {
    previousFocusElement = restorableActive;
  } else {
    previousFocusElement = null;
  }
  restoreOnEscape = true;

  return registration.focus();
}

export function restoreTiptapEditorFocus(): boolean {
  if (!restoreOnEscape) return false;

  const registration = pickActiveRegistration();
  if (!registration?.isFocused()) return false;

  const target = previousFocusElement;

  suppressBlurClear = true;
  registration.blur();
  suppressBlurClear = false;

  clearTiptapEditorFocusRestore();

  if (target && isRestorableFocusTarget(target)) {
    target.focus({ preventScroll: true });
  }

  return true;
}

export function handleTiptapEditorFocusBlur(): void {
  if (suppressBlurClear) return;
  clearTiptapEditorFocusRestore();
}

/** @internal Test helper */
export function resetTiptapEditorFocusStateForTests(): void {
  registrations = [];
  previousFocusElement = null;
  restoreOnEscape = false;
  suppressBlurClear = false;
}
