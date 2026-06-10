import {
  forwardRef,
  useImperativeHandle,
  useRef,
  type TextareaHTMLAttributes,
} from "react";
import { useComposerTextareaResize } from "./composerTextareaSizing";

export const ComposerTextarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { value: string }
>(function ComposerTextarea({ value, className, onFocus, onBlur, ...props }, ref) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const syncComposerTextareaHeight = useComposerTextareaResize(textareaRef, value);

  useImperativeHandle(ref, () => textareaRef.current as HTMLTextAreaElement);

  const isIdle = value.trim().length === 0;

  return (
    <textarea
      ref={textareaRef}
      className={[
        "composer-textarea",
        isIdle ? "composer-textarea--idle" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      value={value}
      rows={1}
      onFocus={(event) => {
        syncComposerTextareaHeight();
        onFocus?.(event);
      }}
      onBlur={(event) => {
        syncComposerTextareaHeight();
        onBlur?.(event);
      }}
      {...props}
    />
  );
});
