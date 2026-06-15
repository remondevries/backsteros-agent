import { useEffect } from "react";

function isOptionCommandShortcut(event: KeyboardEvent): boolean {
  return event.metaKey && event.altKey && !event.ctrlKey && !event.shiftKey;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
}

function isComposerShortcutTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && Boolean(target.closest(".composer"));
}

function isShortcutBlockedTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    Boolean(
      target.closest(
        ".session-tab-rename-input, .attachment-modal-backdrop, .letter-modal-backdrop",
      ),
    )
  );
}

export function cycleBinaryContentMode<T extends string>(
  mode: T,
  modes: readonly [T, T],
  direction: "previous" | "next",
): T {
  const currentIndex = modes.indexOf(mode);
  const safeIndex = currentIndex >= 0 ? currentIndex : 0;
  const offset = direction === "next" ? 1 : -1;
  const nextIndex = (safeIndex + offset + modes.length) % modes.length;
  return modes[nextIndex]!;
}

export function useBinaryContentModeShortcuts<T extends string>({
  enabled,
  mode,
  modes,
  onChange,
}: {
  enabled: boolean;
  mode: T;
  modes: readonly [T, T];
  onChange: (mode: T) => void;
}) {
  useEffect(() => {
    if (!enabled) return undefined;

    function onKeyDown(event: KeyboardEvent) {
      if (!isOptionCommandShortcut(event)) return;
      if (isEditableTarget(event.target)) return;
      if (isComposerShortcutTarget(event.target)) return;
      if (isShortcutBlockedTarget(event.target)) return;

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        event.stopImmediatePropagation();
        onChange(cycleBinaryContentMode(mode, modes, "previous"));
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        event.stopImmediatePropagation();
        onChange(cycleBinaryContentMode(mode, modes, "next"));
      }
    }

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [enabled, mode, modes, onChange]);
}
