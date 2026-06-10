import { useState, type ReactNode } from "react";
import { ActivityHeader, ActivityStepRow, ActivityTimeline } from "./ActivityTimeline";
import { BacksterBrand } from "./BacksterBrand";
import { MessageActions } from "./MessageActions";
import { TerminalTypingText } from "./TerminalTypingText";

/** Matches a minimal finished run so flow follow-ups align with RunBlock spacing. */
export const FLOW_ASSISTANT_ACTIVITY_DURATION_MS = 1000;
export const FLOW_ASSISTANT_ACTIVITY_STEP_LABEL = "Generate response";

export function BacksterBrandHeader() {
  return (
    <div className="run-entity-brands">
      <BacksterBrand />
    </div>
  );
}

export function BacksterAssistantBlock({
  messageId,
  text,
  sentAt,
  animate = true,
  canSpeak,
  onTypingComplete,
  onOpenLinearDashboard,
  onOpenWhoopDashboard,
  children,
}: {
  messageId: string;
  text: string;
  sentAt?: number;
  animate?: boolean;
  canSpeak?: boolean;
  onTypingComplete?: () => void;
  onOpenLinearDashboard?: () => void;
  onOpenWhoopDashboard?: () => void;
  children?: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const [typingComplete, setTypingComplete] = useState(!animate);

  return (
    <div className="run-block">
      <BacksterBrandHeader />
      <div className="run-text-block">
        {children ?? (
          <TerminalTypingText
            key={messageId}
            text={text}
            running={false}
            startedAt={sentAt}
            animate={animate}
            onTypingComplete={() => {
              setTypingComplete(true);
              onTypingComplete?.();
            }}
            onOpenLinearDashboard={onOpenLinearDashboard}
            onOpenWhoopDashboard={onOpenWhoopDashboard}
          />
        )}
      </div>
      <div className="run-footer">
        <ActivityHeader
          durationMs={FLOW_ASSISTANT_ACTIVITY_DURATION_MS}
          expanded={expanded}
          onToggle={() => setExpanded((current) => !current)}
          running={false}
          sentAt={sentAt}
        />
        {expanded && (
          <ActivityTimeline scrollKey={FLOW_ASSISTANT_ACTIVITY_STEP_LABEL}>
            <ActivityStepRow
              kind="generic"
              label={FLOW_ASSISTANT_ACTIVITY_STEP_LABEL}
              status="completed"
              durationMs={FLOW_ASSISTANT_ACTIVITY_DURATION_MS}
            />
          </ActivityTimeline>
        )}
        {text.trim() && (
          <MessageActions
            text={text}
            playbackId={messageId}
            canSpeak={canSpeak}
            showCopy={typingComplete}
          />
        )}
      </div>
    </div>
  );
}
