import { useMemo } from "react";
import { ChatView } from "../chat/ChatView";
import type { ChatMessage, RunViewModel } from "../chat/types";
import type { AppView } from "./appViews";
import type { IntegrationsStatus } from "../lib/api";
import { buildChatFocusContext, chatFocusContextLabel } from "../lib/chatFocusContext";
import { useContentPanelNavigation } from "./contentPanelNavigation";
import { LinearIssueAgentPanel } from "./linear-threads/LinearIssueAgentPanel";
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
  const { activeLinearIssue, activeVaultDocument, focusContentSnapshot } =
    useContentPanelNavigation();

  const focusContext = useMemo(
    () =>
      buildChatFocusContext({
        activeLinearIssue,
        activeVaultDocument,
        focusContentSnapshot,
      }),
    [activeLinearIssue, activeVaultDocument, focusContentSnapshot],
  );

  const resolvedAgent = useMemo(
    () =>
      resolveRightPanelAgent({
        activeView,
        integrationsStatus,
        hasLinearFocus: focusContext !== null,
      }),
    [activeView, focusContext, integrationsStatus],
  );

  const isLinearIssueThreadMode =
    resolvedAgent.active === "linear" && focusContext?.kind === "linear_issue";

  if (isLinearIssueThreadMode) {
    return (
      <LinearIssueAgentPanel
        issueId={focusContext.issueId}
        identifier={focusContext.identifier}
        title={focusContext.title}
      />
    );
  }

  const headerSubtitle = resolvedAgent.fallbackReason
    ? resolvedAgent.fallbackReason
    : resolvedAgent.requested !== resolvedAgent.active
      ? `Requested ${resolvedAgent.requested} agent`
      : focusContext
        ? chatFocusContextLabel(focusContext)
        : undefined;

  if (resolvedAgent.active === "cursor" || resolvedAgent.active === "linear") {
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
            focusContext={focusContext}
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
