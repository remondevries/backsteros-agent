import type { AppView } from "./appViews";
import type { IntegrationsStatus } from "../lib/api";

export type RightPanelAgentId = "cursor" | "linear";

export type ResolvedRightPanelAgent = {
  requested: RightPanelAgentId;
  active: RightPanelAgentId;
  label: string;
  fallbackReason?: string;
};

const AGENT_LABELS: Record<RightPanelAgentId, string> = {
  cursor: "Cursor agent",
  linear: "Linear agent",
};

/** Agents with a dedicated chat implementation in the right panel. */
const IMPLEMENTED_AGENTS = new Set<RightPanelAgentId>(["cursor"]);

export function isLinearIntegrationAvailable(status: IntegrationsStatus | null): boolean {
  if (!status) return false;
  if (status.linearApiKey.configured) return true;
  return Boolean(status.linear?.authenticated);
}

export function isCursorAgentAvailable(status: IntegrationsStatus | null): boolean {
  return Boolean(status?.cursorApiKey.configured);
}

function requestAgentForView(activeView: AppView): RightPanelAgentId {
  if (activeView === "linear") return "linear";
  return "cursor";
}

function isAgentImplemented(agentId: RightPanelAgentId): boolean {
  return IMPLEMENTED_AGENTS.has(agentId);
}

function isAgentAvailable(
  agentId: RightPanelAgentId,
  status: IntegrationsStatus | null,
): boolean {
  if (agentId === "cursor") return isCursorAgentAvailable(status);
  if (agentId === "linear") return isLinearIntegrationAvailable(status);
  return false;
}

export function resolveRightPanelAgent(input: {
  activeView: AppView;
  integrationsStatus: IntegrationsStatus | null;
}): ResolvedRightPanelAgent {
  const requested = requestAgentForView(input.activeView);
  const label = AGENT_LABELS[requested];

  if (
    isAgentImplemented(requested) &&
    isAgentAvailable(requested, input.integrationsStatus)
  ) {
    return { requested, active: requested, label: AGENT_LABELS[requested] };
  }

  const cursorAvailable = isCursorAgentAvailable(input.integrationsStatus);
  const cursorImplemented = isAgentImplemented("cursor");

  if (cursorImplemented && (cursorAvailable || requested !== "cursor")) {
    let fallbackReason: string | undefined;
    if (requested === "linear") {
      if (!isAgentImplemented("linear")) {
        fallbackReason = "Linear agent is not available yet";
      } else if (!isLinearIntegrationAvailable(input.integrationsStatus)) {
        fallbackReason = "Connect Linear in Settings to use the Linear agent";
      }
    }

    return {
      requested,
      active: "cursor",
      label: AGENT_LABELS.cursor,
      fallbackReason,
    };
  }

  return {
    requested,
    active: requested,
    label,
  };
}

export function getRightPanelAgentLabel(agentId: RightPanelAgentId): string {
  return AGENT_LABELS[agentId];
}
