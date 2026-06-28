import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatView, type ChatViewHandle } from "../chat/ChatView";
import type { ChatMessage, RunViewModel } from "../chat/types";
import type { IntegrationsStatus } from "../lib/api";
import {
  buildChatFocusContext,
  composerContextItems as buildComposerContextItems,
  composerPlaceholderForFocus,
  isChatFocusContextLoading,
} from "../lib/chatFocusContext";
import {
  canWidenVaultChatContext,
  resolveVaultChatContextGoUpTarget,
  vaultChatContextGoUpLabel,
} from "../lib/vaultFolderContext";
import type { ActiveVaultFolder } from "./contentPanelNavigation";
import { useContentPanelNavigation, useFocusContent } from "./contentPanelNavigation";
import { LinearAgentPanel } from "./linear-threads/LinearIssueAgentPanel";
import { RightPanelChatHeader } from "./RightPanelChatHeader";
import {
  panelChatComposerVariant,
  resolveRightPanelAgent,
  supportsLinearPanelAgent,
} from "./rightPanelAgents";
import { registerRightPanelComposerFocus } from "../lib/rightPanelChatFocus";

type RightPanelSession = {
  sessionId: string;
  initialMessages: ChatMessage[];
  initialRuns: Record<string, RunViewModel>;
};

export function RightPanelChatSlot({
  integrationsStatus,
  session,
  onSaveState,
}: {
  integrationsStatus: IntegrationsStatus | null;
  session: RightPanelSession;
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
    activeVaultFolder,
    linearSelection,
    linearWorkspaceView,
  } = useContentPanelNavigation();
  const { focusContentSnapshot } = useFocusContent();
  const chatRef = useRef<ChatViewHandle>(null);
  const [vaultChatContextOverride, setVaultChatContextOverride] =
    useState<ActiveVaultFolder | null>(null);

  useEffect(() => {
    setVaultChatContextOverride(null);
  }, [activeVaultDocument?.path, activeVaultFolder?.path]);

  const focusContext = useMemo(
    () =>
      buildChatFocusContext({
        activeLinearIssue,
        activeLinearDocument,
        activeVaultDocument,
        activeVaultFolder,
        vaultChatContextOverride,
        linearSelection,
        linearWorkspaceView,
        focusContentSnapshot,
      }),
    [
      activeLinearDocument,
      activeLinearIssue,
      activeVaultDocument,
      activeVaultFolder,
      vaultChatContextOverride,
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

  useEffect(() => {
    if (!focusContext) return;
    // #region agent log
    fetch("http://127.0.0.1:7933/ingest/280fb855-6de7-45c0-90bf-5ee8faee78a1", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "180d80" },
      body: JSON.stringify({
        sessionId: "180d80",
        hypothesisId: "L,M",
        location: "RightPanelChatSlot.tsx:context",
        message: "Panel chat focus context state",
        data: {
          focusKind: focusContext.kind,
          composerContextLoading,
          snapshotKind: focusContentSnapshot?.kind ?? null,
          hasActiveLinearDocument: Boolean(activeLinearDocument),
          hasActiveLinearIssue: Boolean(activeLinearIssue),
          contextItemCount: focusContext
            ? buildComposerContextItems(focusContext).length
            : 0,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }, [
    activeLinearDocument,
    activeLinearIssue,
    composerContextLoading,
    focusContentSnapshot,
    focusContext,
  ]);

  const contextCardItems = useMemo(
    () => (focusContext ? buildComposerContextItems(focusContext) : []),
    [focusContext],
  );

  const handleContextGoUp = useCallback(() => {
    if (!focusContext) return;
    const target = resolveVaultChatContextGoUpTarget(focusContext);
    if (!target) return;

    setVaultChatContextOverride({
      path: target.path,
      title: target.title,
    });
  }, [focusContext]);

  const composerContextGoUp = useMemo(() => {
    if (!focusContext || !canWidenVaultChatContext(focusContext)) return undefined;
    const target = resolveVaultChatContextGoUpTarget(focusContext);
    if (!target) return undefined;
    return {
      label: vaultChatContextGoUpLabel(focusContext),
      onGoUp: handleContextGoUp,
    };
  }, [focusContext, handleContextGoUp]);

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

  const isLinearNativeAgentMode =
    linearPanelAgentActive &&
    (focusContext?.kind === "linear_issue" || focusContext?.kind === "linear_document");

  useEffect(() => {
    if (isLinearNativeAgentMode) return undefined;

    return registerRightPanelComposerFocus({
      focusComposer: () => {
        chatRef.current?.focusComposer();
      },
    });
  }, [isLinearNativeAgentMode]);

  if (focusContext?.kind === "linear_issue") {
    return (
      <LinearAgentPanel target={{ kind: "issue", id: focusContext.issueId }} />
    );
  }

  if (focusContext?.kind === "linear_document") {
    return (
      <LinearAgentPanel target={{ kind: "document", id: focusContext.documentId }} />
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
        <RightPanelChatHeader
          title={resolvedAgent.label}
          agentId={resolvedAgent.active}
          subtitle={headerSubtitle}
        />
        <div className="right-side-panel-chat-body">
          <ChatView
            ref={chatRef}
            sessionId={session.sessionId}
            isActive
            layout="panel"
            initialMessages={session.initialMessages}
            initialRuns={session.initialRuns}
            focusContext={focusContext}
            composerContextItems={contextCardItems}
            composerContextLoading={composerContextLoading}
            composerContextGoUp={composerContextGoUp}
            composerPlaceholder={composerPlaceholderForFocus(
              focusContext,
              resolvedAgent.active,
            )}
            panelComposerVariant={panelChatComposerVariant(resolvedAgent.active)}
            onStateChange={(messages, runs) => onSaveState(session.sessionId, messages, runs)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="right-side-panel-chat">
      <RightPanelChatHeader title={resolvedAgent.label} agentId={resolvedAgent.active} />
      <div className="right-side-panel-chat-body">
        <p className="right-side-panel-empty">This agent is not available yet.</p>
      </div>
    </div>
  );
}
