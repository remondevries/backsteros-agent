import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { ComposerTextarea } from "./ComposerTextarea";
import { AttachmentChip } from "./AttachmentChip";
import { filesFromClipboard } from "./attachments";
import { ComposerToolIndicators } from "./ComposerToolIndicators";
import { ComposerModeToggle } from "./ComposerModeToggle";
import type { AutomationFlowId } from "./automation/types";
import { DailyCaptureTimeTag, type DailyCaptureTimeTagHandle } from "./DailyCaptureTimeTag";
import { GroceryWeekTag, type GroceryWeekTagHandle } from "./GroceryWeekTag";
import { composerModeDisplayName } from "./composerMode";
import type { ComposerMode } from "./composerMode";
import { TextVoiceToggle, type InputMode } from "./TextVoiceToggle";
import { TtsToggle } from "./TtsToggle";
import type { ToolPinSelection, ToolSelection } from "./tool-routing";
import { SlashCommandMenu } from "./SlashCommandMenu";
import {
  filterSlashCommands,
  isSlashCommandPaletteOpen,
  parseSlashCommandInput,
  type SlashCommandDefinition,
} from "./slashCommands";
import { DotScrollLoader } from "./DotScrollLoader";
import type { PendingAttachment } from "./types";

export type ComposerHandle = {
  focus: () => void;
  blur: () => void;
  isFocused: () => boolean;
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
    composerMode?: ComposerMode;
    composerModeLabel?: string;
    onComposerModeChange?: (mode: ComposerMode) => void;
    savingComposerMode?: boolean;
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
    onDismissTool?: (tool: keyof ToolSelection) => void;
    composerQuickAction?: {
      onClear: () => void;
    };
    composerAutomationFlow?: AutomationFlowId | null;
    dailyCaptureTime?: {
      value: string;
      onChange: (value: string) => void;
      onUserEdit?: () => void;
      onCommit?: () => void;
      inputRef?: React.RefObject<DailyCaptureTimeTagHandle | null>;
    };
    groceryWeek?: {
      value: string;
      onChange: (value: string) => void;
      onUserEdit?: () => void;
      onCommit?: () => void;
      inputRef?: React.RefObject<GroceryWeekTagHandle | null>;
    };
    onActivateDailyCaptureShortcut?: () => void;
    onActivateGroceryListShortcut?: () => void;
    onTriggerGoodMorningShortcut?: () => void;
    onTriggerGoodNightShortcut?: () => void;
    onTriggerLetterShortcut?: () => void;
    onSlashCommandSelect?: (command: SlashCommandDefinition) => void;
    onCancelAutomationFlow?: () => boolean;
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
    composerMode,
    composerModeLabel,
    onComposerModeChange,
    savingComposerMode,
    tts,
    textVoice,
    voiceMode = false,
    toolIndicators,
    toolPins,
    onDismissTool,
    composerQuickAction,
    composerAutomationFlow = null,
    dailyCaptureTime,
    groceryWeek,
    onActivateDailyCaptureShortcut,
    onActivateGroceryListShortcut,
    onTriggerGoodMorningShortcut,
    onTriggerGoodNightShortcut,
    onTriggerLetterShortcut,
    onSlashCommandSelect,
    onCancelAutomationFlow,
    onEscapeBlur,
    onComposerFocus,
  },
  ref,
) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const [slashSelectedIndex, setSlashSelectedIndex] = useState(0);

  const slashMenuEnabled = Boolean(
    !composerAutomationFlow && !voiceMode && !disabled && onSlashCommandSelect,
  );

  const slashCommands = useMemo(() => {
    if (!slashMenuEnabled) return [];
    const slashState = parseSlashCommandInput(value);
    if (!slashState) return [];
    return filterSlashCommands(slashState.query, { context: "chat" });
  }, [slashMenuEnabled, value]);

  const slashMenuOpen = isSlashCommandPaletteOpen(value, {
    enabled: slashMenuEnabled,
    context: "chat",
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
    if (onCancelAutomationFlow?.()) {
      blurComposerInput();
      return;
    }
    blurComposerInput();
    onEscapeBlur?.();
  }

  const activeTools = toolIndicators ?? {
    obsidian: false,
    linear: false,
    calendar: false,
    whoop: false,
  };
  const showToolIndicators = Object.values(activeTools).some(Boolean);
  const showFooter = Boolean(textVoice?.supported || (composerMode && onComposerModeChange));
  const showReadAloudToggle = Boolean(tts?.supported && !textVoice?.supported);

  function handlePaste(event: React.ClipboardEvent<HTMLTextAreaElement>) {
    const files = filesFromClipboard(event.clipboardData);
    if (files.length === 0) return;
    event.preventDefault();
    onAddAttachments(files);
  }

  const resolvedComposerModeLabel =
    composerModeLabel ??
    (composerMode ? composerModeDisplayName(composerMode) : "");

  return (
    <div
      className={`composer ${isDragging ? "composer-dragging" : ""} ${voiceMode ? "composer-voice-layout" : ""}`}
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
          {slashMenuOpen && onSlashCommandSelect && (
            <SlashCommandMenu
              commands={slashCommands}
              selectedIndex={Math.min(slashSelectedIndex, slashCommands.length - 1)}
              onSelect={onSlashCommandSelect}
              onHover={setSlashSelectedIndex}
            />
          )}

          {showToolIndicators && (
            <div className="composer-floating-controls">
              <ComposerToolIndicators
                tools={activeTools}
                pins={toolPins}
                onDismiss={onDismissTool}
              />
            </div>
          )}

          <div
            className={[
              "composer-input-shell",
              composerAutomationFlow ? "composer-input-shell--automation" : "",
              composerAutomationFlow === "daily-capture"
                ? "composer-input-shell--daily-capture"
                : composerAutomationFlow === "grocery-list"
                  ? "composer-input-shell--grocery-list"
                  : composerAutomationFlow === "delete-file"
                    ? "composer-input-shell--delete-file"
                    : "",
              disabled || voiceMode ? "composer-input-shell--inactive" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <div className="composer-input-row">
              {composerAutomationFlow === "daily-capture" && dailyCaptureTime ? (
                <DailyCaptureTimeTag
                  ref={dailyCaptureTime.inputRef}
                  value={dailyCaptureTime.value}
                  onChange={dailyCaptureTime.onChange}
                  onUserEdit={dailyCaptureTime.onUserEdit}
                  onCommit={
                    dailyCaptureTime.onCommit ??
                    (() => {
                      textareaRef.current?.focus();
                    })
                  }
                  disabled={disabled}
                />
              ) : composerAutomationFlow === "grocery-list" && groceryWeek ? (
                <GroceryWeekTag
                  ref={groceryWeek.inputRef}
                  value={groceryWeek.value}
                  onChange={groceryWeek.onChange}
                  onUserEdit={groceryWeek.onUserEdit}
                  onCommit={
                    groceryWeek.onCommit ??
                    (() => {
                      textareaRef.current?.focus();
                    })
                  }
                  disabled={disabled}
                />
              ) : (
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
              )}

              <ComposerTextarea
                ref={textareaRef}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                onPaste={handlePaste}
                onFocus={() => onComposerFocus?.()}
                placeholder={
                  disabled || voiceMode
                    ? ""
                    : composerAutomationFlow === "grocery-list"
                      ? "milk, eggs, bread…"
                      : composerAutomationFlow === "daily-capture"
                        ? "What happened?"
                        : composerAutomationFlow === "letter"
                          ? "Confirm or correct: from, organization, received date, status…"
                          : composerAutomationFlow === "delete-file"
                            ? "Which file should I delete?"
                            : "Reply…"
                }
                disabled={disabled || voiceMode}
                tabIndex={voiceMode ? -1 : 0}
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
                    handleComposerEscape(event);
                    return;
                  }
                  if (
                    event.key === "Tab" &&
                    event.shiftKey &&
                    composerAutomationFlow === "daily-capture" &&
                    dailyCaptureTime?.inputRef?.current
                  ) {
                    event.preventDefault();
                    dailyCaptureTime.inputRef.current.focus();
                    dailyCaptureTime.inputRef.current.select();
                    return;
                  }
                  if (
                    event.key === "Tab" &&
                    event.shiftKey &&
                    composerAutomationFlow === "grocery-list" &&
                    groceryWeek?.inputRef?.current
                  ) {
                    event.preventDefault();
                    groceryWeek.inputRef.current.focus();
                    groceryWeek.inputRef.current.select();
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
                    onActivateGroceryListShortcut &&
                    /^\/(?:gr|grocery)$/i.test(value)
                  ) {
                    event.preventDefault();
                    onActivateGroceryListShortcut();
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
                  if (
                    event.key === " " &&
                    onTriggerLetterShortcut &&
                    /^\/letter$/i.test(value)
                  ) {
                    event.preventDefault();
                    onTriggerLetterShortcut();
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
                  className={[
                    "composer-icon-button",
                    "composer-send",
                    running ? "composer-send-stop" : "",
                    disabled ? "composer-send-busy" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => {
                    if (running) {
                      onCancel?.();
                      return;
                    }
                    onSend();
                  }}
                  disabled={!running && disabled}
                  aria-label={
                    disabled ? "Working" : running ? "Stop message" : "Send message"
                  }
                  title={disabled ? "Working" : running ? "Stop (Ctrl+C)" : "Send message"}
                >
                  {disabled ? (
                    <DotScrollLoader
                      className="composer-send-loader"
                      aria-label="Working"
                    />
                  ) : running ? (
                    <ComposerStopIcon />
                  ) : (
                    <ComposerSendIcon />
                  )}
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
            {composerMode && onComposerModeChange && (
              <ComposerModeToggle
                mode={composerMode}
                onChange={onComposerModeChange}
                disabled={disabled || savingComposerMode}
              />
            )}
            {composerMode && (
              <span className="composer-model-name">{resolvedComposerModeLabel}</span>
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
