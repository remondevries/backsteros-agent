import type { ReactNode } from "react";
import { RightPanelChatSlot } from "./RightPanelChatSlot";
import type { ChatMessage, RunViewModel } from "../chat/types";
import { useIntegrationsStatus } from "../settings/useIntegrationsStatus";

type RightPanelSession = {
  sessionId: string;
  initialMessages: ChatMessage[];
  initialRuns: Record<string, RunViewModel>;
};

export function RightSidePanel({
  chatEnabled,
  session,
  sessionLoading,
  onSaveSessionState,
}: {
  chatEnabled: boolean;
  session: RightPanelSession | null;
  sessionLoading: boolean;
  onSaveSessionState: (
    sessionId: string,
    messages: ChatMessage[],
    runs: Record<string, RunViewModel>,
  ) => void;
}) {
  const { status: integrationsStatus } = useIntegrationsStatus(chatEnabled);
  let body: ReactNode;

  if (!chatEnabled) {
    body = (
      <p className="right-side-panel-empty">
        Configure your vault in Settings to use the assistant panel.
      </p>
    );
  } else if (sessionLoading) {
    body = <p className="right-side-panel-empty">Loading assistant…</p>;
  } else if (session) {
    body = (
      <RightPanelChatSlot
        integrationsStatus={integrationsStatus}
        session={session}
        onSaveState={onSaveSessionState}
      />
    );
  } else {
    body = (
      <p className="right-side-panel-empty">
        Assistant unavailable. Check your Cursor API key in Settings.
      </p>
    );
  }

  return (
    <div className="right-side-panel">
      <div className="right-side-panel-body">{body}</div>
    </div>
  );
}
