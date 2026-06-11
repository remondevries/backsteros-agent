import { memo, useMemo } from "react";
import { AttachmentChip } from "./AttachmentChip";
import { BacksterAssistantBlock } from "./BacksterAssistantBlock";
import { ContextChip } from "./ContextChip";
import {
  DAILY_CAPTURE_MESSAGE_LABEL,
  formatDailyCaptureLogTime,
  isDailyCaptureMessage,
  parseDailyCaptureLogEntry,
} from "./dailyCapture";
import { isDeleteFileFlowMessage, isDeleteFileMessage } from "./deleteFile";
import {
  GROCERY_LIST_MESSAGE_LABEL,
  isGroceryListMessage,
} from "./groceryList";
import {
  formatCurrentGroceryWeekNumber,
  parseGroceryLogEntry,
} from "./groceryWeek";
import {
  GOOD_NIGHT_MESSAGE,
  isGoodNightFlowMessage,
  isGoodNightMessage,
} from "./goodNight";
import {
  isLetterConfirmMessage,
  isLetterFlowMessage,
  isLetterMessage,
  LETTER_LABEL,
} from "./letter";
import { isValidLinearContextChip } from "./linearIssue";
import { MessageActions } from "./MessageActions";
import {
  isGoodMorningFlowMessage,
  isGoodMorningMessage,
  MORNING_REVIEW_MESSAGE,
} from "./morningReview";
import { RunBlock } from "./RunBlock";
import { TerminalTypingText } from "./TerminalTypingText";
import type { ChatMessage, MessageAttachment, RunViewModel } from "./types";

function resolveRunSourceBrand(message: ChatMessage): "backster" | undefined {
  if (
    isGoodMorningFlowMessage(message.quickActionId) ||
    isGoodNightFlowMessage(message.quickActionId) ||
    isDailyCaptureMessage(message.quickActionId) ||
    isGroceryListMessage(message.quickActionId) ||
    isDeleteFileFlowMessage(message.quickActionId) ||
    isLetterFlowMessage(message.quickActionId) ||
    message.flowVariant === "daily-capture" ||
    message.flowVariant === "grocery-list" ||
    message.flowVariant === "delete-file" ||
    message.flowVariant === "letter"
  ) {
    return "backster";
  }
  return undefined;
}

export const ChatTurn = memo(function ChatTurn({
  message,
  run,
  animateMessage,
  animateRun,
  ttsSupported,
  voiceModeEnabled,
  deleteConfirmState,
  onOpenAttachmentPreview,
  onToggleRun,
  onApproveApproval,
  onRejectApproval,
  onRunPresentationComplete,
  onDeleteFileConfirm,
  onDeleteFileReturn,
  onOpenLinearDashboard,
  onOpenWhoopDashboard,
  onFlowPresentationComplete,
}: {
  message: ChatMessage;
  run?: RunViewModel;
  animateMessage: boolean;
  animateRun: boolean;
  ttsSupported: boolean;
  voiceModeEnabled: boolean;
  deleteConfirmState?: { confirmed: boolean };
  onOpenAttachmentPreview: (attachment: MessageAttachment) => void;
  onToggleRun: (runId: string) => void;
  onApproveApproval: (approvalId: string) => void;
  onRejectApproval: (approvalId: string) => void;
  onRunPresentationComplete: (runId: string, quickActionId?: string) => void;
  onDeleteFileConfirm: (runId: string) => void;
  onDeleteFileReturn: (runId: string) => void;
  onOpenLinearDashboard: () => void;
  onOpenWhoopDashboard: () => void;
  onFlowPresentationComplete: () => void;
}) {
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
    (isLetterFlowMessage(message.quickActionId) || message.flowVariant === "letter");
  const isFlowAssistantMessage =
    message.role === "assistant" &&
    (message.flowVariant === "good-morning" ||
      message.flowVariant === "good-night" ||
      message.presentation === "backster");

  const handleRunToggle = useMemo(
    () => (run ? () => onToggleRun(run.runId) : undefined),
    [onToggleRun, run],
  );

  const handlePresentationComplete = useMemo(
    () =>
      animateRun && message.runId
        ? () => onRunPresentationComplete(message.runId!, message.quickActionId)
        : undefined,
    [animateRun, message.quickActionId, message.runId, onRunPresentationComplete],
  );

  const handleDeleteFileConfirm = useMemo(
    () => (run ? () => onDeleteFileConfirm(run.runId) : undefined),
    [onDeleteFileConfirm, run],
  );

  const handleDeleteFileReturn = useMemo(
    () => (run ? () => onDeleteFileReturn(run.runId) : undefined),
    [onDeleteFileReturn, run],
  );

  const runSourceBrand = useMemo(() => resolveRunSourceBrand(message), [message]);

  return (
    <div className="chat-turn">
      <div className={`chat-message ${message.role === "user" ? "user" : "assistant"}`}>
        {message.role === "user" && isLetterMessage(message.quickActionId) ? (
          <div className="chat-letter-user-message">
            <span className="chat-quick-action-tag chat-quick-action-tag-letter">
              {LETTER_LABEL}
            </span>
            {message.attachments && message.attachments.length > 0 && (
              <div className="message-attachments">
                {message.attachments.map((attachment) => (
                  <AttachmentChip
                    key={`${message.id}-${attachment.name}-${attachment.vaultPath ?? "local"}`}
                    attachment={attachment}
                    onOpen={() => onOpenAttachmentPreview(attachment)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : message.text ? (
          <>
            {message.role === "assistant" ? (
              isFlowAssistantMessage ? (
                <BacksterAssistantBlock
                  messageId={message.id}
                  text={message.text}
                  sentAt={message.createdAt}
                  animate={animateMessage}
                  canSpeak={
                    ttsSupported && message.text.trim().length > 0 && !voiceModeEnabled
                  }
                  onTypingComplete={animateMessage ? onFlowPresentationComplete : undefined}
                  onOpenLinearDashboard={onOpenLinearDashboard}
                  onOpenWhoopDashboard={onOpenWhoopDashboard}
                />
              ) : (
                <TerminalTypingText
                  key={message.id}
                  text={message.text}
                  running={false}
                  startedAt={message.createdAt}
                  animate={animateMessage}
                />
              )
            ) : isDailyCaptureMessage(message.quickActionId) ? (
              (() => {
                const parsed = parseDailyCaptureLogEntry(message.text);
                const body = parsed?.body ?? message.text;
                const logTime = parsed?.logTime ?? formatDailyCaptureLogTime();

                return (
                  <>
                    <div className="chat-daily-capture-user-message">
                      <span className="chat-daily-capture-heading">{DAILY_CAPTURE_MESSAGE_LABEL}</span>
                      <div className="bubble chat-daily-capture-bubble">
                        <span className="chat-quick-action-tag chat-quick-action-tag-daily-capture chat-daily-capture-time-tag">
                          {logTime}
                        </span>
                        <span className="chat-daily-capture-text">{body}</span>
                      </div>
                    </div>
                    <MessageActions text={body} />
                  </>
                );
              })()
            ) : isGroceryListMessage(message.quickActionId) ? (
              (() => {
                const parsed = parseGroceryLogEntry(message.text);
                const body = parsed?.body ?? message.text;
                const week = parsed?.week ?? Number(formatCurrentGroceryWeekNumber());

                return (
                  <>
                    <div className="chat-grocery-list-user-message">
                      <span className="chat-grocery-list-heading">{GROCERY_LIST_MESSAGE_LABEL}</span>
                      <div className="bubble chat-grocery-list-bubble">
                        <span className="chat-quick-action-tag chat-quick-action-tag-grocery-list chat-grocery-list-week-tag">
                          W{week}
                        </span>
                        <span className="chat-grocery-list-text">{body}</span>
                      </div>
                    </div>
                    <MessageActions text={body} />
                  </>
                );
              })()
            ) : isDeleteFileMessage(message.quickActionId) ? (
              <>
                <div className="bubble">{message.text}</div>
                <MessageActions text={message.text} />
              </>
            ) : (
              <>
                {isLetterConfirmMessage(message.quickActionId) && (
                  <span className="chat-quick-action-tag chat-quick-action-tag-letter">
                    {LETTER_LABEL}
                  </span>
                )}
                <div
                  className={`bubble ${
                    message.quickActionId &&
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
                      : message.text}
                </div>
                {!isGoodMorningMessage(message.quickActionId) &&
                  !isGoodNightMessage(message.quickActionId) &&
                  !isLetterFlow && <MessageActions text={message.text} />}
              </>
            )}
          </>
        ) : null}
        {message.attachments &&
          message.attachments.length > 0 &&
          !isLetterMessage(message.quickActionId) && (
            <div className="message-attachments">
              {message.attachments.map((attachment) => (
                <AttachmentChip
                  key={`${message.id}-${attachment.name}-${attachment.vaultPath ?? "local"}`}
                  attachment={attachment}
                  onOpen={() => onOpenAttachmentPreview(attachment)}
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

      {run && handleRunToggle ? (
        <RunBlock
          run={run}
          animate={animateRun}
          sourceBrand={runSourceBrand}
          onToggle={handleRunToggle}
          onApprove={onApproveApproval}
          onReject={onRejectApproval}
          canSpeak={
            ttsSupported &&
            run.status !== "running" &&
            run.text.trim().length > 0 &&
            !voiceModeEnabled
          }
          voiceModeEnabled={voiceModeEnabled}
          onOpenLinearDashboard={onOpenLinearDashboard}
          onOpenWhoopDashboard={onOpenWhoopDashboard}
          onPresentationComplete={handlePresentationComplete}
          onDeleteFileConfirm={handleDeleteFileConfirm}
          onDeleteFileReturn={handleDeleteFileReturn}
          deleteConfirmState={deleteConfirmState}
        />
      ) : null}
    </div>
  );
});
