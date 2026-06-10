import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AttachmentChip } from "./AttachmentChip";
import { AttachmentPreviewModal } from "./AttachmentPreviewModal";
import {
  createPendingAttachment,
  filesFromDataTransfer,
  pendingAttachmentsToMessageAttachments,
  pendingAttachmentsToWire,
  prepareFilesForUpload,
  revokePendingAttachment,
  toAttachmentPreviewTarget,
  validateAttachment,
} from "./attachments";
import { Composer, type ComposerHandle } from "./Composer";
import { ContextChip } from "./ContextChip";
import { VoiceTurnBubble, type VoiceTurnPhase } from "./VoiceTurnBubble";
import { parseChatCommand } from "./chatCommands";
import { isValidLinearContextChip } from "./linearIssue";
import {
  composerModeDisplayName,
  composerModeFromSettings,
  settingsFromComposerMode,
  type ComposerMode,
} from "./composerMode";
import { MessageActions } from "./MessageActions";
import { formatMessageTimestamp } from "./formatMessageTimestamp";
import { useRunUiPreviewShortcut } from "./dev/RunUiPreviewPanel";
import { RunBlock } from "./RunBlock";
import type { AppView } from "../app/appViews";
import {
  GOOD_MORNING_ACTION_ID,
  GOOD_MORNING_FEEL_ACTION_ID,
  GOOD_MORNING_LABEL,
  isGoodMorningComposerMode,
  isGoodMorningFeelMessage,
  isGoodMorningFlowMessage,
  isGoodMorningMessage,
  markMorningReviewUsedToday,
  MORNING_REVIEW_MESSAGE,
  parseGoodMorningShortcut,
} from "./morningReview";
import {
  DAILY_CAPTURE_ACTION_ID,
  DAILY_CAPTURE_LABEL,
  formatDailyCaptureLogEntry,
  isDailyCaptureMessage,
  parseDailyCaptureShortcut,
  wrapDailyCaptureForAgent,
} from "./dailyCapture";
import {
  GOOD_NIGHT_ACTION_ID,
  GOOD_NIGHT_LABEL,
  GOOD_NIGHT_MESSAGE,
  GOOD_NIGHT_REFLECTION_ACTION_ID,
  GOOD_NIGHT_REFLECTION_COUNT,
  GOOD_NIGHT_REFLECTION_THINKING_MS,
  getGoodNightReflectionPlaceholder,
  getGoodNightReflectionQuestion,
  isGoodNightComposerMode,
  isGoodNightFlowMessage,
  isGoodNightMessage,
  isGoodNightReflectionMessage,
  parseGoodNightShortcut,
  serializeGoodNightReflectionAnswers,
} from "./goodNight";
import {
  isLetterComposerMode,
  isLetterConfirmMessage,
  isLetterFlowMessage,
  isLetterMessage,
  LETTER_ACTION_ID,
  LETTER_CONFIRM_ACTION_ID,
  LETTER_CONFIRM_PLACEHOLDER,
  LETTER_LABEL,
  LETTER_MESSAGE,
  parseLetterShortcut,
  shouldSendComposerAttachments,
} from "./letter";
import { mergeStructuredPayload } from "./runEntities";
import {
  cycleToolPin,
  EMPTY_TOOL_PINS,
  resolveToolSelection,
  type ToolPinSelection,
  type ToolSelection,
} from "./tool-routing";
import type { QuickAction } from "./quickActions";
import type {
  AgentEvent,
  AttachmentPreviewTarget,
  ChatMessage,
  PendingAttachment,
  RunViewModel,
} from "./types";
import { useVoiceMode } from "../hooks/useVoiceMode";
import { useTts } from "../hooks/useTts";
import {
  getSettings,
  getWorkspaceDiff,
  cancelRun,
  clearSessionChat,
  respondApproval,
  revertWorkspace,
  sendMessage,
  updateSettings,
} from "../lib/api";
import { subscribeToRunWithAuth } from "../lib/sse";
import { prefetchSpeech } from "../lib/tts";
import { setTrafficLightsVisible } from "../lib/traffic-lights";

const EMPTY_TOOLS: ToolSelection = { obsidian: false, linear: false, calendar: false, whoop: false };

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

function isComposerShortcutTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && Boolean(target.closest(".composer"));
}

function shouldAllowCopyShortcut(target: EventTarget | null): boolean {
  const selection = window.getSelection()?.toString() ?? "";
  if (selection.length > 0) return true;
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
    return target.selectionStart !== target.selectionEnd;
  }
  return false;
}

function createEmptyRun(runId: string): RunViewModel {
  return {
    runId,
    steps: [],
    text: "",
    entities: [],
    approvals: [],
    expanded: true,
    status: "running",
    startedAt: Date.now(),
  };
}

function applyEvent(run: RunViewModel, event: AgentEvent): RunViewModel {
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
    case "tool.completed":
      if (event.structured) {
        next.entities = mergeStructuredPayload(next.entities, event.structured);
      }
      break;
    case "entities.created":
    case "entities.updated":
      if (event.entityType === "linear_issue") {
        next.entities = mergeStructuredPayload(next.entities, {
          type: "linear_issues",
          items: event.items as import("./types").LinearIssueEntity[],
        });
      } else if (event.entityType === "linear_issue_moved") {
        next.entities = mergeStructuredPayload(next.entities, {
          type: "linear_issues_moved",
          items: event.items as import("./types").LinearIssueEntity[],
        });
      } else if (event.entityType === "linear_issue_completed") {
        next.entities = mergeStructuredPayload(next.entities, {
          type: "linear_issues_completed",
          items: event.items as import("./types").LinearIssueEntity[],
        });
      } else if (event.entityType === "calendar_event") {
        next.entities = mergeStructuredPayload(next.entities, {
          type: "calendar_events",
          items: event.items as import("./types").CalendarEventEntity[],
        });
      } else if (event.entityType === "whoop_snapshot") {
        next.entities = mergeStructuredPayload(next.entities, {
          type: "whoop_snapshots",
          items: event.items as import("./types").WhoopSnapshotEntity[],
        });
      } else if (event.entityType === "morning_review_meta") {
        const meta = (event.items as import("./types").MorningReviewMetaEntity[])[0];
        if (meta) {
          next.entities = mergeStructuredPayload(next.entities, {
            type: "morning_review_meta",
            meta,
          });
        }
      } else if (event.entityType === "good_night_meta") {
        const meta = (event.items as import("./types").GoodNightMetaEntity[])[0];
        if (meta) {
          next.entities = mergeStructuredPayload(next.entities, {
            type: "good_night_meta",
            meta,
          });
        }
      } else {
        next.entities = mergeStructuredPayload(next.entities, {
          type: "markdown_files",
          items: event.items as import("./types").MarkdownFileEntity[],
        });
      }
      break;
    case "approval.requested":
      next.approvals.push({
        approvalId: event.approvalId,
        summary: event.summary,
        action: event.action,
        path: event.path,
      });
      break;
    case "approval.resolved":
      next.approvals = next.approvals.map((approval) =>
        approval.approvalId === event.approvalId
          ? { ...approval, resolved: true, approved: event.approved }
          : approval,
      );
      break;
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
      next.text += `\n\n${"message" in event ? event.message : "Run failed"}`;
      next.expanded = false;
      break;
    default:
      break;
  }

  return next;
}

export type ChatViewHandle = {
  focusComposer: () => void;
  blurComposer: () => void;
};

const voiceModeFocusGuardRef = { current: false };
const composerFocusSuspendedRef = { current: false };

function scheduleComposerFocus(focus: () => void) {
  if (voiceModeFocusGuardRef.current) return;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (voiceModeFocusGuardRef.current) return;
      focus();
    });
  });
}

export const ChatView = forwardRef<
  ChatViewHandle,
  {
    sessionId: string;
    isActive?: boolean;
    initialMessages?: ChatMessage[];
    initialRuns?: Record<string, RunViewModel>;
    onTitleChange?: (title: string) => void;
    onStateChange?: (messages: ChatMessage[], runs: Record<string, RunViewModel>) => void;
    onBeforeSessionClear?: () => void;
    onSessionClear?: (title: string) => void;
    onNavigateToView?: (view: AppView) => void;
  }
>(function ChatView(
  {
    sessionId,
    isActive = true,
    initialMessages = [],
    initialRuns = {},
    onTitleChange,
    onStateChange,
    onBeforeSessionClear,
    onSessionClear,
    onNavigateToView,
  },
  ref,
) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [runs, setRuns] = useState<Record<string, RunViewModel>>(initialRuns);
  const [input, setInput] = useState("");
  const [composerQuickActionId, setComposerQuickActionId] = useState<string | null>(null);
  const [goodMorningAwaitingFeel, setGoodMorningAwaitingFeel] = useState(false);
  const [goodNightAwaitingReflection, setGoodNightAwaitingReflection] = useState(false);
  const [goodNightReflectionAnswers, setGoodNightReflectionAnswers] = useState<string[]>([]);
  const [goodNightReflectionThinking, setGoodNightReflectionThinking] = useState(false);
  const [letterAwaitingConfirm, setLetterAwaitingConfirm] = useState(false);
  const [morningReviewUsageVersion, setMorningReviewUsageVersion] = useState(0);
  const goodMorningFeelActivatedRef = useRef(new Set<string>());
  const goodNightReflectionActivatedRef = useRef(new Set<string>());
  const letterConfirmActivatedRef = useRef(new Set<string>());
  const goodNightReflectionTimerRef = useRef<number | null>(null);
  const reflectionPayloadRef = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [diff, setDiff] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [previewTarget, setPreviewTarget] = useState<AttachmentPreviewTarget | null>(null);
  const [composerMode, setComposerMode] = useState<ComposerMode>("auto");
  const [composerModeLabel, setComposerModeLabel] = useState(() =>
    composerModeDisplayName("auto"),
  );
  const [savingComposerMode, setSavingComposerMode] = useState(false);
  const [uiPreviewOpen, setUiPreviewOpen] = useState(false);
  const [committedTools, setCommittedTools] = useState<ToolSelection | null>(null);
  const [toolPins, setToolPins] = useState<ToolPinSelection>(EMPTY_TOOL_PINS);
  const composerRef = useRef<ComposerHandle>(null);
  const chatContentRef = useRef<HTMLDivElement>(null);
  const composerStackRef = useRef<HTMLDivElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const dragDepthRef = useRef(0);
  const pendingAttachmentsRef = useRef(pendingAttachments);
  const prevRunStatusRef = useRef<Record<string, RunViewModel["status"]>>({});
  const liveRunIdRef = useRef<string | null>(null);
  const streamControllerRef = useRef<AbortController | null>(null);
  const cancellingRef = useRef(false);
  const ttsSessionReadyRef = useRef(false);
  const prefetchedRunIdsRef = useRef(new Set<string>());
  const typingAnimatedRunIdsRef = useRef(new Set<string>());
  const titleUpdatedRef = useRef(initialMessages.some((message) => message.role === "user"));
  const onStateChangeRef = useRef(onStateChange);
  useEffect(() => {
    onStateChangeRef.current = onStateChange;
  }, [onStateChange]);
  pendingAttachmentsRef.current = pendingAttachments;
  const handleSendRef = useRef<(messageText?: string, quickActionId?: string) => Promise<void>>(
    async () => {},
  );
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

  const scrollTranscriptToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    const el = transcriptRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  const handleTranscriptScroll = useCallback(() => {
    const el = transcriptRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distanceFromBottom < 64;
  }, []);

  const focusComposer = useCallback(() => {
    if (composerFocusSuspendedRef.current) return;
    scheduleComposerFocus(() => {
      composerRef.current?.focus();
    });
  }, []);

  const blurComposer = useCallback(() => {
    composerFocusSuspendedRef.current = true;
    composerRef.current?.blur();
  }, []);

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

  useEffect(() => {
    if (!isActive) {
      composerFocusSuspendedRef.current = false;
    }
  }, [isActive]);

  useImperativeHandle(ref, () => ({ focusComposer, blurComposer }), [blurComposer, focusComposer]);

  const handleCancelRun = useCallback(async () => {
    void stopSpeaking();

    const runId = liveRunIdRef.current;
    streamControllerRef.current?.abort();

    if (runId && !cancellingRef.current) {
      cancellingRef.current = true;

      try {
        await cancelRun(runId);
      } catch {
        // Still stop locally if the cancel request fails.
      }

      setRuns((current) => {
        const existing = current[runId];
        if (!existing || existing.status !== "running") return current;
        return {
          ...current,
          [runId]: { ...existing, status: "cancelled", expanded: false },
        };
      });

      liveRunIdRef.current = null;
      cancellingRef.current = false;
    }

    setBusy(false);
    focusComposer();
  }, [focusComposer, stopSpeaking]);

  const handleInterrupt = useCallback(async () => {
    interruptVoice();
    await handleCancelRun();
  }, [handleCancelRun, interruptVoice]);

  const toggleUiPreview = useCallback(() => {
    setUiPreviewOpen((current) => !current);
    focusComposer();
  }, [focusComposer]);

  const composerTools = useMemo(() => {
    if (input.trim()) {
      return resolveToolSelection(input, toolPins);
    }
    if (committedTools) return committedTools;
    return EMPTY_TOOLS;
  }, [committedTools, input, toolPins]);

  const handleToggleToolPin = useCallback((tool: keyof ToolSelection) => {
    setToolPins((current) => ({
      ...current,
      [tool]: cycleToolPin(current[tool]),
    }));
  }, []);

  useRunUiPreviewShortcut(toggleUiPreview);

  useEffect(() => {
    void (async () => {
      try {
        const settings = await getSettings();
        const nextComposerMode = composerModeFromSettings(
          settings.executionMode,
          settings.modelMode,
        );
        setComposerMode(nextComposerMode);
        setComposerModeLabel(
          composerModeDisplayName(
            nextComposerMode,
            nextComposerMode === "test" ? undefined : settings.modelName,
          ),
        );
      } catch {
        // Model toggle falls back to auto when settings are unavailable.
      }
    })();
  }, []);

  useEffect(() => {
    if (!isActive || voiceModeEnabled) return;

    focusComposer();

    function onWindowFocus() {
      if (isActive && !voiceModeFocusGuardRef.current) {
        focusComposer();
      }
    }

    window.addEventListener("focus", onWindowFocus);

    let unlistenTauriFocus: (() => void) | undefined;
    void import("@tauri-apps/api/window")
      .then(({ getCurrentWindow }) =>
        getCurrentWindow().onFocusChanged(({ payload: focused }) => {
          if (focused && isActive && !voiceModeFocusGuardRef.current) {
            focusComposer();
          } else if (!focused) {
            void setTrafficLightsVisible(false);
          }
        }),
      )
      .then((unlisten) => {
        unlistenTauriFocus = unlisten;
      })
      .catch(() => {
        // Browser dev mode has no Tauri window APIs.
      });

    return () => {
      window.removeEventListener("focus", onWindowFocus);
      unlistenTauriFocus?.();
    };
  }, [focusComposer, isActive, voiceModeEnabled]);

  useEffect(() => {
    if (!isActive) return;

    function onKeyDown(event: KeyboardEvent) {
      if (!event.ctrlKey || event.metaKey || event.altKey) return;
      if (isShortcutBlockedTarget(event.target)) return;

      const key = event.key.toLowerCase();

      if (key === "v" && voiceModeSupported) {
        event.preventDefault();
        toggleVoiceMode();
        return;
      }

      if (key === "c") {
        if (shouldAllowCopyShortcut(event.target)) return;
        event.preventDefault();
        void handleInterrupt();
      }
    }

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [handleInterrupt, isActive, toggleVoiceMode, voiceModeSupported]);

  useEffect(() => {
    if (!isActive || voiceModeEnabled) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isShortcutBlockedTarget(event.target)) return;

      if (event.key === "Tab" && !event.shiftKey) {
        if (isComposerShortcutTarget(event.target)) return;
        event.preventDefault();
        event.stopPropagation();
        composerFocusSuspendedRef.current = false;
        composerRef.current?.focus();
        return;
      }

      if (event.key === "Escape" && composerRef.current?.isFocused()) {
        event.preventDefault();
        event.stopPropagation();
        blurComposer();
      }
    }

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [blurComposer, isActive, voiceModeEnabled]);

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
          const validationError = validateAttachment(file, next.length);
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

  const runCount = useMemo(() => Object.keys(runs).length, [runs]);

  const refreshDiff = useCallback(async () => {
    try {
      const result = await getWorkspaceDiff();
      setDiff(result.diff);
    } catch {
      setDiff("");
    }
  }, []);

  useEffect(() => {
    void refreshDiff();
  }, [refreshDiff, runCount]);

  useEffect(() => {
    const content = chatContentRef.current;
    const stack = composerStackRef.current;
    if (!content || !stack) return;

    const syncComposerLayout = () => {
      const stackHeight = Math.ceil(stack.getBoundingClientRect().height);
      const fadeZone = Number.parseFloat(
        getComputedStyle(content).getPropertyValue("--transcript-fade-zone"),
      ) || 88;
      const reserve = stackHeight + fadeZone + 12;
      content.style.setProperty("--composer-input-reserve", `${reserve}px`);
      if (stickToBottomRef.current) {
        scrollTranscriptToBottom();
      }
    };

    syncComposerLayout();
    const observer = new ResizeObserver(syncComposerLayout);
    observer.observe(stack);
    return () => observer.disconnect();
  }, [scrollTranscriptToBottom]);

  useLayoutEffect(() => {
    if (stickToBottomRef.current) {
      scrollTranscriptToBottom();
    }
  }, [messages, runs, error, transcribing, voiceModeEnabled, voiceTurnPhase, scrollTranscriptToBottom]);

  useEffect(() => {
    onStateChangeRef.current?.(messages, runs);
  }, [messages, runs]);

  useEffect(() => {
    for (const message of messages) {
      if (!isGoodMorningMessage(message.quickActionId) || !message.runId) continue;
      if (goodMorningFeelActivatedRef.current.has(message.runId)) continue;

      const run = runs[message.runId];
      if (run?.status !== "finished") continue;

      goodMorningFeelActivatedRef.current.add(message.runId);
      setComposerQuickActionId(GOOD_MORNING_ACTION_ID);
      setGoodMorningAwaitingFeel(true);
      scheduleComposerFocus(() => {
        composerRef.current?.focus();
      });
    }
  }, [messages, runs]);

  useEffect(() => {
    for (const message of messages) {
      if (!isLetterMessage(message.quickActionId) || !message.runId) continue;
      if (letterConfirmActivatedRef.current.has(message.runId)) continue;

      const run = runs[message.runId];
      if (run?.status !== "finished") continue;

      letterConfirmActivatedRef.current.add(message.runId);
      setComposerQuickActionId(LETTER_ACTION_ID);
      setLetterAwaitingConfirm(true);
      scheduleComposerFocus(() => {
        composerRef.current?.focus();
      });
    }
  }, [messages, runs]);

  useEffect(() => {
    for (const message of messages) {
      if (!isGoodNightMessage(message.quickActionId) || !message.runId) continue;
      if (goodNightReflectionActivatedRef.current.has(message.runId)) continue;

      const run = runs[message.runId];
      if (run?.status !== "finished") continue;

      goodNightReflectionActivatedRef.current.add(message.runId);

      if (goodNightReflectionTimerRef.current != null) {
        window.clearTimeout(goodNightReflectionTimerRef.current);
      }

      goodNightReflectionTimerRef.current = window.setTimeout(() => {
        goodNightReflectionTimerRef.current = null;
        setComposerQuickActionId(GOOD_NIGHT_ACTION_ID);
        setGoodNightAwaitingReflection(true);
        setGoodNightReflectionAnswers([]);
        setMessages((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            text: getGoodNightReflectionQuestion(0),
            flowVariant: "good-night",
            createdAt: Date.now(),
          },
        ]);
        scheduleComposerFocus(() => {
          composerRef.current?.focus();
        });
      }, GOOD_NIGHT_REFLECTION_THINKING_MS);
    }
  }, [messages, runs]);

  useEffect(() => {
    if (!ttsSupported || !latestFinishedRunId) return;
    if (prefetchedRunIdsRef.current.has(latestFinishedRunId)) return;

    const run = runs[latestFinishedRunId];
    if (!run?.text.trim()) return;

    prefetchedRunIdsRef.current.add(latestFinishedRunId);
    prefetchSpeech(run.text, { playbackId: latestFinishedRunId });
  }, [ttsSupported, latestFinishedRunId, runs]);

  useEffect(() => {
    if (!isActive) return;

    if (!ttsSessionReadyRef.current) {
      for (const [runId, run] of Object.entries(runs)) {
        prevRunStatusRef.current[runId] = run.status;
      }
      ttsSessionReadyRef.current = true;
      return;
    }

    if (!ttsEnabled) return;

    const liveRunId = liveRunIdRef.current;
    if (!liveRunId) return;

    const run = runs[liveRunId];
    if (!run?.text.trim()) return;

    const previousStatus = prevRunStatusRef.current[liveRunId];

    if (run.status === "running") {
      advanceStreamingTts(liveRunId, run.text, false);
    } else if (run.status === "finished" && previousStatus === "running") {
      advanceStreamingTts(liveRunId, run.text, true);
      if (ttsSupported) {
        prefetchedRunIdsRef.current.add(liveRunId);
        prefetchSpeech(run.text, { playbackId: liveRunId, priority: true });
      }
    }

    prevRunStatusRef.current[liveRunId] = run.status;
  }, [runs, ttsEnabled, ttsSupported, advanceStreamingTts, isActive]);

  async function handleClearChat() {
    void stopSpeaking();
    onBeforeSessionClear?.();

    if (busy) {
      await handleCancelRun();
    }

    setBusy(true);
    setError(null);
    setInput("");
    setPendingAttachments([]);
    setCommittedTools(null);

    try {
      const result = await clearSessionChat(sessionId);
      setMessages([]);
      setRuns({});
      prevRunStatusRef.current = {};
      setComposerQuickActionId(null);
      setGoodMorningAwaitingFeel(false);
      setGoodNightAwaitingReflection(false);
      setGoodNightReflectionAnswers([]);
      setGoodNightReflectionThinking(false);
      setLetterAwaitingConfirm(false);
      goodMorningFeelActivatedRef.current.clear();
      goodNightReflectionActivatedRef.current.clear();
      letterConfirmActivatedRef.current.clear();
      if (goodNightReflectionTimerRef.current != null) {
        window.clearTimeout(goodNightReflectionTimerRef.current);
        goodNightReflectionTimerRef.current = null;
      }
      reflectionPayloadRef.current = null;
      liveRunIdRef.current = null;
      titleUpdatedRef.current = false;
      stickToBottomRef.current = true;
      onSessionClear?.(result.title);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear chat");
    } finally {
      setBusy(false);
      focusComposer();
    }
  }

  function recordMorningReviewUsage() {
    markMorningReviewUsedToday();
    setMorningReviewUsageVersion((version) => version + 1);
  }

  const scheduleNextGoodNightQuestion = useCallback((questionIndex: number) => {
    setGoodNightReflectionThinking(true);
    if (goodNightReflectionTimerRef.current != null) {
      window.clearTimeout(goodNightReflectionTimerRef.current);
    }
    goodNightReflectionTimerRef.current = window.setTimeout(() => {
      goodNightReflectionTimerRef.current = null;
      setGoodNightReflectionThinking(false);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: getGoodNightReflectionQuestion(questionIndex),
          flowVariant: "good-night",
          createdAt: Date.now(),
        },
      ]);
      scheduleComposerFocus(() => {
        composerRef.current?.focus();
      });
    }, GOOD_NIGHT_REFLECTION_THINKING_MS);
  }, []);

  async function handleSend(messageText?: string, quickActionId?: string) {
    const rawText = (messageText ?? input).trim();

    if (parseChatCommand(rawText) === "clear") {
      if (!messageText) {
        setInput("");
      }
      await handleClearChat();
      return;
    }

    if (parseGoodMorningShortcut(rawText)) {
      if (!messageText) {
        setInput("");
        setComposerQuickActionId(null);
      }
      setGoodMorningAwaitingFeel(false);
      recordMorningReviewUsage();
      await handleSendRef.current(MORNING_REVIEW_MESSAGE, GOOD_MORNING_ACTION_ID);
      return;
    }

    if (parseGoodNightShortcut(rawText)) {
      if (!messageText) {
        setInput("");
        setComposerQuickActionId(null);
      }
      setGoodNightAwaitingReflection(false);
      setGoodNightReflectionAnswers([]);
      await handleSendRef.current(GOOD_NIGHT_MESSAGE, GOOD_NIGHT_ACTION_ID);
      return;
    }

    if (parseLetterShortcut(rawText)) {
      if (!messageText) {
        setInput("");
        setComposerQuickActionId(null);
      }
      setLetterAwaitingConfirm(false);
      await handleSendRef.current(LETTER_MESSAGE, LETTER_ACTION_ID);
      return;
    }

    const dcShortcut = parseDailyCaptureShortcut(rawText);

    if (dcShortcut?.kind === "activate") {
      if (!messageText) {
        setInput("");
      }
      setComposerQuickActionId(DAILY_CAPTURE_ACTION_ID);
      focusComposer();
      return;
    }

    const text = dcShortcut?.kind === "send" ? dcShortcut.body : rawText;
    const inGoodMorningMode = isGoodMorningComposerMode(composerQuickActionId);
    const inGoodNightMode = isGoodNightComposerMode(composerQuickActionId);
    const inLetterMode = isLetterComposerMode(composerQuickActionId);
    const isVoiceSend = messageText !== undefined;

    if (
      inGoodNightMode &&
      goodNightAwaitingReflection &&
      !isGoodNightMessage(quickActionId) &&
      !parseGoodNightShortcut(rawText)
    ) {
      if (goodNightReflectionThinking) return;
      if (!text && pendingAttachments.length === 0) return;
      if (busy && !isVoiceSend) return;

      void stopSpeaking();
      if (!messageText) {
        setInput("");
      }

      const nextAnswers = [...goodNightReflectionAnswers, text];
      setGoodNightReflectionAnswers(nextAnswers);

      if (nextAnswers.length < GOOD_NIGHT_REFLECTION_COUNT) {
        const reflectionUserMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: "user",
          text,
          createdAt: Date.now(),
          quickActionId: GOOD_NIGHT_REFLECTION_ACTION_ID,
          flowVariant: "good-night",
        };
        stickToBottomRef.current = true;
        setMessages((current) => [...current, reflectionUserMessage]);
        scheduleNextGoodNightQuestion(nextAnswers.length);
        return;
      }

      reflectionPayloadRef.current = serializeGoodNightReflectionAnswers(nextAnswers);
      setGoodNightAwaitingReflection(false);
      setComposerQuickActionId(null);
      setGoodNightReflectionAnswers([]);
    }

    const effectiveQuickActionId =
      reflectionPayloadRef.current != null
        ? GOOD_NIGHT_REFLECTION_ACTION_ID
        : quickActionId ??
      (dcShortcut?.kind === "send"
        ? DAILY_CAPTURE_ACTION_ID
        : inLetterMode && letterAwaitingConfirm
          ? LETTER_CONFIRM_ACTION_ID
        : inGoodMorningMode && goodMorningAwaitingFeel
          ? GOOD_MORNING_FEEL_ACTION_ID
          : composerQuickActionId) ??
      undefined;
    const isDailyCapture = isDailyCaptureMessage(effectiveQuickActionId);
    const isGoodMorningFeel = isGoodMorningFeelMessage(effectiveQuickActionId);

    if (
      inGoodMorningMode &&
      !goodMorningAwaitingFeel &&
      !isGoodMorningMessage(quickActionId) &&
      !parseGoodMorningShortcut(rawText)
    ) {
      return;
    }

    if (
      inLetterMode &&
      !letterAwaitingConfirm &&
      !isLetterMessage(quickActionId) &&
      !parseLetterShortcut(rawText)
    ) {
      return;
    }

    if (
      inGoodNightMode &&
      !goodNightAwaitingReflection &&
      reflectionPayloadRef.current == null &&
      !isGoodNightMessage(quickActionId) &&
      !parseGoodNightShortcut(rawText)
    ) {
      return;
    }

    const displayText = isDailyCapture ? formatDailyCaptureLogEntry(text) : text;
    const reflectionPayload = reflectionPayloadRef.current;
    const agentText =
      reflectionPayload ?? (isDailyCapture ? wrapDailyCaptureForAgent(text) : text);
    if (reflectionPayload) {
      reflectionPayloadRef.current = null;
    }

    if (!text && pendingAttachments.length === 0 && !reflectionPayload) return;
    if (busy && !isVoiceSend) return;

    if (isVoiceSend && busy) {
      await handleCancelRun();
    }

    void stopSpeaking();

    const attachmentsToSend = shouldSendComposerAttachments(messageText, quickActionId)
      ? [...pendingAttachments]
      : messageText
        ? []
        : [...pendingAttachments];
    setBusy(true);
    setError(null);
    setCommittedTools(resolveToolSelection(agentText, toolPins));
    if (!messageText) {
      setInput("");
      setPendingAttachments([]);
      if (isDailyCapture || isGoodMorningFeel || isLetterConfirmMessage(effectiveQuickActionId)) {
        setComposerQuickActionId(null);
        if (isGoodMorningFeel) {
          setGoodMorningAwaitingFeel(false);
        }
        if (isLetterConfirmMessage(effectiveQuickActionId)) {
          setLetterAwaitingConfirm(false);
        }
      }
    }
    const pinsForSend = { ...toolPins };
    setToolPins(EMPTY_TOOL_PINS);
    focusComposer();

    const flowVariant =
      isGoodMorningFeel || isGoodMorningMessage(effectiveQuickActionId)
        ? "good-morning"
        : isGoodNightReflectionMessage(effectiveQuickActionId)
          ? "good-night"
          : isGoodNightMessage(effectiveQuickActionId)
            ? "good-night"
            : isLetterFlowMessage(effectiveQuickActionId)
              ? "letter"
            : undefined;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text: displayText,
      createdAt: Date.now(),
      quickActionId: effectiveQuickActionId,
      flowVariant,
      attachments: pendingAttachmentsToMessageAttachments(attachmentsToSend),
    };
    if (effectiveQuickActionId === GOOD_MORNING_ACTION_ID) {
      recordMorningReviewUsage();
    }
    stickToBottomRef.current = true;
    setMessages((current) => [...current, userMessage]);

    if (!titleUpdatedRef.current && displayText) {
      titleUpdatedRef.current = true;
      onTitleChange?.(displayText);
    }

    let streamController: AbortController | null = null;

    try {
      const wireAttachments =
        attachmentsToSend.length > 0
          ? await pendingAttachmentsToWire(attachmentsToSend)
          : [];
      const { runId, attachments: serverAttachments } = await sendMessage(
        sessionId,
        agentText,
        wireAttachments.length > 0 ? wireAttachments : undefined,
        pinsForSend,
        effectiveQuickActionId,
      );
      liveRunIdRef.current = runId;
      typingAnimatedRunIdsRef.current.add(runId);
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

      streamController = new AbortController();
      streamControllerRef.current = streamController;
      const activeStreamController = streamController;
      const streamTimeout = window.setTimeout(() => activeStreamController.abort(), 10 * 60 * 1000);

      try {
        await subscribeToRunWithAuth(
          sessionId,
          runId,
          (event) => {
            if (event.type === "context.added") {
              setMessages((current) =>
                current.map((message) =>
                  message.id === userMessage.id
                    ? {
                        ...message,
                        contextChips: (message.contextChips ?? []).some(
                          (chip) => chip.id === event.id,
                        )
                          ? message.contextChips
                          : [
                              ...(message.contextChips ?? []),
                              {
                                id: event.id,
                                title: event.title,
                                entityType: event.entityType,
                              },
                            ],
                      }
                    : message,
                ),
              );
            }

            setRuns((current) => {
              const existing = current[runId] ?? createEmptyRun(runId);
              return { ...current, [runId]: applyEvent(existing, event) };
            });
          },
          streamController.signal,
        );
      } finally {
        window.clearTimeout(streamTimeout);
        if (streamControllerRef.current === streamController) {
          streamControllerRef.current = null;
        }
      }

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
              text: `${existing.text}\n\nAgent stream ended before the run completed.`,
              expanded: false,
            },
          };
        });
      }

      await refreshDiff();
    } catch (err) {
      if (!streamController?.signal.aborted) {
        setError(err instanceof Error ? err.message : "Failed to send message");
        setPendingAttachments(attachmentsToSend);
      }
    } finally {
      if (!streamController?.signal.aborted) {
        liveRunIdRef.current = null;
        setBusy(false);
        setCommittedTools(null);
        focusComposer();
      }
    }
  }
  handleSendRef.current = handleSend;

  function activateDailyCaptureMode() {
    setComposerQuickActionId(DAILY_CAPTURE_ACTION_ID);
    setInput("");
    focusComposer();
  }

  function handleComposerInputChange(next: string) {
    if (/^\/dc\s$/i.test(next)) {
      activateDailyCaptureMode();
      return;
    }
    if (/^\/gm\s$/i.test(next)) {
      void handleTriggerGoodMorningShortcut();
      return;
    }
    if (/^\/gn\s$/i.test(next)) {
      void handleTriggerGoodNightShortcut();
      return;
    }
    if (/^\/letter\s$/i.test(next)) {
      void handleTriggerLetterShortcut();
      return;
    }
    setInput(next);
  }

  function handleQuickAction(action: QuickAction) {
    if (busy) return;
    if (isGoodMorningComposerMode(composerQuickActionId)) return;
    if (isGoodNightComposerMode(composerQuickActionId)) return;
    if (isLetterComposerMode(composerQuickActionId)) return;
    if (action.behavior === "send") {
      setComposerQuickActionId(null);
      void handleSendRef.current(action.message, action.id);
      return;
    }
    setComposerQuickActionId(action.id);
    setInput(action.message);
    focusComposer();
  }

  function handleActivateDailyCaptureShortcut() {
    if (
      busy ||
      isDailyCaptureMessage(composerQuickActionId ?? undefined) ||
      isGoodMorningComposerMode(composerQuickActionId) ||
      isGoodNightComposerMode(composerQuickActionId) ||
      isLetterComposerMode(composerQuickActionId)
    ) {
      return;
    }
    activateDailyCaptureMode();
  }

  function handleClearGoodMorningMode() {
    setComposerQuickActionId(null);
    setGoodMorningAwaitingFeel(false);
  }

  function handleClearGoodNightMode() {
    setComposerQuickActionId(null);
    setGoodNightAwaitingReflection(false);
    setGoodNightReflectionAnswers([]);
    setGoodNightReflectionThinking(false);
    if (goodNightReflectionTimerRef.current != null) {
      window.clearTimeout(goodNightReflectionTimerRef.current);
      goodNightReflectionTimerRef.current = null;
    }
  }

  function handleClearLetterMode() {
    setComposerQuickActionId(null);
    setLetterAwaitingConfirm(false);
  }

  function handleTriggerGoodMorningShortcut() {
    if (busy || isGoodMorningComposerMode(composerQuickActionId)) return;
    setComposerQuickActionId(null);
    setGoodMorningAwaitingFeel(false);
    setInput("");
    void handleSendRef.current(MORNING_REVIEW_MESSAGE, GOOD_MORNING_ACTION_ID);
  }

  function handleTriggerGoodNightShortcut() {
    if (busy || isGoodNightComposerMode(composerQuickActionId)) return;
    setComposerQuickActionId(null);
    setGoodNightAwaitingReflection(false);
    setGoodNightReflectionAnswers([]);
    setInput("");
    void handleSendRef.current(GOOD_NIGHT_MESSAGE, GOOD_NIGHT_ACTION_ID);
  }

  function handleTriggerLetterShortcut() {
    if (busy || isLetterComposerMode(composerQuickActionId)) return;
    const hasPdf = pendingAttachmentsRef.current.some(
      (attachment) =>
        attachment.mimeType === "application/pdf" ||
        attachment.name.toLowerCase().endsWith(".pdf"),
    );
    if (!hasPdf) {
      setError("Attach a PDF letter before running /letter.");
      return;
    }
    setComposerQuickActionId(null);
    setLetterAwaitingConfirm(false);
    setInput("");
    void handleSendRef.current(LETTER_MESSAGE, LETTER_ACTION_ID);
  }

  async function handleComposerModeChange(nextMode: ComposerMode) {
    if (nextMode === composerMode || savingComposerMode) return;

    const previousMode = composerMode;
    const previousLabel = composerModeLabel;
    setComposerMode(nextMode);
    setComposerModeLabel(composerModeDisplayName(nextMode));
    setSavingComposerMode(true);
    setError(null);
    try {
      const result = await updateSettings(settingsFromComposerMode(nextMode));
      const resolvedMode = composerModeFromSettings(
        result.executionMode,
        result.modelMode,
      );
      setComposerMode(resolvedMode);
      setComposerModeLabel(
        composerModeDisplayName(
          resolvedMode,
          resolvedMode === "test" ? undefined : result.modelName,
        ),
      );
    } catch (err) {
      setComposerMode(previousMode);
      setComposerModeLabel(previousLabel);
      setError(err instanceof Error ? err.message : "Failed to update composer mode");
    } finally {
      setSavingComposerMode(false);
      focusComposer();
    }
  }

  const openLinearDashboard = useCallback(() => {
    onNavigateToView?.("linear");
  }, [onNavigateToView]);

  const openWhoopDashboard = useCallback(() => {
    onNavigateToView?.("whoop");
  }, [onNavigateToView]);

  async function handleApproval(approvalId: string, approved: boolean) {
    await respondApproval(approvalId, approved);
    focusComposer();
  }

  return (
    <div className="chat-view">
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
        {messages.map((message) => {
          const run = message.runId ? runs[message.runId] : undefined;
          const isGoodMorningFlow =
            message.role === "user" &&
            (isGoodMorningFlowMessage(message.quickActionId) ||
              message.flowVariant === "good-morning");
          const isGoodNightFlow =
            message.role === "user" &&
            (isGoodNightFlowMessage(message.quickActionId) ||
              message.flowVariant === "good-night");
          const isLetterFlow =
            message.role === "user" &&
            (isLetterFlowMessage(message.quickActionId) ||
              message.flowVariant === "letter");

          return (
            <div key={message.id} className="chat-turn">
              <div className={`chat-message ${message.role === "user" ? "user" : "assistant"}`}>
                {message.text && (
                  <>
                    {message.role === "user" && (
                      <div className="chat-message-meta">
                        <span className="chat-message-meta-label">you</span>
                        {message.createdAt != null && (
                          <span className="chat-message-meta-timestamp">
                            {formatMessageTimestamp(message.createdAt)}
                          </span>
                        )}
                      </div>
                    )}
                    {isDailyCaptureMessage(message.quickActionId) && (
                      <span className="chat-quick-action-tag chat-quick-action-tag-daily-capture">
                        {DAILY_CAPTURE_LABEL}
                      </span>
                    )}
                    {isLetterFlow && (
                      <span className="chat-quick-action-tag chat-quick-action-tag-letter">
                        {LETTER_LABEL}
                      </span>
                    )}
                    <div
                      className={`bubble ${
                        message.quickActionId &&
                        !isDailyCaptureMessage(message.quickActionId) &&
                        !isGoodMorningFlow &&
                        !isGoodNightFlow &&
                        !isLetterFlow
                          ? "bubble-quick-action"
                          : ""
                      }`}
                    >
                      {isGoodMorningMessage(message.quickActionId)
                        ? MORNING_REVIEW_MESSAGE
                        : isGoodNightMessage(message.quickActionId)
                          ? GOOD_NIGHT_MESSAGE
                          : isLetterMessage(message.quickActionId)
                            ? LETTER_MESSAGE
                          : message.text}
                    </div>
                    {!isGoodMorningMessage(message.quickActionId) &&
                      !isGoodNightMessage(message.quickActionId) &&
                      !isLetterFlow && (
                      <MessageActions text={message.text} />
                    )}
                  </>
                )}
                {message.attachments && message.attachments.length > 0 && (
                  <div className="message-attachments">
                    {message.attachments.map((attachment) => (
                      <AttachmentChip
                        key={`${message.id}-${attachment.name}-${attachment.vaultPath ?? "local"}`}
                        attachment={attachment}
                        onOpen={() => setPreviewTarget(toAttachmentPreviewTarget(attachment))}
                      />
                    ))}
                  </div>
                )}
                {message.contextChips
                  ?.filter(isValidLinearContextChip)
                  .map((chip) => (
                    <ContextChip key={chip.id} id={chip.id} title={chip.title} />
                  ))}
              </div>

              {run && (
                <RunBlock
                  run={run}
                  typingAnimated={typingAnimatedRunIdsRef.current.has(run.runId)}
                  sourceBrand={
                    isGoodMorningFlowMessage(message.quickActionId) ||
                    isGoodNightMessage(message.quickActionId)
                      ? "backster"
                      : undefined
                  }
                  onToggle={() =>
                    setRuns((current) => ({
                      ...current,
                      [run.runId]: {
                        ...current[run.runId],
                        expanded: !current[run.runId].expanded,
                      },
                    }))
                  }
                  onApprove={(approvalId) => void handleApproval(approvalId, true)}
                  onReject={(approvalId) => void handleApproval(approvalId, false)}
                  canSpeak={
                    ttsSupported &&
                    run.status !== "running" &&
                    run.text.trim().length > 0 &&
                    !voiceModeEnabled
                  }
                  voiceModeEnabled={voiceModeEnabled}
                  onOpenLinearDashboard={openLinearDashboard}
                  onOpenWhoopDashboard={openWhoopDashboard}
                />
              )}
            </div>
          );
        })}

        {voiceTurnPhase && (
          <VoiceTurnBubble phase={voiceTurnPhase} />
        )}

        {error && <div className="error-banner">{error}</div>}
        {voiceModeEnabled && voiceModeError && (
          <div className="error-banner">{voiceModeError}</div>
        )}
          </div>
          </div>
        </div>

        {diff && (
          <div className="diff-panel">
            <div className="diff-header">
              {/* Workspace diff is shared across all tabs using the same notes folder. */}
              <strong>Workspace diff</strong>
              <button type="button" onClick={() => void revertWorkspace().then(refreshDiff)}>
                Revert
              </button>
            </div>
            <pre>{diff}</pre>
          </div>
        )}

        <div
          className={`composer-stack ${voiceModeEnabled ? "composer-stack-voice-mode" : ""}`}
          ref={composerStackRef}
        >
          <Composer
            ref={composerRef}
            value={input}
            onChange={handleComposerInputChange}
            onEscapeBlur={blurComposer}
            onComposerFocus={() => {
              composerFocusSuspendedRef.current = false;
            }}
            onSend={() => void handleSend()}
            onActivateDailyCaptureShortcut={handleActivateDailyCaptureShortcut}
            onTriggerGoodMorningShortcut={handleTriggerGoodMorningShortcut}
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
            composerMode={composerMode}
            composerModeLabel={composerModeLabel}
            onComposerModeChange={(mode) => void handleComposerModeChange(mode)}
            savingComposerMode={savingComposerMode}
            uiPreview={
              import.meta.env.DEV
                ? { open: uiPreviewOpen, onToggle: toggleUiPreview }
                : undefined
            }
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
            voiceMode={voiceModeEnabled}
            toolIndicators={composerTools}
            toolPins={toolPins}
            onToggleToolPin={handleToggleToolPin}
            composerQuickAction={
              isDailyCaptureMessage(composerQuickActionId ?? undefined)
                ? {
                    label: DAILY_CAPTURE_LABEL,
                    placeholder: "What do you want to capture in today's daily note?",
                    onClear: () => setComposerQuickActionId(null),
                    tagVariant: "daily-capture",
                  }
                : isGoodMorningComposerMode(composerQuickActionId)
                  ? {
                      label: GOOD_MORNING_LABEL,
                      placeholder: goodMorningAwaitingFeel
                        ? "How do you feel? How was your sleep?"
                        : "Reply…",
                      onClear: handleClearGoodMorningMode,
                      tagVariant: "good-morning",
                    }
                  : isGoodNightComposerMode(composerQuickActionId)
                    ? {
                        label: GOOD_NIGHT_LABEL,
                        placeholder: goodNightAwaitingReflection
                          ? getGoodNightReflectionPlaceholder(
                              goodNightReflectionAnswers.length,
                            )
                          : "Reply…",
                        onClear: handleClearGoodNightMode,
                        tagVariant: "good-night",
                      }
                    : isLetterComposerMode(composerQuickActionId)
                      ? {
                          label: LETTER_LABEL,
                          placeholder: letterAwaitingConfirm
                            ? LETTER_CONFIRM_PLACEHOLDER
                            : "Reply…",
                          onClear: handleClearLetterMode,
                          tagVariant: "letter",
                        }
                    : undefined
            }
            onTriggerGoodNightShortcut={handleTriggerGoodNightShortcut}
            onTriggerLetterShortcut={handleTriggerLetterShortcut}
            quickActions={
              voiceModeEnabled
                ? undefined
                : {
                    disabled: busy,
                    morningReviewUsageVersion,
                    onAction: handleQuickAction,
                  }
            }
          />
        </div>
      </div>
    </div>
  );
});
