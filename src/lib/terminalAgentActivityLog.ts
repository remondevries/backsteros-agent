import { subscribeAgentTransitions } from "../modules/terminal/lib/agentActivity";
import { leafIdForPty } from "../modules/terminal/lib/useTerminalSession";
import {
  appendTerminalAgentActivityLog,
  type TerminalAgentLogState,
} from "./linearWatcherActivityLog";

export type TerminalAgentLogContext = {
  issueId: string;
  identifier: string;
  title: string;
  projectId: string;
  projectName: string;
  issueStatus?: string;
  issueStateType?: string;
};

const contextByLeaf = new Map<number, TerminalAgentLogContext>();
const lastStateByLeaf = new Map<number, TerminalAgentLogState>();
const agentNameByLeaf = new Map<number, string>();

/**
 * Associate a terminal leaf (issue terminal session) with the Linear issue it
 * belongs to, so agent activity can be logged with full context even when the
 * issue isn't currently on screen.
 */
export function registerTerminalAgentLogContext(
  leafId: number,
  context: TerminalAgentLogContext,
): void {
  if (!context.projectId.trim() || !context.issueId.trim()) return;
  contextByLeaf.set(leafId, context);
}

function logStateForKind(kind: string): TerminalAgentLogState | null {
  switch (kind) {
    case "started":
    case "working":
      return "working";
    case "attention":
      return "approval";
    case "finished":
      return "finished";
    case "exited":
      return "exited";
    default:
      return null;
  }
}

function agentDisplayName(name: string | null): string {
  if (!name) return "Agent";
  return `${name.charAt(0).toUpperCase()}${name.slice(1)}`;
}

function summaryForState(state: TerminalAgentLogState, agentName: string | null): string {
  const name = agentDisplayName(agentName);
  switch (state) {
    case "working":
      return `${name} is working`;
    case "approval":
      return `${name} is waiting on approval`;
    case "finished":
      return `${name} finished and is idle`;
    case "exited":
      return `${name} session ended`;
  }
}

let bridgeReady = false;

/**
 * Idempotently start mirroring agent lifecycle transitions into the shared
 * activity log. Safe to call from multiple mount points.
 */
export function ensureTerminalAgentActivityLogBridge(): void {
  if (bridgeReady || typeof window === "undefined") return;
  bridgeReady = true;

  subscribeAgentTransitions((ptyId, kind, agent) => {
    const leafId = leafIdForPty(ptyId);
    if (leafId === null) return;

    if (agent) {
      agentNameByLeaf.set(leafId, agent);
    }

    const state = logStateForKind(kind);
    if (!state) return;

    // Collapse repeated identical states (e.g. multiple "working" signals).
    if (lastStateByLeaf.get(leafId) === state) return;
    lastStateByLeaf.set(leafId, state);

    const context = contextByLeaf.get(leafId);
    const agentName = agentNameByLeaf.get(leafId) ?? agent;

    if (state === "exited") {
      lastStateByLeaf.delete(leafId);
      agentNameByLeaf.delete(leafId);
    }

    if (!context) return;

    appendTerminalAgentActivityLog({
      projectId: context.projectId,
      projectName: context.projectName,
      issueId: context.issueId,
      identifier: context.identifier,
      title: context.title,
      summary: summaryForState(state, agentName),
      agentState: state,
      detectedAt: new Date().toISOString(),
      issueStatus: context.issueStatus,
      issueStateType: context.issueStateType,
    });
  });
}
