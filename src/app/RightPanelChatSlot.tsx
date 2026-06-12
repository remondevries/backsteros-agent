import { useMemo } from "react";
import { ChatView } from "../chat/ChatView";
import type { ChatMessage, RunViewModel } from "../chat/types";
import type { AppView } from "./appViews";
import type { IntegrationsStatus } from "../lib/api";
import { resolveRightPanelAgent } from "./rightPanelAgents";

type RightPanelSession = {
  sessionId: string;
  initialMessages: ChatMessage[];
  initialRuns: Record<string, RunViewModel>;
};

export function RightPanelChatSlot({
  activeView,
  integrationsStatus,
  session,
  onNavigateToView,
  onSaveState,
}: {
  activeView: AppView;
  integrationsStatus: IntegrationsStatus | null;
  session: RightPanelSession;
  onNavigateToView: (view: AppView) => void;
  onSaveState: (
    sessionId: string,
    messages: ChatMessage[],
    runs: Record<string, RunViewModel>,
  ) => void;
}) {
  const resolvedAgent = useMemo(
    () =>
      resolveRightPanelAgent({
        activeView,
        integrationsStatus,
      }),
    [activeView, integrationsStatus],
  );

  const headerSubtitle = resolvedAgent.fallbackReason
    ? resolvedAgent.fallbackReason
    : resolvedAgent.requested !== resolvedAgent.active
      ? `Requested ${resolvedAgent.requested} agent`
      : undefined;

  if (resolvedAgent.active === "cursor") {
    return (
      <div className="right-side-panel-chat">
        <header className="right-side-panel-chat-header">
          <div className="right-side-panel-chat-header-text">
            <h2 className="right-side-panel-chat-title">{resolvedAgent.label}</h2>
            {headerSubtitle ? (
              <p className="right-side-panel-chat-subtitle">{headerSubtitle}</p>
            ) : null}
          </div>
        </header>
        <div className="right-side-panel-chat-body">
          <ChatView
            sessionId={session.sessionId}
            isActive
            layout="panel"
            initialMessages={session.initialMessages}
            initialRuns={session.initialRuns}
            onStateChange={(messages, runs) => onSaveState(session.sessionId, messages, runs)}
            onNavigateToView={onNavigateToView}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="right-side-panel-chat">
      <header className="right-side-panel-chat-header">
        <h2 className="right-side-panel-chat-title">{resolvedAgent.label}</h2>
      </header>
      <div className="right-side-panel-chat-body">
        <p className="right-side-panel-empty">This agent is not available yet.</p>
      </div>
    </div>
  );
}
