const RIGHT_PANEL_COMPOSER_SELECTOR =
  ".right-side-panel-chat textarea.composer-textarea:not([disabled])";

export type RightPanelComposerFocusRegistration = {
  focusComposer: () => void;
};

let registration: RightPanelComposerFocusRegistration | null = null;
let pendingFocus = false;
let focusAttemptId = 0;

function isRightPanelChatMounted(): boolean {
  return document.querySelector(".right-side-panel-chat") instanceof HTMLElement;
}

function isRightPanelChatVisible(): boolean {
  const chat = document.querySelector(".right-side-panel-chat");
  if (!(chat instanceof HTMLElement)) return false;

  if (chat.closest(".app-resizable-panel-collapsed")) return false;
  if (chat.closest("aside[hidden]")) return false;

  return true;
}

function focusRightPanelComposerElement(): boolean {
  if (!isRightPanelChatVisible()) return false;

  const textarea = document.querySelector(RIGHT_PANEL_COMPOSER_SELECTOR);
  if (!(textarea instanceof HTMLTextAreaElement)) return false;

  textarea.focus({ preventScroll: true });
  return document.activeElement === textarea;
}

function tryFocusRightPanelComposer(): boolean {
  registration?.focusComposer();

  if (focusRightPanelComposerElement()) {
    return true;
  }

  const active = document.activeElement;
  return Boolean(active?.closest(".right-side-panel-chat .composer"));
}

function runPendingFocusAttempts(attemptId: number, attempt = 0): void {
  if (!pendingFocus || attemptId !== focusAttemptId) return;

  if (tryFocusRightPanelComposer()) {
    pendingFocus = false;
    return;
  }

  if (attempt >= 12) {
    pendingFocus = false;
    return;
  }

  const delayMs = attempt < 2 ? 0 : attempt < 5 ? 16 : 50;
  window.setTimeout(() => {
    runPendingFocusAttempts(attemptId, attempt + 1);
  }, delayMs);
}

export function registerRightPanelComposerFocus(
  next: RightPanelComposerFocusRegistration,
): () => void {
  registration = next;

  if (pendingFocus) {
    runPendingFocusAttempts(focusAttemptId);
  }

  return () => {
    if (registration === next) {
      registration = null;
    }
  };
}

export function getRightPanelComposerFocusRegistration(): RightPanelComposerFocusRegistration | null {
  return registration;
}

export function requestRightPanelComposerFocus(): void {
  pendingFocus = true;
  focusAttemptId += 1;
  const attemptId = focusAttemptId;
  runPendingFocusAttempts(attemptId);
}

export function scheduleRightPanelComposerFocus(): boolean {
  requestRightPanelComposerFocus();
  return isRightPanelChatMounted() || registration !== null;
}

export function clearRightPanelComposerFocusState(): void {
  pendingFocus = false;
  focusAttemptId += 1;
}
