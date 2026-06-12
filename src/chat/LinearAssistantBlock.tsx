import { useState } from "react";
import { ActivityHeader, ActivityStepRow, ActivityTimeline } from "./ActivityTimeline";
import { LinearBrand } from "./LinearBrand";
import { MessageActions } from "./MessageActions";
import { TerminalTypingText } from "./TerminalTypingText";

const LINEAR_ASSISTANT_ACTIVITY_DURATION_MS = 1000;
const LINEAR_ASSISTANT_ACTIVITY_STEP_LABEL = "Generate response";

export function LinearBrandHeader() {
  return (
    <div className="run-entity-brands">
      <LinearBrand />
    </div>
  );
}

export function LinearAssistantBlock({
  messageId,
  text,
  sentAt,
  animate = true,
  canSpeak,
  onOpenLinearDashboard,
  onOpenWhoopDashboard,
}: {
  messageId: string;
  text: string;
  sentAt?: number;
  animate?: boolean;
  canSpeak?: boolean;
  onOpenLinearDashboard?: () => void;
  onOpenWhoopDashboard?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [typingComplete, setTypingComplete] = useState(!animate);

  return (
    <div className="run-block">
      <LinearBrandHeader />
      <div className="run-text-block">
        <TerminalTypingText
          key={messageId}
          text={text}
          running={false}
          startedAt={sentAt}
          animate={animate}
          onTypingComplete={() => {
            setTypingComplete(true);
          }}
          onOpenLinearDashboard={onOpenLinearDashboard}
          onOpenWhoopDashboard={onOpenWhoopDashboard}
        />
      </div>
      <div className="run-footer">
        <ActivityHeader
          durationMs={LINEAR_ASSISTANT_ACTIVITY_DURATION_MS}
          expanded={expanded}
          onToggle={() => setExpanded((current) => !current)}
          running={false}
          sentAt={sentAt}
        />
        {expanded && (
          <ActivityTimeline scrollKey={LINEAR_ASSISTANT_ACTIVITY_STEP_LABEL}>
            <ActivityStepRow
              kind="linear"
              label={LINEAR_ASSISTANT_ACTIVITY_STEP_LABEL}
              status="completed"
              durationMs={LINEAR_ASSISTANT_ACTIVITY_DURATION_MS}
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
