import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef } from "react";
import { RunUiPreviewPanel } from "./dev/RunUiPreviewPanel";
import { AttachmentChip } from "./AttachmentChip";
import { filesFromClipboard } from "./attachments";
import { ComposerToolIndicators } from "./ComposerToolIndicators";
import { ModelModeToggle } from "./ModelModeToggle";
import { QuickActionsBar } from "./QuickActionsBar";
import type { QuickAction } from "./quickActions";
import { modelDisplayNameForMode } from "./modelMode";
import { TextVoiceToggle, type InputMode } from "./TextVoiceToggle";
import { TtsToggle } from "./TtsToggle";
import type { ToolPinSelection, ToolSelection } from "./tool-routing";
import type { ModelMode, PendingAttachment } from "./types";

export type ComposerHandle = {
  focus: () => void;
  blur: () => void;
  isFocused: () => boolean;
};

const MAX_TEXTAREA_ROWS = 8;

function resizeComposerTextarea(textarea: HTMLTextAreaElement) {
  const styles = getComputedStyle(textarea);
  const lineHeight = Number.parseFloat(styles.lineHeight) || 21;
  const paddingTop = Number.parseFloat(styles.paddingTop) || 0;
  const paddingBottom = Number.parseFloat(styles.paddingBottom) || 0;
  const maxHeight = lineHeight * MAX_TEXTAREA_ROWS + paddingTop + paddingBottom;

  textarea.style.height = "auto";
  const nextHeight = Math.min(textarea.scrollHeight, maxHeight);
  textarea.style.height = `${nextHeight}px`;
  textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
}

function ComposerSendIcon() {
  return (
    <svg className="composer-send-icon" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M8 12V4.5M5.25 7.75 8 4.5l2.75 3.25"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ComposerStopIcon() {
  return (
    <svg className="composer-send-icon" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="5" y="5" width="6" height="6" rx="1" fill="currentColor" />
    </svg>
  );
}

export const Composer = forwardRef<
  ComposerHandle,
  {
    value: string;
    onChange: (value: string) => void;
    onSend: () => void;
    onCancel?: () => void;
    running?: boolean;
    disabled?: boolean;
    attachments: PendingAttachment[];
    onAddAttachments: (files: File[]) => void;
    onRemoveAttachment: (id: string) => void;
    onOpenAttachment?: (attachment: PendingAttachment) => void;
    isDragging?: boolean;
    modelMode?: ModelMode;
    modelName?: string;
    onModelModeChange?: (mode: ModelMode) => void;
    savingModel?: boolean;
    uiPreview?: {
      open: boolean;
      onToggle: () => void;
    };
    tts?: {
      enabled: boolean;
      onToggle: () => void;
      supported: boolean;
    };
    textVoice?: {
      mode: InputMode;
      onChange: (mode: InputMode) => void;
      supported: boolean;
    };
    voiceMode?: boolean;
    toolIndicators?: ToolSelection;
    toolPins?: ToolPinSelection;
    onToggleToolPin?: (tool: keyof ToolSelection) => void;
    quickActions?: {
      disabled?: boolean;
      morningReviewUsageVersion?: number;
      onAction: (action: QuickAction) => void;
    };
    composerQuickAction?: {
      label: string;
      placeholder?: string;
      onClear: () => void;
      tagVariant?: "daily-capture" | "good-morning" | "good-night";
    };
    onActivateDailyCaptureShortcut?: () => void;
    onTriggerGoodMorningShortcut?: () => void;
    onTriggerGoodNightShortcut?: () => void;
    onEscapeBlur?: () => void;
    onComposerFocus?: () => void;
  }
>(function Composer(
  {
    value,
    onChange,
    onSend,
    onCancel,
    running = false,
    disabled,
    attachments,
    onAddAttachments,
    onRemoveAttachment,
    onOpenAttachment,
    isDragging,
    modelMode,
    modelName,
    onModelModeChange,
    savingModel,
    uiPreview,
    tts,
    textVoice,
    voiceMode = false,
    toolIndicators,
    toolPins,
    onToggleToolPin,
    quickActions,
    composerQuickAction,
    onActivateDailyCaptureShortcut,
    onTriggerGoodMorningShortcut,
    onTriggerGoodNightShortcut,
    onEscapeBlur,
    onComposerFocus,
  },
  ref,
) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!voiceMode) return;
    footerRef.current?.focus({ preventScroll: true });
  }, [voiceMode]);

  useEffect(() => {
    if (!voiceMode) return;
    const textarea = textareaRef.current;
    if (!textarea) return;

    function onFocusIn(event: FocusEvent) {
      const el = textareaRef.current;
      if (!el || event.target !== el) return;
      el.blur();
      footerRef.current?.focus({ preventScroll: true });
    }

    document.addEventListener("focusin", onFocusIn, true);
    return () => document.removeEventListener("focusin", onFocusIn, true);
  }, [voiceMode]);

  useImperativeHandle(
    ref,
    () => ({
      focus: () => {
        if (voiceMode) {
          footerRef.current?.focus({ preventScroll: true });
          return;
        }
        textareaRef.current?.focus();
      },
      blur: () => {
        textareaRef.current?.blur();
        footerRef.current?.blur();
      },
      isFocused: () => {
        const active = document.activeElement;
        const textarea = textareaRef.current;
        const footer = footerRef.current;
        return active === textarea || active === footer || Boolean(textarea?.contains(active));
      },
    }),
    [voiceMode],
  );

  function blurComposerInput() {
    textareaRef.current?.blur();
    footerRef.current?.blur();
  }

  function handleComposerEscape(event: React.KeyboardEvent) {
    event.preventDefault();
    event.stopPropagation();
    blurComposerInput();
    onEscapeBlur?.();
  }

  useLayoutEffect(() => {
    if (textareaRef.current) {
      resizeComposerTextarea(textareaRef.current);
    }
  }, [value]);

  const activeTools = toolIndicators ?? { obsidian: false, linear: false, calendar: false, whoop: false };
  const showFooter = Boolean(
    textVoice?.supported || (modelMode && onModelModeChange) || uiPreview,
  );
  const showReadAloudToggle = Boolean(tts?.supported && !textVoice?.supported);

  function handlePaste(event: React.ClipboardEvent<HTMLTextAreaElement>) {
    const files = filesFromClipboard(event.clipboardData);
    if (files.length === 0) return;
    event.preventDefault();
    onAddAttachments(files);
  }

  const resolvedModelName =
    modelName ?? (modelMode ? modelDisplayNameForMode(modelMode) : "");

  return (
    <div
      className={`composer ${isDragging ? "composer-dragging" : ""} ${voiceMode ? "composer-voice-layout" : ""}`}
    >
      {isDragging && !voiceMode && <div className="drop-overlay">Drop files to attach</div>}

      {uiPreview?.open && !voiceMode && (
        <RunUiPreviewPanel onClose={() => uiPreview.onToggle()} />
      )}

      <div
        className={`composer-slide-panel ${voiceMode ? "composer-slide-panel-hidden" : ""}`}
        aria-hidden={voiceMode}
      >
        <div className="composer-overlay">
          {attachments.length > 0 && (
            <div className="composer-attachments">
              {attachments.map((attachment) => (
                <AttachmentChip
                  key={attachment.id}
                  attachment={attachment}
                  onRemove={() => onRemoveAttachment(attachment.id)}
                  onOpen={
                    onOpenAttachment ? () => onOpenAttachment(attachment) : undefined
                  }
                />
              ))}
            </div>
          )}
        </div>

        <div className="composer-input-block composer-input-block-slide">
          {(quickActions || onToggleToolPin) && (
            <div className="composer-floating-controls">
              {onToggleToolPin && (
                <ComposerToolIndicators
                  tools={activeTools}
                  pins={toolPins}
                  onTogglePin={onToggleToolPin}
                />
              )}
              {quickActions && (
                <QuickActionsBar
                  composerText={value}
                  disabled={quickActions.disabled}
                  morningReviewUsageVersion={quickActions.morningReviewUsageVersion}
                  onAction={quickActions.onAction}
                />
              )}
            </div>
          )}

          <div className="composer-input-shell">
            <div className="composer-input-row">
              <button
                type="button"
                className="composer-icon-button composer-attach"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                aria-label="Attach files"
                title="Attach files"
              >
                <svg className="composer-attach-icon" viewBox="0 0 16 16" aria-hidden="true">
                  <path
                    d="M8 3.5v9M3.5 8h9"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>

              <textarea
                ref={textareaRef}
                className="composer-textarea"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                onPaste={handlePaste}
                onFocus={() => onComposerFocus?.()}
                placeholder={composerQuickAction?.placeholder ?? "Reply…"}
                rows={1}
                disabled={disabled || voiceMode}
                tabIndex={voiceMode ? -1 : 0}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    handleComposerEscape(event);
                    return;
                  }
                  if (
                    event.key === "Backspace" &&
                    composerQuickAction &&
                    value.length === 0
                  ) {
                    event.preventDefault();
                    composerQuickAction.onClear();
                    return;
                  }
                  if (
                    event.key === " " &&
                    onActivateDailyCaptureShortcut &&
                    /^\/dc$/i.test(value)
                  ) {
                    event.preventDefault();
                    onActivateDailyCaptureShortcut();
                    return;
                  }
                  if (
                    event.key === " " &&
                    onTriggerGoodMorningShortcut &&
                    /^\/gm$/i.test(value)
                  ) {
                    event.preventDefault();
                    onTriggerGoodMorningShortcut();
                    return;
                  }
                  if (
                    event.key === " " &&
                    onTriggerGoodNightShortcut &&
                    /^\/gn$/i.test(value)
                  ) {
                    event.preventDefault();
                    onTriggerGoodNightShortcut();
                    return;
                  }
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    onSend();
                  }
                }}
              />

              <div className="composer-right-rail">
                {showReadAloudToggle && tts && (
                  <TtsToggle
                    enabled={tts.enabled}
                    onToggle={tts.onToggle}
                    disabled={disabled}
                    compact
                  />
                )}
                <button
                  type="button"
                  className={`composer-icon-button composer-send ${running ? "composer-send-stop" : ""}`}
                  onClick={() => {
                    if (running) {
                      onCancel?.();
                      return;
                    }
                    onSend();
                  }}
                  disabled={!running && disabled}
                  aria-label={running ? "Stop message" : "Send message"}
                  title={running ? "Stop (Ctrl+C)" : "Send message"}
                >
                  {running ? <ComposerStopIcon /> : <ComposerSendIcon />}
                </button>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="composer-file-input"
              onChange={(event) => {
                const files = Array.from(event.target.files ?? []);
                if (files.length > 0) {
                  onAddAttachments(files);
                }
                event.target.value = "";
              }}
            />
          </div>
        </div>
      </div>

      {showFooter && (
        <div
          className="composer-footer-bar"
          ref={footerRef}
          tabIndex={voiceMode ? -1 : undefined}
          aria-label={voiceMode ? "Voice mode controls" : undefined}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              handleComposerEscape(event);
            }
          }}
        >
          <div className="composer-footer-start">
            {modelMode && onModelModeChange && (
              <ModelModeToggle
                mode={modelMode}
                onChange={onModelModeChange}
                disabled={disabled || savingModel}
              />
            )}
            {modelMode && (
              <span className="composer-model-name">{resolvedModelName}</span>
            )}
          </div>
          <div className="composer-footer-end">
            {!voiceMode && uiPreview && (
              <button
                type="button"
                className={`run-ui-preview-toggle ${uiPreview.open ? "active" : ""}`}
                onClick={uiPreview.onToggle}
                title="Toggle run UI preview (Cmd+Shift+L)"
              >
                UI preview
              </button>
            )}
            {textVoice?.supported && (
              <TextVoiceToggle
                mode={textVoice.mode}
                onChange={textVoice.onChange}
                disabled={disabled}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
});
