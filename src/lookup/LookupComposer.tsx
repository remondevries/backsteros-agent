import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { AttachmentChip } from "../chat/AttachmentChip";
import { ComposerTextarea } from "../chat/ComposerTextarea";
import { filesFromClipboard } from "../chat/attachments";
import { SlashCommandMenu } from "../chat/SlashCommandMenu";
import {
  filterSlashCommands,
  isSlashCommandPaletteOpen,
  parseSlashCommandInput,
  type SlashCommandDefinition,
} from "../chat/slashCommands";
import type { PendingAttachment } from "../chat/types";
import { TextVoiceToggle, type InputMode } from "../chat/TextVoiceToggle";
import { TtsToggle } from "../chat/TtsToggle";
import { LookupComposerOptionsMenu } from "./LookupComposerOptionsMenu";
import { LookupDepthToggle } from "./LookupDepthToggle";
import { lookupDepthModelName, type LookupDepthMode } from "./lookupDepth";
import type { LookupOutputFormat } from "./lookupOutputFormat";
import type { LookupSearchMode } from "./lookupSearchMode";

export type LookupComposerHandle = {
  focus: () => void;
  blur: () => void;
};

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

export const LookupComposer = forwardRef<
  LookupComposerHandle,
  {
    value: string;
    onChange: (value: string) => void;
    onSend: () => void;
    onCancel?: () => void;
    running?: boolean;
    disabled?: boolean;
    placeholder?: string;
    attachments?: PendingAttachment[];
    onAddAttachments?: (files: File[]) => void;
    onRemoveAttachment?: (id: string) => void;
    onOpenAttachment?: (attachment: PendingAttachment) => void;
    isDragging?: boolean;
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
    lookupDepth?: {
      mode: LookupDepthMode;
      onChange: (mode: LookupDepthMode) => void;
    };
    lookupSearchMode?: {
      mode: LookupSearchMode;
      onChange: (mode: LookupSearchMode) => void;
    };
    lookupOutputFormat?: {
      format: LookupOutputFormat;
      onChange: (format: LookupOutputFormat) => void;
    };
    onSlashCommandSelect?: (command: SlashCommandDefinition) => void;
  }
>(function LookupComposer(
  {
    value,
    onChange,
    onSend,
    onCancel,
    running = false,
    disabled = false,
    placeholder,
    attachments = [],
    onAddAttachments,
    onRemoveAttachment,
    onOpenAttachment,
    isDragging = false,
    tts,
    textVoice,
    voiceMode = false,
    lookupDepth,
    lookupSearchMode,
    lookupOutputFormat,
    onSlashCommandSelect,
  },
  ref,
) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const [slashSelectedIndex, setSlashSelectedIndex] = useState(0);
  const canSend = value.trim().length > 0 || attachments.length > 0;

  const slashMenuEnabled = Boolean(!voiceMode && !disabled && onSlashCommandSelect);

  const slashCommands = useMemo(() => {
    if (!slashMenuEnabled) return [];
    const slashState = parseSlashCommandInput(value);
    if (!slashState) return [];
    return filterSlashCommands(slashState.query, { context: "lookup" });
  }, [slashMenuEnabled, value]);

  const slashMenuOpen = isSlashCommandPaletteOpen(value, {
    enabled: slashMenuEnabled,
    context: "lookup",
  });

  useEffect(() => {
    setSlashSelectedIndex(0);
  }, [value, slashCommands.length]);

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
    }),
    [voiceMode],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Enter" || event.shiftKey || event.metaKey || event.ctrlKey) return;
      if (document.activeElement !== textareaRef.current) return;
      event.preventDefault();
      if (!disabled && !running && canSend) {
        onSend();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canSend, disabled, onSend, running]);

  const showOptionsMenu = Boolean(
    onAddAttachments && lookupSearchMode && lookupOutputFormat,
  );
  const showFooter = Boolean(textVoice?.supported || lookupDepth);
  const showReadAloudToggle = Boolean(tts?.supported && !textVoice?.supported);
  const resolvedLookupModelName = lookupDepth
    ? lookupDepthModelName(lookupDepth.mode)
    : "";

  function handlePaste(event: React.ClipboardEvent<HTMLTextAreaElement>) {
    if (!onAddAttachments) return;
    const files = filesFromClipboard(event.clipboardData);
    if (files.length === 0) return;
    event.preventDefault();
    onAddAttachments(files);
  }

  return (
    <div
      className={`composer lookup-composer ${isDragging ? "composer-dragging" : ""} ${voiceMode ? "composer-voice-layout" : ""}`}
    >
      {isDragging && !voiceMode && <div className="drop-overlay">Drop files to attach</div>}

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
                  onRemove={
                    onRemoveAttachment ? () => onRemoveAttachment(attachment.id) : undefined
                  }
                  onOpen={
                    onOpenAttachment ? () => onOpenAttachment(attachment) : undefined
                  }
                />
              ))}
            </div>
          )}
        </div>

        <div className="composer-input-block composer-input-block-slide">
          {slashMenuOpen && onSlashCommandSelect && (
            <SlashCommandMenu
              commands={slashCommands}
              selectedIndex={Math.min(slashSelectedIndex, slashCommands.length - 1)}
              onSelect={onSlashCommandSelect}
              onHover={setSlashSelectedIndex}
            />
          )}

          <div className="composer-input-shell">
            <div className="composer-input-row">
              {showOptionsMenu && lookupSearchMode && lookupOutputFormat && (
                <LookupComposerOptionsMenu
                  disabled={disabled}
                  searchMode={lookupSearchMode.mode}
                  onSearchModeChange={lookupSearchMode.onChange}
                  outputFormat={lookupOutputFormat.format}
                  onOutputFormatChange={lookupOutputFormat.onChange}
                  onUpload={() => fileInputRef.current?.click()}
                />
              )}

              <ComposerTextarea
                ref={textareaRef}
                value={value}
                placeholder={
                  placeholder ??
                  (lookupSearchMode?.mode === "docs"
                    ? "Ask about attached files or paste a URL…"
                    : "Ask anything — Gemini can search the web and read links")
                }
                disabled={disabled}
                onChange={(event) => onChange(event.target.value)}
                onPaste={handlePaste}
                onKeyDown={(event) => {
                  if (slashMenuOpen && onSlashCommandSelect) {
                    const activeIndex = Math.min(slashSelectedIndex, slashCommands.length - 1);
                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      setSlashSelectedIndex((current) =>
                        Math.min(current + 1, slashCommands.length - 1),
                      );
                      return;
                    }
                    if (event.key === "ArrowUp") {
                      event.preventDefault();
                      setSlashSelectedIndex((current) => Math.max(current - 1, 0));
                      return;
                    }
                    if (event.key === "Enter" || event.key === "Tab") {
                      const selected = slashCommands[activeIndex];
                      if (selected) {
                        event.preventDefault();
                        onSlashCommandSelect(selected);
                      }
                      return;
                    }
                  }

                  if (event.key === "Escape") {
                    if (slashMenuOpen) {
                      event.preventDefault();
                      event.stopPropagation();
                      onChange("");
                      return;
                    }
                  }

                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    if (!disabled && !running && canSend) {
                      onSend();
                    }
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
                  disabled={!running && (disabled || !canSend)}
                  aria-label={running ? "Stop message" : "Send message"}
                  title={running ? "Stop (Ctrl+C)" : "Send message"}
                >
                  {running ? <ComposerStopIcon /> : <ComposerSendIcon />}
                </button>
              </div>
            </div>

            {onAddAttachments && (
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,application/pdf,text/*,audio/*,video/*,.md,.json,.csv,.yaml,.yml,.log"
                className="composer-file-input"
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? []);
                  if (files.length > 0) {
                    onAddAttachments(files);
                  }
                  event.target.value = "";
                }}
              />
            )}
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
              event.preventDefault();
              event.stopPropagation();
              textareaRef.current?.blur();
              footerRef.current?.blur();
            }
          }}
        >
          <div className="composer-footer-start lookup-composer-footer-start">
            {lookupDepth && (
              <LookupDepthToggle
                mode={lookupDepth.mode}
                onChange={lookupDepth.onChange}
                disabled={disabled}
              />
            )}
            {lookupDepth && (
              <span className="composer-model-name">{resolvedLookupModelName}</span>
            )}
          </div>
          <div className="composer-footer-end">
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
