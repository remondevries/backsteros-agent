import type { ReactNode } from "react";
import { CursorIcon } from "../chat/CursorIcon";
import { LinearIcon } from "../chat/LinearIcon";
import type { RightPanelAgentId } from "./rightPanelAgents";

function RightPanelAgentIcon({ agentId }: { agentId: RightPanelAgentId }) {
  if (agentId === "linear") {
    return <LinearIcon size={14} />;
  }
  if (agentId === "cursor") {
    return <CursorIcon size={14} />;
  }
  return null;
}

export function RightPanelChatHeader({
  title,
  agentId,
  subtitle,
  actions,
}: {
  title: string;
  agentId?: RightPanelAgentId;
  subtitle?: string;
  actions?: ReactNode;
}) {
  const showAgentIcon = agentId === "linear" || agentId === "cursor";

  return (
    <header className="right-side-panel-chat-header">
      <div className="right-side-panel-chat-header-leading">
        {showAgentIcon && agentId ? (
          <span className="right-side-panel-chat-header-icon" aria-hidden="true">
            <RightPanelAgentIcon agentId={agentId} />
          </span>
        ) : null}
        <div className="right-side-panel-chat-header-text">
          <h2 className="right-side-panel-chat-title">{title}</h2>
          {subtitle ? (
            <p className="right-side-panel-chat-subtitle">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div className="right-side-panel-chat-header-actions">{actions}</div>
      ) : null}
    </header>
  );
}
