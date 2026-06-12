import { useMemo } from "react";
import { ChatView } from "../chat/ChatView";
import type { ChatMessage, RunViewModel } from "../chat/types";
import type { AppView } from "./appViews";
import type { IntegrationsStatus } from "../lib/api";
import {
  buildChatFocusContext,
  composerContextItems as buildComposerContextItems,
  composerPlaceholderForFocus,
  isChatFocusContextLoading,
} from "../lib/chatFocusContext";
import { useContentPanelNavigation } from "./contentPanelNavigation";
import { LinearIssueAgentPanel } from "./linear-threads/LinearIssueAgentPanel";
import {
  panelChatComposerVariant,
  resolveRightPanelAgent,
  supportsLinearPanelAgent,
} from "./rightPanelAgents";

type RightPanelSession = {
  sessionId: string;
  initialMessages: ChatMessage[];
  initialRuns: Record<string, RunViewModel>;
};

export function RightPanelChatSlot({
  integrationsStatus,
  session,
  onNavigateToView,
  onSaveState,
}: {
  integrationsStatus: IntegrationsStatus | null;
  session: RightPanelSession;
  onNavigateToView: (view: AppView) => void;
  onSaveState: (
    sessionId: string,
    messages: ChatMessage[],
    runs: Record<string, RunViewModel>,
  ) => void;
}) {
  const {
    activeLinearIssue,
    activeLinearDocument,
    activeVaultDocument,
    focusContentSnapshot,
    linearSelection,
    linearWorkspaceView,
  } = useContentPanelNavigation();

  const focusContext = useMemo(
    () =>
      buildChatFocusContext({
        activeLinearIssue,
        activeLinearDocument,
        activeVaultDocument,
        linearSelection,
        linearWorkspaceView,
        focusContentSnapshot,
      }),
    [
      activeLinearDocument,
      activeLinearIssue,
      activeVaultDocument,
      focusContentSnapshot,
      linearSelection,
      linearWorkspaceView,
    ],
  );

  const composerContextLoading = useMemo(
    () =>
      focusContext
        ? isChatFocusContextLoading(focusContext, focusContentSnapshot)
        : false,
    [focusContext, focusContentSnapshot],
  );

  const contextCardItems = useMemo(
    () => (focusContext ? buildComposerContextItems(focusContext) : []),
    [focusContext],
  );

  const resolvedAgent = useMemo(
    () =>
      resolveRightPanelAgent({
        integrationsStatus,
        activeLinearIssue,
        activeLinearDocument,
      }),
    [activeLinearDocument, activeLinearIssue, integrationsStatus],
  );

  const linearPanelAgentActive = supportsLinearPanelAgent({
    activeLinearIssue,
    activeLinearDocument,
  });

  const isLinearIssueThreadMode =
    linearPanelAgentActive && focusContext?.kind === "linear_issue";

  if (isLinearIssueThreadMode) {
    return (
      <LinearIssueAgentPanel
        issueId={focusContext.issueId}
        onNavigateToView={onNavigateToView}
      />
    );
  }

  const headerSubtitle = resolvedAgent.fallbackReason
    ? resolvedAgent.fallbackReason
    : resolvedAgent.requested !== resolvedAgent.active
      ? `Requested ${resolvedAgent.requested} agent`
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
            composerContextItems={contextCardItems}
            composerContextLoading={composerContextLoading}
            composerPlaceholder={composerPlaceholderForFocus(
              focusContext,
              resolvedAgent.active,
            )}
            panelComposerVariant={panelChatComposerVariant(resolvedAgent.active)}
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
