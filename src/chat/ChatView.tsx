import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { VirtualList, useVirtualListEnabled } from "../ui/VirtualList";
import { showsBacksterComposerOptions, isLinearOnlyComposer } from "../app/rightPanelAgents";
import type { PanelChatComposerVariant } from "../app/rightPanelAgents";
import { ChatTurn } from "./ChatTurn";
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
import { ComposerContextCard } from "./ComposerContextCard";
import type { ComposerContextItem } from "../lib/chatFocusContext";
import { VoiceTurnBubble } from "./VoiceTurnBubble";
import { parseChatCommand } from "./chatCommands";
import {
  composerModeDisplayName,
  composerModeFromSettings,
  settingsFromComposerMode,
  type ComposerMode,
} from "./composerMode";
import {
  formatAutomationFlowCancellationMessage,
  isAutomationComposerFlow,
  resolveActiveAutomationFlow,
} from "./automationFlow";
import { resolveAutomationFlowByComposerMode } from "./automation/registry";
import {
  resolveAutomationFlowVariant,
  resolveAutomationFlowForOutgoingMessage,
  shouldBlockRegisteredAutomationComposerSend,
} from "./automation/orchestration";
import { createFlowAssistantMessage } from "./automation/followUp";
import { useAutomationOrchestration } from "./automation/useAutomationOrchestration";
import { useTranscriptPacing } from "./useTranscriptPacing";
import {
  GOOD_MORNING_ACTION_ID,
  isGoodMorningComposerMode,
  isGoodMorningFeelMessage,
  isGoodMorningWakeMessage,
  markMorningReviewUsedToday,
  MORNING_REVIEW_MESSAGE,
  parseGoodMorningShortcut,
} from "./morningReview";
import {
  DAILY_CAPTURE_ACTION_ID,
  formatDailyCaptureLogEntry,
  formatDailyCaptureLogTime,
  isDailyCaptureComposerMode,
  isDailyCaptureMessage,
  normalizeDailyCaptureLogTime,
  parseDailyCaptureShortcut,
} from "./dailyCapture";
import {
  GROCERY_LIST_ACTION_ID,
  isGroceryListComposerMode,
  isGroceryListMessage,
  parseGroceryShortcut,
} from "./groceryList";
import {
  formatCurrentGroceryWeekNumber,
  formatGroceryLogEntry,
  normalizeGroceryWeekNumber,
} from "./groceryWeek";
import type { GroceryWeekTagHandle } from "./GroceryWeekTag";
import type { DailyCaptureTimeTagHandle } from "./DailyCaptureTimeTag";
import {
  GOOD_NIGHT_ACTION_ID,
  GOOD_NIGHT_MESSAGE,
  isGoodNightComposerMode,
  isGoodNightMessage,
  isGoodNightReflectionMessage,
  parseGoodNightShortcut,
} from "./goodNight";
import {
  isLetterComposerMode,
  isLetterConfirmComposerMode,
  isLetterConfirmMessage,
  isLetterFlowMessage,
  isLetterMessage,
  LETTER_ACTION_ID,
  LETTER_CONFIRM_ACTION_ID,
  LETTER_MESSAGE,
  parseLetterShortcut,
  shouldSendComposerAttachments,
} from "./letter";
import {
  DELETE_FILE_ACTION_ID,
  DELETE_FILE_CONFIRM_USER_MESSAGE,
  DELETE_FILE_DECLINE_USER_MESSAGE,
  detectDeleteFileIntent,
  findActiveDeleteConfirmRunId,
  formatDeleteFileAssistantReply,
  isDeleteFileComposerMode,
  isDeleteFileMessage,
  parseDeleteShortcut,
  shouldActivateDeleteFileFromComposerInput,
} from "./deleteFile";
import { LetterUploadModal } from "./LetterUploadModal";
import { isPdfAttachmentFile, isPdfPendingAttachment } from "./letterFiling";
import { isSlashCommandPaletteOpen, type SlashCommandDefinition } from "./slashCommands";
import { createRunEventBatcher } from "./runStreamUpdates";
import { mergeStructuredPayload } from "./runEntities";
import {
  EMPTY_TOOL_PINS,
  hasManualToolPins,
  resolveToolSelection,
  type ToolPinSelection,
  type ToolSelection,
} from "./tool-routing";
import type {
  AgentEvent,
  AttachmentPreviewTarget,
  ChatMessage,
  MessageAttachment,
  PendingAttachment,
  RunViewModel,
} from "./types";
import { useTextVoiceInput } from "../hooks/useTextVoiceInput";
import { useStreamingRunTts } from "../hooks/useStreamingRunTts";
import {
  getSettings,
  peekCachedSettings,
  getWorkspaceDiff,
  cancelRun,
  clearSessionChat,
  clearLetterPending,
  clearDeleteFilePending,
  fetchLetterPending,
  respondDeleteFile,
  respondApproval,
  revertWorkspace,
  sendMessage,
  updateSettings,
} from "../lib/api";
import { subscribeToRunWithAuth } from "../lib/sse";

const EMPTY_TOOLS: ToolSelection = { obsidian: false, linear: false, calendar: false, whoop: false };

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
    layout?: "default" | "panel";
    focusContext?: import("../lib/chatFocusContext").ChatFocusContext | null;
    composerContextItems?: ComposerContextItem[];
    composerContextLoading?: boolean;
    composerPlaceholder?: string;
    panelComposerVariant?: PanelChatComposerVariant;
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
    layout = "default",
    focusContext = null,
    composerContextItems = [],
    composerContextLoading = false,
    composerPlaceholder,
    panelComposerVariant,
  },
  ref,
) {
  const showBacksterComposerOptions = showsBacksterComposerOptions(
    layout,
    panelComposerVariant,
  );
  const linearOnlyComposer = isLinearOnlyComposer(panelComposerVariant);

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const [runs, setRuns] = useState<Record<string, RunViewModel>>(initialRuns);
  const [input, setInput] = useState("");
  const inputRef = useRef(input);
  inputRef.current = input;
  const [composerQuickActionId, setComposerQuickActionId] = useState<string | null>(null);
  const composerQuickActionIdRef = useRef<string | null>(null);
  composerQuickActionIdRef.current = composerQuickActionId;
  const [dailyCaptureLogTime, setDailyCaptureLogTime] = useState(() => formatDailyCaptureLogTime());
  const dailyCaptureTimeTouchedRef = useRef(false);
  const dailyCaptureTimeTagRef = useRef<DailyCaptureTimeTagHandle>(null);
  const [groceryWeekNumber, setGroceryWeekNumber] = useState(() => formatCurrentGroceryWeekNumber());
  const groceryWeekTouchedRef = useRef(false);
  const groceryWeekTagRef = useRef<GroceryWeekTagHandle>(null);
  const [letterUploadModalOpen, setLetterUploadModalOpen] = useState(false);
  const letterPdfInputRef = useRef<HTMLInputElement>(null);
  const {
    enqueueReveal,
    markPresentationActive,
    markPresentationComplete,
    clearPendingReveals,
    resetPacing,
  } = useTranscriptPacing();
  const automation = useAutomationOrchestration({
    messagesRef,
    enqueueReveal,
    setMessages,
    setComposerQuickActionId,
    focusComposer: () => {
      scheduleComposerFocus(() => {
        composerRef.current?.focus();
      });
    },
  });
  const letterConfirmActivatedRef = useRef(new Set<string>());
  const letterConfirmFinishedRef = useRef(new Set<string>());
  const [deleteConfirmResolved, setDeleteConfirmResolved] = useState<
    Record<string, { confirmed: boolean }>
  >({});
  const deleteConfirmResolvedRef = useRef(deleteConfirmResolved);
  deleteConfirmResolvedRef.current = deleteConfirmResolved;
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  busyRef.current = busy;
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
  const [committedTools, setCommittedTools] = useState<ToolSelection | null>(null);
  const [toolPins, setToolPins] = useState<ToolPinSelection>(EMPTY_TOOL_PINS);
  const composerRef = useRef<ComposerHandle>(null);
  const chatContentRef = useRef<HTMLDivElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const dragDepthRef = useRef(0);
  const pendingAttachmentsRef = useRef(pendingAttachments);
  const liveRunIdRef = useRef<string | null>(null);
  const streamControllerRef = useRef<AbortController | null>(null);
  const cancellingRef = useRef(false);
  const skipAnimationRunIdsRef = useRef(new Set(Object.keys(initialRuns)));
  const skipAnimationMessageIdsRef = useRef(
    new Set(initialMessages.filter((message) => message.role === "assistant").map((message) => message.id)),
  );
  const titleUpdatedRef = useRef(initialMessages.some((message) => message.role === "user"));
  const onStateChangeRef = useRef(onStateChange);
  useEffect(() => {
    onStateChangeRef.current = onStateChange;
  }, [onStateChange]);

  useEffect(() => {
    if (Object.keys(initialRuns).length > 0) {
      markPresentationComplete();
    }
  }, [initialRuns, markPresentationComplete]);

  useEffect(() => {
    if (!isDailyCaptureComposerMode(composerQuickActionId)) return undefined;

    const intervalId = window.setInterval(() => {
      if (!dailyCaptureTimeTouchedRef.current) {
        setDailyCaptureLogTime(formatDailyCaptureLogTime());
      }
    }, 30_000);

    return () => window.clearInterval(intervalId);
  }, [composerQuickActionId]);

  useEffect(() => {
    if (!isGroceryListComposerMode(composerQuickActionId)) return undefined;

    const intervalId = window.setInterval(() => {
      if (!groceryWeekTouchedRef.current) {
        setGroceryWeekNumber(formatCurrentGroceryWeekNumber());
      }
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, [composerQuickActionId]);

  pendingAttachmentsRef.current = pendingAttachments;
  const handleSendRef = useRef<
    (messageText?: string, quickActionId?: string, attachmentOverride?: PendingAttachment[]) => Promise<void>
  >(
    async () => {},
  );
  const focusComposerRef = useRef<() => void>(() => {});
  const {
    voiceModeEnabled,
    voiceTurnPhase,
    voiceModeError,
    ttsSupported,
    ttsEnabled,
    advanceStreamingTts,
    stopSpeaking,
    interruptVoice,
    inputModeControls,
  } = useTextVoiceInput({
    isActive: isActive && showBacksterComposerOptions,
    onTranscript: async (text) => {
      await handleSendRef.current(text);
    },
    focusComposer: () => focusComposerRef.current(),
    focusGuardRef: voiceModeFocusGuardRef,
  });

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

  const { resetTtsRunTracking } = useStreamingRunTts({
    runs,
    isActive,
    ttsEnabled,
    ttsSupported,
    advanceStreamingTts,
    latestFinishedRunId,
  });

  const scrollTranscriptToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    const el = transcriptRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  const scrollFrameRef = useRef<number | null>(null);

  const scheduleScrollToBottom = useCallback(() => {
    if (!isActive || !stickToBottomRef.current) return;
    if (scrollFrameRef.current != null) return;
    scrollFrameRef.current = window.requestAnimationFrame(() => {
      scrollFrameRef.current = null;
      scrollTranscriptToBottom();
    });
  }, [isActive, scrollTranscriptToBottom]);

  useEffect(() => {
    return () => {
      if (scrollFrameRef.current != null) {
        window.cancelAnimationFrame(scrollFrameRef.current);
      }
    };
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

  useEffect(() => {
    focusComposerRef.current = focusComposer;
  }, [focusComposer]);

  const blurComposer = useCallback(() => {
    composerFocusSuspendedRef.current = true;
    composerRef.current?.blur();
  }, []);

  const clearAutomationFlowState = useCallback(() => {
    clearPendingReveals();
    setComposerQuickActionId(null);
    automation.clearRegisteredAutomationState();
    setLetterUploadModalOpen(false);
  }, [automation, clearPendingReveals]);

  const cancelAutomationFlow = useCallback(() => {
    const flow = resolveActiveAutomationFlow(composerQuickActionIdRef.current);
    if (!flow) return false;

    clearAutomationFlowState();
    if (flow === "letter") {
      void clearLetterPending(sessionId).catch(() => undefined);
    }
    if (flow === "delete-file") {
      void clearDeleteFilePending(sessionId).catch(() => undefined);
    }
    setInput("");
    stickToBottomRef.current = true;
    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        text: formatAutomationFlowCancellationMessage(flow),
        presentation: "backster",
        createdAt: Date.now(),
      },
    ]);
    composerFocusSuspendedRef.current = false;
    focusComposer();
    return true;
  }, [clearAutomationFlowState, focusComposer, sessionId]);

  const cancelAutomationFlowRef = useRef(cancelAutomationFlow);
  cancelAutomationFlowRef.current = cancelAutomationFlow;

  const runsRef = useRef(runs);
  runsRef.current = runs;

  const resolveActiveDeleteConfirmRunId = useCallback(
    () =>
      findActiveDeleteConfirmRunId(
        messagesRef.current,
        runsRef.current,
        deleteConfirmResolvedRef.current,
      ),
    [],
  );

  const handleDeleteFileConfirm = useCallback(
    async (runId: string) => {
      if (busyRef.current) return;
      setBusy(true);
      try {
        const result = await respondDeleteFile(sessionId, "confirm");
        setDeleteConfirmResolved((current) => ({
          ...current,
          [runId]: { confirmed: true },
        }));
        setComposerQuickActionId(null);
        stickToBottomRef.current = true;
        setMessages((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            role: "user",
            text: DELETE_FILE_CONFIRM_USER_MESSAGE,
            quickActionId: DELETE_FILE_ACTION_ID,
            flowVariant: "delete-file",
            createdAt: Date.now(),
          },
          createFlowAssistantMessage({
            text: formatDeleteFileAssistantReply(result.response),
            flowVariant: "delete-file",
            flowRunId: runId,
            presentation: "backster",
          }),
        ]);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Delete failed";
        setError(message);
      } finally {
        setBusy(false);
      }
    },
    [sessionId],
  );

  const handleDeleteFileReturn = useCallback(
    async (runId: string) => {
      if (busyRef.current) return;
      setBusy(true);
      try {
        const result = await respondDeleteFile(sessionId, "return");
        setDeleteConfirmResolved((current) => ({
          ...current,
          [runId]: { confirmed: false },
        }));
        setComposerQuickActionId(null);
        stickToBottomRef.current = true;
        setMessages((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            role: "user",
            text: DELETE_FILE_DECLINE_USER_MESSAGE,
            quickActionId: DELETE_FILE_ACTION_ID,
            flowVariant: "delete-file",
            createdAt: Date.now(),
          },
          createFlowAssistantMessage({
            text: formatDeleteFileAssistantReply(result.response),
            flowVariant: "delete-file",
            flowRunId: runId,
            presentation: "backster",
          }),
        ]);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not cancel delete";
        setError(message);
      } finally {
        setBusy(false);
      }
    },
    [sessionId],
  );

  const handleDeleteFileConfirmRef = useRef(handleDeleteFileConfirm);
  handleDeleteFileConfirmRef.current = handleDeleteFileConfirm;
  const handleDeleteFileReturnRef = useRef(handleDeleteFileReturn);
  handleDeleteFileReturnRef.current = handleDeleteFileReturn;
  const resolveActiveDeleteConfirmRunIdRef = useRef(resolveActiveDeleteConfirmRunId);
  resolveActiveDeleteConfirmRunIdRef.current = resolveActiveDeleteConfirmRunId;

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

  const composerTools = useMemo(() => {
    if (linearOnlyComposer) {
      return EMPTY_TOOLS;
    }
    if (input.trim()) {
      return resolveToolSelection(input, toolPins);
    }
    if (hasManualToolPins(toolPins)) {
      return resolveToolSelection("", toolPins);
    }
    if (committedTools) return committedTools;
    return EMPTY_TOOLS;
  }, [committedTools, input, linearOnlyComposer, toolPins]);

  const handleDismissTool = useCallback((tool: keyof ToolSelection) => {
    setToolPins((current) => ({
      ...current,
      [tool]: "off",
    }));
  }, []);

  useEffect(() => {
    if (!linearOnlyComposer) return;
    setToolPins(EMPTY_TOOL_PINS);
    setCommittedTools(null);
  }, [focusContext, linearOnlyComposer]);

  useEffect(() => {
    if (!showBacksterComposerOptions) return;

    void (async () => {
      try {
        const settings = peekCachedSettings() ?? (await getSettings());
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
  }, [showBacksterComposerOptions]);

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

      if (key === "c") {
        if (shouldAllowCopyShortcut(event.target)) return;
        event.preventDefault();
        if (isAutomationComposerFlow(composerQuickActionIdRef.current) && !busyRef.current) {
          cancelAutomationFlowRef.current();
          return;
        }
        void handleInterrupt();
      }

      if (key === "d") {
        const activeDeleteConfirmRunId = resolveActiveDeleteConfirmRunIdRef.current();
        if (!activeDeleteConfirmRunId) return;
        event.preventDefault();
        void handleDeleteFileConfirmRef.current(activeDeleteConfirmRunId);
      }

      if (key === "n") {
        const activeDeleteConfirmRunId = resolveActiveDeleteConfirmRunIdRef.current();
        if (!activeDeleteConfirmRunId) return;
        event.preventDefault();
        void handleDeleteFileReturnRef.current(activeDeleteConfirmRunId);
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

      if (event.key === "Tab" && !event.shiftKey) {
        if (isComposerShortcutTarget(event.target)) return;
        event.preventDefault();
        event.stopPropagation();
        composerFocusSuspendedRef.current = false;
        composerRef.current?.focus();
        return;
      }

      if (event.key === "Escape") {
        if (isAutomationComposerFlow(composerQuickActionIdRef.current)) {
          event.preventDefault();
          event.stopPropagation();
          cancelAutomationFlowRef.current();
          return;
        }
        if (
          isSlashCommandPaletteOpen(inputRef.current, {
            enabled: !isAutomationComposerFlow(composerQuickActionIdRef.current),
            context: "chat",
          })
        ) {
          event.preventDefault();
          event.stopPropagation();
          setInput("");
          return;
        }
        if (composerRef.current?.isFocused()) {
          event.preventDefault();
          event.stopPropagation();
          blurComposer();
        }
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
  const activeRunTextLength = useMemo(() => {
    const activeRunId = liveRunIdRef.current;
    if (!activeRunId) return 0;
    return runs[activeRunId]?.text.length ?? 0;
  }, [runs]);

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
    scheduleScrollToBottom();
  }, [
    messages.length,
    runCount,
    activeRunTextLength,
    error,
    voiceModeEnabled,
    voiceTurnPhase,
    scheduleScrollToBottom,
  ]);

  useEffect(() => {
    const anyRunning = Object.values(runs).some((run) => run.status === "running");
    if (anyRunning) return;
    onStateChangeRef.current?.(messages, runs);
  }, [messages, runs]);

  useEffect(() => {
    for (const message of messages) {
      if (!isLetterMessage(message.quickActionId) || !message.runId) continue;
      if (letterConfirmActivatedRef.current.has(message.runId)) continue;

      const run = runs[message.runId];
      if (run?.status !== "finished") continue;

      letterConfirmActivatedRef.current.add(message.runId);
      setComposerQuickActionId(LETTER_CONFIRM_ACTION_ID);
      scheduleComposerFocus(() => {
        composerRef.current?.focus();
      });
    }
  }, [messages, runs]);

  useEffect(() => {
    for (const message of messages) {
      if (!isLetterConfirmMessage(message.quickActionId) || !message.runId) continue;
      if (letterConfirmFinishedRef.current.has(message.runId)) continue;

      const run = runs[message.runId];
      if (run?.status !== "finished" && run?.status !== "error") continue;

      letterConfirmFinishedRef.current.add(message.runId);
      void fetchLetterPending(sessionId)
        .then(({ pending }) => {
          if (pending) {
            setComposerQuickActionId(LETTER_CONFIRM_ACTION_ID);
            scheduleComposerFocus(() => {
              composerRef.current?.focus();
            });
            return;
          }

          setComposerQuickActionId(null);
          setLetterUploadModalOpen(false);
        })
        .catch(() => {
          setComposerQuickActionId(LETTER_CONFIRM_ACTION_ID);
        });
    }
  }, [messages, runs, sessionId]);

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
      resetTtsRunTracking();
      setComposerQuickActionId(null);
      automation.clearRegisteredAutomationState();
      setLetterUploadModalOpen(false);
      clearPendingReveals();
      resetPacing();
      automation.clearEnqueuedFollowUps();
      letterConfirmActivatedRef.current.clear();
      letterConfirmFinishedRef.current.clear();
      void clearLetterPending(sessionId).catch(() => undefined);
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
  }

  const handleRunPresentationComplete = useCallback(
    (runId: string, quickActionId?: string) => {
      skipAnimationRunIdsRef.current.add(runId);
      markPresentationComplete();
      automation.onRegisteredAutomationRunPresentationComplete(quickActionId, runId);
    },
    [automation, markPresentationComplete],
  );

  const toggleRunExpanded = useCallback((runId: string) => {
    setRuns((current) => {
      const existing = current[runId];
      if (!existing) return current;
      return {
        ...current,
        [runId]: {
          ...existing,
          expanded: !existing.expanded,
        },
      };
    });
  }, []);

  async function handleSend(
    messageText?: string,
    quickActionId?: string,
    attachmentOverride?: PendingAttachment[],
  ) {
    const rawText = (messageText ?? input).trim();
    const composerAttachments = attachmentOverride ?? pendingAttachmentsRef.current;

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
      automation.resetAwaitingFollowUp("good-morning");
      recordMorningReviewUsage();
      await handleSendRef.current(MORNING_REVIEW_MESSAGE, GOOD_MORNING_ACTION_ID);
      return;
    }

    if (parseGoodNightShortcut(rawText)) {
      if (!messageText) {
        setInput("");
        setComposerQuickActionId(null);
      }
      automation.resetAwaitingFollowUp("good-night");
      await handleSendRef.current(GOOD_NIGHT_MESSAGE, GOOD_NIGHT_ACTION_ID);
      return;
    }

    if (parseLetterShortcut(rawText)) {
      if (!messageText) {
        setInput("");
        setComposerQuickActionId(null);
      }
      if (!pendingAttachmentsRef.current.some(isPdfPendingAttachment)) {
        setLetterUploadModalOpen(true);
        return;
      }
      setLetterUploadModalOpen(false);
      await handleSendRef.current(LETTER_MESSAGE, LETTER_ACTION_ID);
      return;
    }

    const dcShortcut = parseDailyCaptureShortcut(rawText);
    const grShortcut = parseGroceryShortcut(rawText);
    const deleteShortcut = parseDeleteShortcut(rawText);

    if (dcShortcut?.kind === "activate") {
      if (!messageText) {
        setInput("");
      }
      activateDailyCaptureMode();
      return;
    }

    if (grShortcut?.kind === "activate") {
      if (!messageText) {
        setInput("");
      }
      activateGroceryListMode();
      return;
    }

    if (deleteShortcut?.kind === "activate") {
      if (!messageText) {
        setInput("");
      }
      activateDeleteFileMode();
      return;
    }

    const autoDeleteIntent =
      !composerQuickActionId &&
      !deleteShortcut &&
      detectDeleteFileIntent(rawText);

    const text =
      dcShortcut?.kind === "send"
        ? dcShortcut.body
        : grShortcut?.kind === "send"
          ? grShortcut.body
          : deleteShortcut?.kind === "send"
            ? deleteShortcut.body
            : rawText;
    const inLetterUploadMode = composerQuickActionId === LETTER_ACTION_ID;
    const inLetterConfirmMode = isLetterConfirmComposerMode(composerQuickActionId);
    const inLetterMode = isLetterComposerMode(composerQuickActionId);
    const isVoiceSend = messageText !== undefined;

    const activeComposerFlow = resolveAutomationFlowByComposerMode(composerQuickActionId);
    let questionnaireSubmitPayload: string | null = null;
    if (
      activeComposerFlow &&
      automation.questionnaireState &&
      automation.isAwaitingFollowUp(activeComposerFlow.id) &&
      !activeComposerFlow.isInitialRun(quickActionId) &&
      !(activeComposerFlow.trigger.shortcut?.test(rawText.trim()) ?? false)
    ) {
      if (!text && composerAttachments.length === 0) return;
      if (busy && !isVoiceSend) return;

      void stopSpeaking();
      if (!messageText) {
        setInput("");
      }

      const questionnaireResult = automation.tryHandleQuestionnaireAnswer({
        flowId: activeComposerFlow.id,
        text,
        appendUserMessage: (message) => {
          stickToBottomRef.current = true;
          setMessages((current) => [...current, message]);
        },
      });

      if (questionnaireResult?.status === "continue") {
        return;
      }
      if (questionnaireResult?.status === "submit") {
        questionnaireSubmitPayload = questionnaireResult.payload;
      }
    }

    if (questionnaireSubmitPayload == null) {
      questionnaireSubmitPayload = automation.getQuestionnaireSubmitPayload();
    }

    const { effectiveQuickActionId: registeredEffectiveQuickActionId } =
      resolveAutomationFlowForOutgoingMessage({
        composerQuickActionId,
        awaitingState: automation.awaitingState,
        quickActionId,
        inLetterMode,
        letterAwaitingConfirm: inLetterConfirmMode,
        letterConfirmQuickActionId: LETTER_CONFIRM_ACTION_ID,
        dailyCaptureQuickActionId: DAILY_CAPTURE_ACTION_ID,
        isDailyCaptureShortcutSend: dcShortcut?.kind === "send",
        groceryListQuickActionId: GROCERY_LIST_ACTION_ID,
        isGroceryListShortcutSend: grShortcut?.kind === "send",
        deleteFileQuickActionId: DELETE_FILE_ACTION_ID,
        isDeleteFileShortcutSend: deleteShortcut?.kind === "send" || autoDeleteIntent,
        questionnaireSubmitPayload,
      });

    const effectiveQuickActionId =
      registeredEffectiveQuickActionId ??
      (autoDeleteIntent ? DELETE_FILE_ACTION_ID : undefined);
    const isDailyCapture = isDailyCaptureMessage(effectiveQuickActionId);
    const isGroceryList = isGroceryListMessage(effectiveQuickActionId);
    const isGoodMorningWake = isGoodMorningWakeMessage(effectiveQuickActionId);
    const isGoodMorningFeel = isGoodMorningFeelMessage(effectiveQuickActionId);
    const isGoodNightReflection = isGoodNightReflectionMessage(effectiveQuickActionId);

    if (
      shouldBlockRegisteredAutomationComposerSend({
        composerQuickActionId,
        awaitingState: automation.awaitingState,
        quickActionId,
        rawText,
        questionnaireActive: automation.questionnaireState != null,
      })
    ) {
      return;
    }

    if (autoDeleteIntent || isDeleteFileComposerMode(composerQuickActionId) || deleteShortcut?.kind === "send") {
      setComposerQuickActionId(DELETE_FILE_ACTION_ID);
    }

    if (
      inLetterUploadMode &&
      !isLetterMessage(quickActionId) &&
      !parseLetterShortcut(rawText)
    ) {
      return;
    }

    const displayText = isDailyCapture
      ? formatDailyCaptureLogEntry(
          text,
          normalizeDailyCaptureLogTime(
            isDailyCaptureComposerMode(composerQuickActionId)
              ? dailyCaptureLogTime
              : formatDailyCaptureLogTime(),
          ) ?? formatDailyCaptureLogTime(),
        )
      : isGroceryList
        ? formatGroceryLogEntry(
            text,
            normalizeGroceryWeekNumber(
              isGroceryListComposerMode(composerQuickActionId)
                ? groceryWeekNumber
                : formatCurrentGroceryWeekNumber(),
            ) ?? Number(formatCurrentGroceryWeekNumber()),
          )
        : text;
    const captureTimeForSend = isDailyCapture
      ? normalizeDailyCaptureLogTime(
          isDailyCaptureComposerMode(composerQuickActionId)
            ? dailyCaptureLogTime
            : formatDailyCaptureLogTime(),
        ) ?? formatDailyCaptureLogTime()
      : undefined;
    const groceryWeekForSend = isGroceryList
      ? String(
          normalizeGroceryWeekNumber(
            isGroceryListComposerMode(composerQuickActionId)
              ? groceryWeekNumber
              : formatCurrentGroceryWeekNumber(),
          ) ?? Number(formatCurrentGroceryWeekNumber()),
        )
      : undefined;
    const agentText =
      questionnaireSubmitPayload ?? text;
    if (questionnaireSubmitPayload) {
      automation.clearQuestionnaireSubmitPayload();
    }

    if (!text && composerAttachments.length === 0 && !questionnaireSubmitPayload) return;
    if (busy && !isVoiceSend) return;

    if (isVoiceSend && busy) {
      await handleCancelRun();
    }

    void stopSpeaking();

    const attachmentsToSend = shouldSendComposerAttachments(messageText, quickActionId)
      ? [...composerAttachments]
      : messageText
        ? []
        : [...composerAttachments];
    setBusy(true);
    setError(null);
    setCommittedTools(
      linearOnlyComposer ? null : resolveToolSelection(agentText, toolPins),
    );
    if (attachmentsToSend.length > 0) {
      pendingAttachmentsRef.current = [];
      setPendingAttachments([]);
    }
    if (!messageText) {
      setInput("");
      if (
        isDailyCapture ||
        isGroceryList ||
        isGoodMorningWake ||
        isGoodMorningFeel ||
        isGoodNightReflection
      ) {
        setComposerQuickActionId(null);
        if (isDailyCapture) {
          resetDailyCaptureLogTime();
        }
        if (isGroceryList) {
          resetGroceryWeekNumber();
        }
        if (isGoodMorningWake || isGoodMorningFeel) {
          automation.resetAwaitingFollowUp("good-morning");
        }
        if (isGoodNightReflection) {
          automation.resetAwaitingFollowUp("good-night");
        }
      }
    }
    const pinsForSend = focusContext
      ? {
          linear: "on" as const,
          obsidian:
            focusContext.kind === "vault_document" ? ("on" as const) : ("off" as const),
        }
      : linearOnlyComposer
        ? { linear: "on" as const, obsidian: "off" as const }
        : { ...toolPins };
    if (!focusContext) {
      setToolPins(EMPTY_TOOL_PINS);
    }
    focusComposer();

    const registeredFlowVariant = resolveAutomationFlowVariant(effectiveQuickActionId);
    const flowVariant =
      registeredFlowVariant ??
      (isGoodNightReflectionMessage(effectiveQuickActionId)
        ? "good-night"
        : isGoodNightMessage(effectiveQuickActionId)
          ? "good-night"
          : isDeleteFileMessage(effectiveQuickActionId)
            ? "delete-file"
            : isLetterFlowMessage(effectiveQuickActionId)
              ? "letter"
              : undefined);

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text: displayText,
      createdAt: Date.now(),
      quickActionId: effectiveQuickActionId,
      flowVariant,
      attachments: pendingAttachmentsToMessageAttachments(attachmentsToSend),
      contextChips: focusContext
        ? [
            {
              id:
                focusContext.kind === "linear_issue"
                  ? focusContext.identifier
                  : focusContext.kind === "linear_document"
                    ? focusContext.documentId
                    : focusContext.kind === "vault_document"
                      ? focusContext.path
                      : focusContext.workspaceId,
              title:
                focusContext.kind === "linear_workspace"
                  ? focusContext.name
                  : focusContext.title,
              entityType: focusContext.kind,
            },
          ]
        : undefined,
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
        {
          captureTime: captureTimeForSend,
          groceryWeek: groceryWeekForSend,
          focusContext,
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
      markPresentationActive();

      streamController = new AbortController();
      streamControllerRef.current = streamController;
      const activeStreamController = streamController;
      const streamTimeout = window.setTimeout(() => activeStreamController.abort(), 10 * 60 * 1000);

      try {
        const runEventBatcher = createRunEventBatcher({
          setRuns,
          createEmptyRun,
          applyEvent,
        });

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

              runEventBatcher.push(runId, event);
            },
            streamController.signal,
          );
        } finally {
          runEventBatcher.flush();
          runEventBatcher.dispose();
        }
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
        pendingAttachmentsRef.current = attachmentsToSend;
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

  function resetDailyCaptureLogTime() {
    dailyCaptureTimeTouchedRef.current = false;
    setDailyCaptureLogTime(formatDailyCaptureLogTime());
  }

  function activateDailyCaptureMode() {
    resetDailyCaptureLogTime();
    setComposerQuickActionId(DAILY_CAPTURE_ACTION_ID);
    setInput("");
    focusComposer();
  }

  function resetGroceryWeekNumber() {
    groceryWeekTouchedRef.current = false;
    setGroceryWeekNumber(formatCurrentGroceryWeekNumber());
  }

  function activateGroceryListMode() {
    resetGroceryWeekNumber();
    setComposerQuickActionId(GROCERY_LIST_ACTION_ID);
    setInput("");
    focusComposer();
  }

  function activateDeleteFileMode() {
    setComposerQuickActionId(DELETE_FILE_ACTION_ID);
    setInput("");
    focusComposer();
  }

  function handleComposerInputChange(next: string) {
    if (/^\/dc\s$/i.test(next)) {
      activateDailyCaptureMode();
      return;
    }
    if (/^\/(?:gr|grocery)\s$/i.test(next)) {
      activateGroceryListMode();
      return;
    }
    if (shouldActivateDeleteFileFromComposerInput(next)) {
      activateDeleteFileMode();
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

  function handleActivateDailyCaptureShortcut() {
    if (
      busy ||
      isDailyCaptureMessage(composerQuickActionId ?? undefined) ||
      isGroceryListComposerMode(composerQuickActionId) ||
      isGoodMorningComposerMode(composerQuickActionId) ||
      isGoodNightComposerMode(composerQuickActionId) ||
      isLetterComposerMode(composerQuickActionId) ||
      isDeleteFileComposerMode(composerQuickActionId)
    ) {
      return;
    }
    activateDailyCaptureMode();
  }

  function handleActivateGroceryListShortcut() {
    if (
      busy ||
      isGroceryListComposerMode(composerQuickActionId) ||
      isDailyCaptureComposerMode(composerQuickActionId) ||
      isGoodMorningComposerMode(composerQuickActionId) ||
      isGoodNightComposerMode(composerQuickActionId) ||
      isLetterComposerMode(composerQuickActionId) ||
      isDeleteFileComposerMode(composerQuickActionId)
    ) {
      return;
    }
    activateGroceryListMode();
  }

  function handleActivateDeleteFileShortcut() {
    if (
      busy ||
      isDeleteFileComposerMode(composerQuickActionId) ||
      isDailyCaptureComposerMode(composerQuickActionId) ||
      isGroceryListComposerMode(composerQuickActionId) ||
      isGoodMorningComposerMode(composerQuickActionId) ||
      isGoodNightComposerMode(composerQuickActionId) ||
      isLetterComposerMode(composerQuickActionId)
    ) {
      return;
    }
    activateDeleteFileMode();
  }

  function handleClearDailyCaptureMode() {
    clearPendingReveals();
    setComposerQuickActionId(null);
    automation.resetAwaitingFollowUp("daily-capture");
    resetDailyCaptureLogTime();
  }

  function handleClearGroceryListMode() {
    clearPendingReveals();
    setComposerQuickActionId(null);
    automation.resetAwaitingFollowUp("grocery-list");
    resetGroceryWeekNumber();
  }

  function handleClearDeleteFileMode() {
    clearPendingReveals();
    setComposerQuickActionId(null);
    automation.resetAwaitingFollowUp("delete-file");
    void clearDeleteFilePending(sessionId).catch(() => undefined);
  }

  function handleClearGoodMorningMode() {
    clearPendingReveals();
    setComposerQuickActionId(null);
    automation.resetAwaitingFollowUp("good-morning");
  }

  function handleClearGoodNightMode() {
    clearPendingReveals();
    setComposerQuickActionId(null);
    automation.resetAwaitingFollowUp("good-night");
  }

  function handleClearLetterMode() {
    setComposerQuickActionId(null);
    setLetterUploadModalOpen(false);
    void clearLetterPending(sessionId).catch(() => undefined);
  }

  function handleTriggerGoodMorningShortcut() {
    if (busy || isGoodMorningComposerMode(composerQuickActionId)) return;
    setComposerQuickActionId(null);
    automation.resetAwaitingFollowUp("good-morning");
    setInput("");
    void handleSendRef.current(MORNING_REVIEW_MESSAGE, GOOD_MORNING_ACTION_ID);
  }

  function handleTriggerGoodNightShortcut() {
    if (busy || isGoodNightComposerMode(composerQuickActionId)) return;
    setComposerQuickActionId(null);
    automation.resetAwaitingFollowUp("good-night");
    setInput("");
    void handleSendRef.current(GOOD_NIGHT_MESSAGE, GOOD_NIGHT_ACTION_ID);
  }

  function handleTriggerLetterShortcut() {
    if (busy || isLetterComposerMode(composerQuickActionId)) return;
    if (!pendingAttachmentsRef.current.some(isPdfPendingAttachment)) {
      setLetterUploadModalOpen(true);
      return;
    }
    void startLetterFlow();
  }

  function startLetterFlow(attachments?: PendingAttachment[]) {
    setComposerQuickActionId(null);
    setLetterUploadModalOpen(false);
    setInput("");
    void handleSendRef.current(LETTER_MESSAGE, LETTER_ACTION_ID, attachments);
  }

  function handleLetterUploadCancel() {
    setLetterUploadModalOpen(false);
    setInput("");
    focusComposer();
  }

  function handleLetterUploadPick() {
    letterPdfInputRef.current?.click();
  }

  async function handleLetterPdfSelected(files: FileList | null) {
    const pdfs = Array.from(files ?? []).filter(isPdfAttachmentFile);
    if (pdfs.length === 0) {
      setError("Only PDF letters can be filed with /letter.");
      return;
    }

    const prepared = await prepareFilesForUpload([pdfs[0]!]);
    const file = prepared[0];
    if (!file) return;

    const attachment = createPendingAttachment(file);
    setError(null);
    setLetterUploadModalOpen(false);
    setInput("");
    void startLetterFlow([attachment]);
  }

  function handleSlashCommandSelect(command: SlashCommandDefinition) {
    if (command.toolKey) {
      setToolPins((current) => ({
        ...current,
        [command.toolKey!]: "on",
      }));
      setInput("");
      focusComposer();
      return;
    }

    switch (command.id) {
      case "daily-capture":
        handleActivateDailyCaptureShortcut();
        return;
      case "grocery-list":
        handleActivateGroceryListShortcut();
        return;
      case "delete-file":
        handleActivateDeleteFileShortcut();
        return;
      case "good-morning":
        void handleTriggerGoodMorningShortcut();
        return;
      case "good-night":
        void handleTriggerGoodNightShortcut();
        return;
      case "letter":
        void handleTriggerLetterShortcut();
        return;
      case "clear":
        void handleClearChat();
    }
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

  const openAttachmentPreview = useCallback((attachment: MessageAttachment) => {
    setPreviewTarget(toAttachmentPreviewTarget(attachment));
  }, []);

  const handleApproval = useCallback(async (approvalId: string, approved: boolean) => {
    await respondApproval(approvalId, approved);
    focusComposer();
  }, [focusComposer]);

  const approveApproval = useCallback(
    (approvalId: string) => {
      void handleApproval(approvalId, true);
    },
    [handleApproval],
  );

  const rejectApproval = useCallback(
    (approvalId: string) => {
      void handleApproval(approvalId, false);
    },
    [handleApproval],
  );

  const virtualizeTranscript = useVirtualListEnabled(messages.length);

  const renderChatTurn = useCallback(
    (message: (typeof messages)[number]) => (
      <ChatTurn
        key={message.id}
        message={message}
        run={message.runId ? runs[message.runId] : undefined}
        animateMessage={!skipAnimationMessageIdsRef.current.has(message.id)}
        animateRun={
          message.runId ? !skipAnimationRunIdsRef.current.has(message.runId) : false
        }
        ttsSupported={ttsSupported}
        voiceModeEnabled={voiceModeEnabled}
        deleteConfirmState={message.runId ? deleteConfirmResolved[message.runId] : undefined}
        onOpenAttachmentPreview={openAttachmentPreview}
        onToggleRun={toggleRunExpanded}
        onApproveApproval={approveApproval}
        onRejectApproval={rejectApproval}
        onRunPresentationComplete={handleRunPresentationComplete}
        onDeleteFileConfirm={handleDeleteFileConfirm}
        onDeleteFileReturn={handleDeleteFileReturn}
        onFlowPresentationComplete={markPresentationComplete}
      />
    ),
    [
      approveApproval,
      deleteConfirmResolved,
      handleDeleteFileConfirm,
      handleDeleteFileReturn,
      handleRunPresentationComplete,
      markPresentationComplete,
      openAttachmentPreview,
      rejectApproval,
      runs,
      toggleRunExpanded,
      ttsSupported,
      voiceModeEnabled,
    ],
  );

  return (
    <div className={layout === "panel" ? "chat-view chat-view--panel" : "chat-view"}>
      <AttachmentPreviewModal
        target={previewTarget}
        onClose={() => {
          setPreviewTarget(null);
          focusComposer();
        }}
      />
      <LetterUploadModal
        open={letterUploadModalOpen}
        onCancel={handleLetterUploadCancel}
        onUpload={handleLetterUploadPick}
      />
      <input
        ref={letterPdfInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="composer-file-input"
        onChange={(event) => {
          void handleLetterPdfSelected(event.target.files);
          event.target.value = "";
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
        {virtualizeTranscript ? (
          <VirtualList
            items={messages}
            scrollElementRef={transcriptRef}
            estimateSize={120}
            overscan={6}
            getItemKey={(message) => message.id}
            renderItem={(message) => renderChatTurn(message)}
          />
        ) : (
          messages.map((message) => renderChatTurn(message))
        )}

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
          className={`composer-stack ${voiceModeEnabled ? "composer-stack-voice-mode" : ""} ${composerContextItems.length > 0 ? "composer-stack--has-context" : ""}`}
        >
          {layout === "panel" && composerContextItems.length > 0 ? (
            <ComposerContextCard
              items={composerContextItems}
              loading={composerContextLoading}
            />
          ) : null}
          <Composer
            ref={composerRef}
            value={input}
            onChange={handleComposerInputChange}
            onEscapeBlur={blurComposer}
            onCancelAutomationFlow={cancelAutomationFlow}
            onComposerFocus={() => {
              composerFocusSuspendedRef.current = false;
            }}
            onSend={() => void handleSend()}
            onActivateDailyCaptureShortcut={handleActivateDailyCaptureShortcut}
            onActivateGroceryListShortcut={handleActivateGroceryListShortcut}
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
            composerMode={showBacksterComposerOptions ? composerMode : undefined}
            composerModeLabel={showBacksterComposerOptions ? composerModeLabel : undefined}
            onComposerModeChange={
              showBacksterComposerOptions
                ? (mode) => void handleComposerModeChange(mode)
                : undefined
            }
            savingComposerMode={showBacksterComposerOptions ? savingComposerMode : undefined}
            inputModeControls={showBacksterComposerOptions ? inputModeControls : undefined}
            voiceMode={showBacksterComposerOptions ? voiceModeEnabled : false}
            hideToolIndicators={linearOnlyComposer}
            toolIndicators={composerTools}
            toolPins={toolPins}
            onDismissTool={handleDismissTool}
            composerQuickAction={
              isDailyCaptureComposerMode(composerQuickActionId)
                ? { onClear: handleClearDailyCaptureMode }
                : isGroceryListComposerMode(composerQuickActionId)
                  ? { onClear: handleClearGroceryListMode }
                  : isGoodMorningComposerMode(composerQuickActionId)
                  ? { onClear: handleClearGoodMorningMode }
                  : isGoodNightComposerMode(composerQuickActionId)
                    ? { onClear: handleClearGoodNightMode }
                    : isLetterComposerMode(composerQuickActionId)
                      ? { onClear: handleClearLetterMode }
                      : isDeleteFileComposerMode(composerQuickActionId)
                        ? { onClear: handleClearDeleteFileMode }
                        : undefined
            }
            composerAutomationFlow={resolveActiveAutomationFlow(composerQuickActionId)}
            dailyCaptureTime={
              isDailyCaptureComposerMode(composerQuickActionId)
                ? {
                    value: dailyCaptureLogTime,
                    onChange: setDailyCaptureLogTime,
                    onUserEdit: () => {
                      dailyCaptureTimeTouchedRef.current = true;
                    },
                    inputRef: dailyCaptureTimeTagRef,
                  }
                : undefined
            }
            groceryWeek={
              isGroceryListComposerMode(composerQuickActionId)
                ? {
                    value: groceryWeekNumber,
                    onChange: setGroceryWeekNumber,
                    onUserEdit: () => {
                      groceryWeekTouchedRef.current = true;
                    },
                    inputRef: groceryWeekTagRef,
                  }
                : undefined
            }
            onTriggerGoodNightShortcut={handleTriggerGoodNightShortcut}
            onTriggerLetterShortcut={handleTriggerLetterShortcut}
            onSlashCommandSelect={handleSlashCommandSelect}
            focusPlaceholder={composerPlaceholder}
          />
        </div>
      </div>
    </div>
  );
});
