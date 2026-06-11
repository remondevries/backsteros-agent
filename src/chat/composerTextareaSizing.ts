import { useCallback, useLayoutEffect, useRef, type RefObject } from "react";

export const COMPOSER_TEXTAREA_MAX_ROWS = 8;

export function resizeComposerTextarea(
  textarea: HTMLTextAreaElement,
  maxRows = COMPOSER_TEXTAREA_MAX_ROWS,
): void {
  const styles = getComputedStyle(textarea);
  const lineHeight = Number.parseFloat(styles.lineHeight) || 21;
  const paddingTop = Number.parseFloat(styles.paddingTop) || 0;
  const paddingBottom = Number.parseFloat(styles.paddingBottom) || 0;
  const minContentHeight = Number.parseFloat(styles.minHeight) || lineHeight;
  const singleLineHeight = Math.max(minContentHeight, lineHeight) + paddingTop + paddingBottom;
  const maxHeight = lineHeight * maxRows + paddingTop + paddingBottom;

  if (!textarea.value.trim()) {
    textarea.style.height = `${singleLineHeight}px`;
    textarea.style.overflowY = "hidden";
    return;
  }

  textarea.style.height = "auto";
  const nextHeight = Math.min(Math.max(textarea.scrollHeight, singleLineHeight), maxHeight);
  textarea.style.height = `${nextHeight}px`;
  textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
}

export function useComposerTextareaResize(
  textareaRef: RefObject<HTMLTextAreaElement | null>,
  value: string,
): () => void {
  const resizeFrameRef = useRef<number | null>(null);

  const syncComposerTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      resizeComposerTextarea(textarea);
    }
  }, [textareaRef]);

  useLayoutEffect(() => {
    if (resizeFrameRef.current != null) {
      window.cancelAnimationFrame(resizeFrameRef.current);
    }

    resizeFrameRef.current = window.requestAnimationFrame(() => {
      resizeFrameRef.current = null;
      syncComposerTextareaHeight();
    });

    return () => {
      if (resizeFrameRef.current != null) {
        window.cancelAnimationFrame(resizeFrameRef.current);
        resizeFrameRef.current = null;
      }
    };
  }, [value, syncComposerTextareaHeight]);

  return syncComposerTextareaHeight;
}
