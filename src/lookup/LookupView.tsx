import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { AttachmentChip } from "../chat/AttachmentChip";
import { AttachmentPreviewModal } from "../chat/AttachmentPreviewModal";
import {
  createPendingAttachment,
  filesFromDataTransfer,
  pendingAttachmentsToMessageAttachments,
  pendingAttachmentsToWire,
  prepareFilesForUpload,
  revokePendingAttachment,
  toAttachmentPreviewTarget,
} from "../chat/attachments";
import { validateLookupAttachment } from "./lookupAttachments";
import { MessageActions } from "../chat/MessageActions";
import { RunBlock } from "../chat/RunBlock";
import type {
  AgentEvent,
  AttachmentPreviewTarget,
  ChatMessage,
  PendingAttachment,
  RunViewModel,
} from "../chat/types";
import { VoiceTurnBubble, type VoiceTurnPhase } from "../chat/VoiceTurnBubble";
import { useInputModeShortcuts } from "../hooks/useInputModeShortcuts";
import { useLookupDepth } from "../hooks/useLookupDepth";
import { useLookupOutputFormat } from "../hooks/useLookupOutputFormat";
import { useLookupSearchMode } from "../hooks/useLookupSearchMode";
import { useStreamingRunTts } from "../hooks/useStreamingRunTts";
import { useVoiceMode } from "../hooks/useVoiceMode";
import { useTts } from "../hooks/useTts";
import { parseChatCommand } from "../chat/chatCommands";
import { isSlashCommandPaletteOpen, type SlashCommandDefinition } from "../chat/slashCommands";
import { cancelRun } from "../lib/api";
import {
  clearLookupSession,
  sendLookupMessage as sendLookupMessageRequest,
} from "../lib/lookupApi";
import { subscribeToLookupRun } from "../lib/lookupSse";
import { LookupComposer, type LookupComposerHandle } from "./LookupComposer";

export type LookupViewHandle = {
  focusComposer: () => void;
};

function isShortcutBlockedTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    Boolean(
      target.closest(
        ".session-tab-rename-input, .attachment-modal-backdrop, .command-panel-root",
      ),
    )
  );
}

function shouldAllowCopyShortcut(target: EventTarget | null): boolean {
  const selection = window.getSelection()?.toString() ?? "";
  if (selection.length > 0) return true;
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
    return target.selectionStart !== target.selectionEnd;
  }
  return false;
}

const voiceModeFocusGuardRef = { current: false };

function scheduleComposerFocus(focus: () => void) {
  if (voiceModeFocusGuardRef.current) return;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (voiceModeFocusGuardRef.current) return;
      focus();
    });
  });
}

function createEmptyRun(runId: string): RunViewModel {
  return {
    runId,
    steps: [],
    text: "",
    entities: [],
    approvals: [],
    status: "running",
    expanded: true,
  };
}

function applyLookupEvent(run: RunViewModel, event: AgentEvent): RunViewModel {
  const next = { ...run };

  switch (event.type) {
    case "run.started":
      next.startedAt = event.timestamp;
      break;
    case "message.delta":
      next.text += event.text;
      break;
    case "activity.step": {
      const index = next.steps.findIndex((step) => step.stepId === event.stepId);
      const step = {
        stepId: event.stepId,
        kind: event.kind,
        label: event.label,
        status: event.status,
        durationMs: event.durationMs,
      };
      if (index >= 0) next.steps[index] = step;
      else next.steps.push(step);
      break;
    }
    case "run.completed":
      next.status = event.status;
      next.durationMs = event.durationMs;
      next.finishedAt = Date.now();
      next.expanded = false;
      break;
    case "run.failed":
    case "startup.failed":
      next.status = "error";
      next.finishedAt = Date.now();
      next.text += `\n\n${"message" in event ? event.message : "Lookup failed"}`;
      next.expanded = false;
      break;
    default:
      break;
  }

  return next;
}

export const LookupView = forwardRef<
  LookupViewHandle,
  {
    sessionId: string;
    isActive?: boolean;
    initialMessages?: ChatMessage[];
    initialRuns?: Record<string, RunViewModel>;
    onTitleChange?: (title: string) => void;
    onStateChange?: (messages: ChatMessage[], runs: Record<string, RunViewModel>) => void;
  }
>(function LookupView(
  {
    sessionId,
    isActive = true,
    initialMessages = [],
    initialRuns = {},
    onTitleChange,
    onStateChange,
  },
  ref,
) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [runs, setRuns] = useState<Record<string, RunViewModel>>(initialRuns);
  const [input, setInput] = useState("");
  const inputRef = useRef(input);
  inputRef.current = input;
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [previewTarget, setPreviewTarget] = useState<AttachmentPreviewTarget | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { mode: lookupDepthMode, setMode: setLookupDepthMode } = useLookupDepth();
  const { mode: lookupSearchMode, setMode: setLookupSearchMode } = useLookupSearchMode();
  const { format: lookupOutputFormat, setFormat: setLookupOutputFormat } = useLookupOutputFormat();

  const composerRef = useRef<LookupComposerHandle>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const chatContentRef = useRef<HTMLDivElement>(null);
  const dragDepthRef = useRef(0);
  const stickToBottomRef = useRef(true);
  const pendingAttachmentsRef = useRef(pendingAttachments);
  const titleUpdatedRef = useRef(
    initialMessages.some((message) => message.role === "user" && message.text.trim()),
  );
  const streamControllerRef = useRef<AbortController | null>(null);
  const liveRunIdRef = useRef<string | null>(null);
  const busyRef = useRef(busy);

  busyRef.current = busy;
  pendingAttachmentsRef.current = pendingAttachments;

  const handleSendRef = useRef<(messageText?: string) => Promise<void>>(async () => {});

  const fallbackTts = useTts();
  const voiceMode = useVoiceMode({
    onTranscript: async (text) => {
      await handleSendRef.current(text);
    },
    isActive,
  });
  const voiceModeSupported = voiceMode.supported;
  const voiceModeEnabled = voiceModeSupported ? voiceMode.enabled : false;
  voiceModeFocusGuardRef.current = voiceModeEnabled;
  const ttsSupported = voiceModeSupported || fallbackTts.supported;
  const ttsEnabled = voiceModeSupported ? voiceMode.enabled : fallbackTts.enabled;
  const toggleVoiceModeRaw = voiceModeSupported ? voiceMode.toggle : fallbackTts.toggle;
  const toggleVoiceMode = useCallback(() => {
    const wasEnabled = voiceModeEnabled;
    toggleVoiceModeRaw();
    if (wasEnabled) {
      scheduleComposerFocus(() => {
        composerRef.current?.focus();
      });
    }
  }, [voiceModeEnabled, toggleVoiceModeRaw]);
  const setVoiceModeEnabled = useCallback(
    (enabled: boolean) => {
      if (!voiceModeSupported) return;
      voiceMode.setEnabled(enabled);
      if (!enabled) {
        scheduleComposerFocus(() => {
          composerRef.current?.focus();
        });
      }
    },
    [voiceMode, voiceModeSupported],
  );
  useInputModeShortcuts({
    isActive,
    supported: voiceModeSupported,
    setEnabled: setVoiceModeEnabled,
  });
  const advanceStreamingTts = voiceModeSupported ? voiceMode.advance : fallbackTts.advance;
  const stopSpeaking = voiceModeSupported ? voiceMode.stop : fallbackTts.stop;
  const interruptVoice = voiceModeSupported ? voiceMode.interrupt : fallbackTts.stop;
  const {
    transcribing,
    speaking,
    error: voiceModeError,
  } = voiceMode;

  const latestFinishedRunId = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const runId = messages[index]?.runId;
      if (!runId) continue;
      const run = runs[runId];
      if (run?.status === "finished" && run.text.trim()) {
        return runId;
      }
    }
    return null;
  }, [messages, runs]);

  const voiceTurnPhase = useMemo((): VoiceTurnPhase | null => {
    if (!voiceModeEnabled) return null;
    if (speaking) return "listening";
    if (transcribing) return "processing";
    return null;
  }, [voiceModeEnabled, speaking, transcribing]);

  useStreamingRunTts({
    runs,
    isActive,
    ttsEnabled,
    ttsSupported,
    advanceStreamingTts,
    latestFinishedRunId,
  });

  const focusComposer = useCallback(() => {
    composerRef.current?.focus();
  }, []);

  useImperativeHandle(ref, () => ({ focusComposer }), [focusComposer]);

  useEffect(() => {
    setMessages(initialMessages);
    setRuns(initialRuns);
    titleUpdatedRef.current = initialMessages.some(
      (message) => message.role === "user" && message.text.trim(),
    );
  }, [sessionId, initialMessages, initialRuns]);

  useEffect(() => {
    onStateChange?.(messages, runs);
  }, [messages, onStateChange, runs]);

  useEffect(() => {
    if (!isActive) return;
    if (!voiceModeEnabled) {
      composerRef.current?.focus();
    }
  }, [isActive, sessionId, voiceModeEnabled]);

  useEffect(() => {
    if (!voiceModeEnabled || !isActive) return;
    const active = document.activeElement;
    if (
      active instanceof HTMLTextAreaElement ||
      active instanceof HTMLInputElement ||
      (active instanceof HTMLElement && active.isContentEditable)
    ) {
      active.blur();
    }
  }, [isActive, voiceModeEnabled]);

  const scrollToBottom = useCallback(() => {
    const node = transcriptRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, []);

  useEffect(() => {
    if (stickToBottomRef.current) {
      scrollToBottom();
    }
  }, [messages, runs, scrollToBottom]);

  const handleTranscriptScroll = useCallback(() => {
    const node = transcriptRef.current;
    if (!node) return;
    const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
    stickToBottomRef.current = distanceFromBottom < 48;
  }, []);

  const handleCancelRun = useCallback(async () => {
    void stopSpeaking();

    const runId = liveRunIdRef.current;
    streamControllerRef.current?.abort();

    if (runId) {
      await cancelRun(runId).catch(() => {
        // Ignore transient cancel errors.
      });

      setRuns((current) => {
        const existing = current[runId];
        if (!existing || existing.status !== "running") return current;
        return {
          ...current,
          [runId]: { ...existing, status: "cancelled", expanded: false },
        };
      });

      liveRunIdRef.current = null;
    }

    setBusy(false);
    focusComposer();
  }, [focusComposer, stopSpeaking]);

  const handleInterrupt = useCallback(async () => {
    interruptVoice();
    await handleCancelRun();
  }, [handleCancelRun, interruptVoice]);

  const handleClearChat = useCallback(async () => {
    void stopSpeaking();

    if (busy) {
      await handleCancelRun();
    }

    setBusy(true);
    setError(null);
    setInput("");
    setPendingAttachments([]);
    streamControllerRef.current?.abort();
    liveRunIdRef.current = null;

    try {
      const result = await clearLookupSession(sessionId);
      setMessages([]);
      setRuns({});
      titleUpdatedRef.current = false;
      stickToBottomRef.current = true;
      onTitleChange?.(result.title);
      onStateChange?.([], {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear chat");
    } finally {
      setBusy(false);
      focusComposer();
    }
  }, [
    busy,
    focusComposer,
    handleCancelRun,
    onStateChange,
    onTitleChange,
    sessionId,
    stopSpeaking,
  ]);

  function handleSlashCommandSelect(command: SlashCommandDefinition) {
    if (command.id === "clear") {
      void handleClearChat();
    }
  }

  useEffect(() => {
    return () => {
      for (const attachment of pendingAttachmentsRef.current) {
        revokePendingAttachment(attachment);
      }
    };
  }, []);

  const addAttachments = useCallback((files: File[]) => {
    if (files.length === 0) return;

    void (async () => {
      const preparedFiles = await prepareFilesForUpload(files);
      setPendingAttachments((current) => {
        const next = [...current];
        for (const file of preparedFiles) {
          const validationError = validateLookupAttachment(file, next.length);
          if (validationError) {
            setError(validationError);
            return current;
          }
          next.push(createPendingAttachment(file));
        }
        setError(null);
        return next;
      });
    })();
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setPendingAttachments((current) => {
      const attachment = current.find((item) => item.id === id);
      if (attachment) {
        revokePendingAttachment(attachment);
      }
      return current.filter((item) => item.id !== id);
    });
  }, []);

  const handleDragEnter = useCallback((event: React.DragEvent) => {
    if (!event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    dragDepthRef.current += 1;
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    if (!event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    if (!event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      if (!event.dataTransfer.types.includes("Files")) return;
      event.preventDefault();
      dragDepthRef.current = 0;
      setIsDragging(false);
      addAttachments(filesFromDataTransfer(event.dataTransfer));
    },
    [addAttachments],
  );

  useEffect(() => {
    if (!isActive) return;

    function onKeyDown(event: KeyboardEvent) {
      if (!event.ctrlKey || event.metaKey || event.altKey) return;
      if (isShortcutBlockedTarget(event.target)) return;

      const key = event.key.toLowerCase();

      if (key === "c") {
        if (shouldAllowCopyShortcut(event.target)) return;
        event.preventDefault();
        void handleInterrupt();
      }
    }

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [handleInterrupt, isActive]);

  useEffect(() => {
    if (!isActive || voiceModeEnabled) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isShortcutBlockedTarget(event.target)) return;

      if (event.key === "Escape" && isSlashCommandPaletteOpen(inputRef.current, { context: "lookup" })) {
        event.preventDefault();
        event.stopPropagation();
        setInput("");
      }
    }

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [isActive, voiceModeEnabled]);

  const handleSend = useCallback(
    async (messageText?: string) => {
      const text = (messageText ?? input).trim();

      if (parseChatCommand(text) === "clear") {
        if (!messageText) {
          setInput("");
        }
        await handleClearChat();
        return;
      }

      const isVoiceSend = Boolean(messageText);
      const attachmentsToSend = isVoiceSend ? [] : [...pendingAttachments];
      let searchModeForSend = lookupSearchMode;
      if (
        !isVoiceSend &&
        attachmentsToSend.length > 0 &&
        searchModeForSend === "web" &&
        !text.match(/https?:\/\//i)
      ) {
        searchModeForSend = "docs";
        setLookupSearchMode("docs");
      }
      if (!text && attachmentsToSend.length === 0) return;
      if (busy && !isVoiceSend) return;

      if (isVoiceSend && busy) {
        await handleCancelRun();
      }

      void stopSpeaking();

      setBusy(true);
      setError(null);
      if (!messageText) {
        setInput("");
        setPendingAttachments([]);
      }
      stickToBottomRef.current = true;

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        text,
        createdAt: Date.now(),
        attachments: pendingAttachmentsToMessageAttachments(attachmentsToSend),
      };
      setMessages((current) => [...current, userMessage]);

      if (!titleUpdatedRef.current && text) {
        titleUpdatedRef.current = true;
        onTitleChange?.(text);
      }

      const streamController = new AbortController();
      streamControllerRef.current = streamController;

      try {
        const wireAttachments =
          attachmentsToSend.length > 0
            ? await pendingAttachmentsToWire(attachmentsToSend)
            : [];
        const { runId, attachments: serverAttachments } = await sendLookupMessageRequest(
          sessionId,
          text,
          {
            depthMode: lookupDepthMode,
            searchMode: searchModeForSend,
            outputFormat: lookupOutputFormat,
            attachments: wireAttachments,
          },
        );
        liveRunIdRef.current = runId;
        setMessages((current) =>
          current.map((message) =>
            message.id === userMessage.id
              ? {
                  ...message,
                  runId,
                  attachments: pendingAttachmentsToMessageAttachments(
                    attachmentsToSend,
                    serverAttachments,
                  ),
                }
              : message,
          ),
        );
        setRuns((current) => ({ ...current, [runId]: createEmptyRun(runId) }));

        await subscribeToLookupRun(
          sessionId,
          runId,
          (event) => {
            setRuns((current) => {
              const existing = current[runId] ?? createEmptyRun(runId);
              return { ...current, [runId]: applyLookupEvent(existing, event) };
            });
          },
          streamController.signal,
        );

        if (!streamController.signal.aborted) {
          setRuns((current) => {
            const existing = current[runId];
            if (!existing || existing.status !== "running") {
              return current;
            }
            return {
              ...current,
              [runId]: {
                ...existing,
                status: "error" as const,
                finishedAt: Date.now(),
                text: `${existing.text}\n\nLookup stream ended before the run completed.`,
                expanded: false,
              },
            };
          });
        }
      } catch (err) {
        if (!streamController.signal.aborted) {
          setError(err instanceof Error ? err.message : "Failed to send lookup message");
          if (!messageText) {
            setInput(text);
            setPendingAttachments(attachmentsToSend);
          }
        }
      } finally {
        if (streamControllerRef.current === streamController) {
          streamControllerRef.current = null;
        }
        liveRunIdRef.current = null;
        setBusy(false);
        if (!streamController.signal.aborted && !voiceModeEnabled) {
          composerRef.current?.focus();
        }
      }
    },
    [
      busy,
      handleCancelRun,
      handleClearChat,
      input,
      onTitleChange,
      pendingAttachments,
      sessionId,
      stopSpeaking,
      lookupDepthMode,
      lookupSearchMode,
      lookupOutputFormat,
      voiceModeEnabled,
    ],
  );

  handleSendRef.current = handleSend;

  return (
    <div className="chat-view lookup-view">
      <AttachmentPreviewModal
        target={previewTarget}
        onClose={() => {
          setPreviewTarget(null);
          focusComposer();
        }}
      />

      <div
        className={`chat-content ${isDragging ? "chat-content-dragging" : ""}`}
        ref={chatContentRef}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="chat-transcript-shell">
          <div
            className="chat-transcript"
            ref={transcriptRef}
            onScroll={handleTranscriptScroll}
          >
            <div className="chat-transcript-inner">
              {messages.length === 0 && (
                <div className="lookup-empty-state">
                  <p>Research with Gemini and grounded web search.</p>
                  <p className="lookup-empty-hint">
                    Use Web mode for grounded search, Docs mode for files only, paste URLs to read
                    pages, and attach PDFs, images, audio, or video. This view does not use Cursor
                    agent tokens.
                  </p>
                </div>
              )}

              {messages.map((message) => {
                const run = message.runId ? runs[message.runId] : undefined;

                return (
                  <div key={message.id} className="chat-turn">
                    <div className={`chat-message ${message.role}`}>
                      {message.role === "user" ? (
                        <>
                          {message.text ? (
                            <>
                              <div className="bubble">{message.text}</div>
                              <MessageActions text={message.text} />
                            </>
                          ) : null}
                        </>
                      ) : null}
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="message-attachments">
                          {message.attachments.map((attachment) => (
                            <AttachmentChip
                              key={`${message.id}-${attachment.name}-${attachment.vaultPath ?? "local"}`}
                              attachment={attachment}
                              onOpen={() =>
                                setPreviewTarget(toAttachmentPreviewTarget(attachment))
                              }
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {run && (
                      <RunBlock
                        run={run}
                        sourceBrand="gemini"
                        animate={run.status === "running"}
                        onToggle={() =>
                          setRuns((current) => ({
                            ...current,
                            [run.runId]: {
                              ...current[run.runId],
                              expanded: !current[run.runId]?.expanded,
                            },
                          }))
                        }
                        onApprove={() => undefined}
                        onReject={() => undefined}
                        canSpeak={
                          ttsSupported &&
                          run.status !== "running" &&
                          run.text.trim().length > 0 &&
                          !voiceModeEnabled
                        }
                        voiceModeEnabled={voiceModeEnabled}
                      />
                    )}
                  </div>
                );
              })}

              {voiceTurnPhase && <VoiceTurnBubble phase={voiceTurnPhase} />}

              {error && <div className="error-banner">{error}</div>}
              {voiceModeEnabled && voiceModeError && (
                <div className="error-banner">{voiceModeError}</div>
              )}
            </div>
          </div>
        </div>

        <div
          className={`composer-stack ${voiceModeEnabled ? "composer-stack-voice-mode" : ""}`}
        >
          <LookupComposer
            ref={composerRef}
            value={input}
            onChange={setInput}
            onSend={() => void handleSend()}
            onCancel={() => void handleInterrupt()}
            running={busy}
            disabled={busy}
            attachments={pendingAttachments}
            onAddAttachments={addAttachments}
            onRemoveAttachment={removeAttachment}
            onOpenAttachment={(attachment) =>
              setPreviewTarget(toAttachmentPreviewTarget(attachment))
            }
            isDragging={isDragging}
            voiceMode={voiceModeEnabled}
            lookupDepth={{
              mode: lookupDepthMode,
              onChange: setLookupDepthMode,
            }}
            lookupSearchMode={{
              mode: lookupSearchMode,
              onChange: setLookupSearchMode,
            }}
            lookupOutputFormat={{
              format: lookupOutputFormat,
              onChange: setLookupOutputFormat,
            }}
            tts={
              ttsSupported && !voiceModeSupported
                ? {
                    enabled: ttsEnabled,
                    onToggle: toggleVoiceMode,
                    supported: true,
                  }
                : undefined
            }
            textVoice={
              voiceModeSupported
                ? {
                    mode: voiceModeEnabled ? "voice" : "text",
                    onChange: (mode) => {
                      if ((mode === "voice") !== voiceModeEnabled) {
                        toggleVoiceMode();
                      }
                    },
                    supported: true,
                  }
                : undefined
            }
            onSlashCommandSelect={handleSlashCommandSelect}
          />
        </div>
      </div>
    </div>
  );
});
