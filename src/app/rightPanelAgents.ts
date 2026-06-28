import type { ActiveLinearDocument, ActiveLinearIssue } from "./contentPanelNavigation";
import type { IntegrationsStatus } from "../lib/api";

export type RightPanelAgentId = "cursor" | "linear";

/** UI variant for the right-panel composer — Backster vs Linear are separate surfaces. */
export type PanelChatComposerVariant = "backster" | "linear";

export function panelChatComposerVariant(
  activeAgent: RightPanelAgentId,
): PanelChatComposerVariant {
  return activeAgent === "linear" ? "linear" : "backster";
}

export function showsBacksterComposerOptions(
  layout: "default" | "panel",
  panelComposerVariant?: PanelChatComposerVariant,
): boolean {
  return layout !== "panel" || panelComposerVariant !== "linear";
}

export function isLinearOnlyComposer(panelComposerVariant?: PanelChatComposerVariant): boolean {
  return panelComposerVariant === "linear";
}

export type ResolvedRightPanelAgent = {
  requested: RightPanelAgentId;
  active: RightPanelAgentId;
  label: string;
  fallbackReason?: string;
};

const AGENT_LABELS: Record<RightPanelAgentId, string> = {
  cursor: "Cursor agent",
  linear: "Linear",
};

/** Agents with a dedicated chat implementation in the right panel. */
const IMPLEMENTED_AGENTS = new Set<RightPanelAgentId>(["cursor", "linear"]);

export function isLinearIntegrationAvailable(status: IntegrationsStatus | null): boolean {
  if (!status) return false;
  return Boolean(status.linear?.authenticated);
}

export function isCursorAgentAvailable(status: IntegrationsStatus | null): boolean {
  return Boolean(status?.cursorApiKey.configured);
}

/** Linear agent requires an open issue or document — not project/team tabs alone. */
export function supportsLinearPanelAgent(input: {
  activeLinearIssue: ActiveLinearIssue | null;
  activeLinearDocument: ActiveLinearDocument | null;
}): boolean {
  return Boolean(input.activeLinearIssue || input.activeLinearDocument);
}

function requestAgentForView(hasLinearAgentFocus: boolean): RightPanelAgentId {
  if (hasLinearAgentFocus) return "linear";
  return "cursor";
}

function isAgentImplemented(agentId: RightPanelAgentId): boolean {
  return IMPLEMENTED_AGENTS.has(agentId);
}

function isLinearPanelAgentAvailable(status: IntegrationsStatus | null): boolean {
  return isLinearIntegrationAvailable(status);
}

function isAgentAvailable(
  agentId: RightPanelAgentId,
  status: IntegrationsStatus | null,
): boolean {
  if (agentId === "cursor") return isCursorAgentAvailable(status);
  if (agentId === "linear") return isLinearPanelAgentAvailable(status);
  return false;
}

function linearPanelFallbackReason(status: IntegrationsStatus | null): string | undefined {
  if (!isAgentImplemented("linear")) {
    return "Linear agent is not available yet";
  }
  if (!isLinearIntegrationAvailable(status)) {
    return "Connect Linear in Settings to use the Linear agent";
  }
  return undefined;
}

export function resolveRightPanelAgent(input: {
  integrationsStatus: IntegrationsStatus | null;
  activeLinearIssue: ActiveLinearIssue | null;
  activeLinearDocument: ActiveLinearDocument | null;
}): ResolvedRightPanelAgent {
  const focus = {
    activeLinearIssue: input.activeLinearIssue,
    activeLinearDocument: input.activeLinearDocument,
  };
  const requested = requestAgentForView(supportsLinearPanelAgent(focus));
  const label = AGENT_LABELS[requested];

  if (requested === "linear" && isAgentImplemented("linear")) {
    if (isLinearPanelAgentAvailable(input.integrationsStatus)) {
      return { requested, active: "linear", label: AGENT_LABELS.linear };
    }
  }

  if (
    isAgentImplemented(requested) &&
    isAgentAvailable(requested, input.integrationsStatus)
  ) {
    return { requested, active: requested, label: AGENT_LABELS[requested] };
  }

  const cursorAvailable = isCursorAgentAvailable(input.integrationsStatus);
  const cursorImplemented = isAgentImplemented("cursor");

  if (cursorImplemented && (cursorAvailable || requested !== "cursor")) {
    return {
      requested,
      active: "cursor",
      label: AGENT_LABELS.cursor,
      fallbackReason: requested === "linear" ? linearPanelFallbackReason(input.integrationsStatus) : undefined,
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
