import { listen } from "@tauri-apps/api/event";

type AgentSignal = {
  id: number;
  kind: string;
  agent?: string | null;
  reason?: string | null;
  runId?: number;
  run_id?: number;
  seq?: number;
  tsMs?: number;
  ts_ms?: number;
};

export type AgentLifecycle =
  | "inactive"
  | "activating"
  | "active"
  | "deactivating"
  | "failed";
export type AgentSubstate = "idle" | "working" | "waiting_for_user";

export type AgentPtyState = {
  ptyId: number;
  lifecycle: AgentLifecycle;
  substate: AgentSubstate;
  runId: number;
  lastSeq: number;
  lastTransitionAt: number;
  lastSignalAt: number;
  agent: string | null;
  reason: string | null;
};

export type AgentTransitionListener = (
  ptyId: number,
  kind: string,
  agent: string | null,
) => void;

const ptyStates = new Map<number, AgentPtyState>();
const fallbackSeqByPty = new Map<number, number>();
const transitionListeners = new Set<AgentTransitionListener>();
const activityListeners = new Set<() => void>();

let onExited: ((ptyId: number) => void) | null = null;
let bound = false;

function defaultReason(kind: string): string | null {
  if (kind === "started") return "agent_started";
  if (kind === "working") return "agent_working";
  if (kind === "attention") return "agent_attention";
  if (kind === "finished") return "agent_finished";
  if (kind === "waiting") return "agent_waiting";
  if (kind === "prompt") return "agent_prompt";
  if (kind === "exited") return "agent_exited";
  return null;
}

function createDefaultState(ptyId: number): AgentPtyState {
  return {
    ptyId,
    lifecycle: "inactive",
    substate: "idle",
    runId: 0,
    lastSeq: 0,
    lastTransitionAt: 0,
    lastSignalAt: 0,
    agent: null,
    reason: null,
  };
}

function toPositiveInteger(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const parsed = Math.trunc(value);
  return parsed > 0 ? parsed : null;
}

function nextSignalSeq(
  ptyId: number,
  previousSeq: number,
  incomingSeq?: number,
): { seq: number; fallback: number } {
  const fallback = (fallbackSeqByPty.get(ptyId) ?? previousSeq) + 1;
  const seq = toPositiveInteger(incomingSeq) ?? fallback;
  return { seq, fallback };
}

function reduceSignal(previous: AgentPtyState, signal: AgentSignal): AgentPtyState {
  const { seq, fallback } = nextSignalSeq(signal.id, previous.lastSeq, signal.seq);

  const runIdFromSignal = toPositiveInteger(signal.runId ?? signal.run_id);
  let runId = runIdFromSignal ?? previous.runId;
  if (signal.kind === "started" && runIdFromSignal === null) {
    runId = previous.runId + 1;
  } else if (runId === 0) {
    runId = 1;
  }
  if (runId < previous.runId) {
    return previous;
  }
  if (runId === previous.runId && seq <= previous.lastSeq) {
    return previous;
  }
  fallbackSeqByPty.set(signal.id, Math.max(seq, fallback));

  const transitionAt = Math.max(
    toPositiveInteger(signal.tsMs ?? signal.ts_ms) ?? Date.now(),
    previous.lastTransitionAt,
  );
  const reason =
    typeof signal.reason === "string" && signal.reason.trim().length > 0
      ? signal.reason
      : defaultReason(signal.kind);

  const withMeta = {
    ...previous,
    runId,
    lastSeq: seq,
    lastTransitionAt: transitionAt,
    lastSignalAt: Date.now(),
    reason,
  };

  if (signal.kind === "started") {
    return {
      ...withMeta,
      lifecycle: "activating",
      substate: "working",
      agent: typeof signal.agent === "string" ? signal.agent : previous.agent,
    };
  }

  if (signal.kind === "working") {
    return {
      ...withMeta,
      lifecycle: previous.lifecycle === "inactive" ? "activating" : "active",
      substate: "working",
    };
  }

  if (signal.kind === "attention") {
    return {
      ...withMeta,
      lifecycle: previous.lifecycle === "inactive" ? "activating" : "active",
      substate: "waiting_for_user",
    };
  }

  if (signal.kind === "finished") {
    return {
      ...withMeta,
      lifecycle: "active",
      substate: "waiting_for_user",
    };
  }

  if (signal.kind === "waiting" || signal.kind === "prompt") {
    return {
      ...withMeta,
      lifecycle: previous.lifecycle === "inactive" ? "activating" : "active",
      substate: "waiting_for_user",
    };
  }

  if (signal.kind === "exited") {
    return {
      ...withMeta,
      lifecycle: "inactive",
      substate: "idle",
      agent: null,
    };
  }

  return previous;
}

function notifyActivityListeners(): void {
  for (const listener of activityListeners) {
    listener();
  }
}

function ingestSignal(signal: AgentSignal): void {
  const previous = ptyStates.get(signal.id) ?? createDefaultState(signal.id);
  const next = reduceSignal(previous, signal);
  if (next === previous) return;

  ptyStates.set(signal.id, next);

  for (const listener of transitionListeners) {
    listener(signal.id, signal.kind, signal.agent ?? null);
  }
  notifyActivityListeners();

  if (previous.lifecycle !== "inactive" && next.lifecycle === "inactive") {
    onExited?.(signal.id);
  }
}

/**
 * Subscribe to raw agent lifecycle transitions (started/working/attention/
 * finished/exited) for any PTY. Used to mirror agent activity into the shared
 * activity log without coupling the low-level detector to Linear concepts.
 */
export function subscribeAgentTransitions(listener: AgentTransitionListener): () => void {
  transitionListeners.add(listener);
  return () => {
    transitionListeners.delete(listener);
  };
}

export function subscribeAgentActivity(listener: () => void): () => void {
  activityListeners.add(listener);
  return () => {
    activityListeners.delete(listener);
  };
}

export function ensureAgentActivityListener(
  exited: (ptyId: number) => void,
): void {
  onExited = exited;
  if (bound || typeof window === "undefined") return;
  bound = true;
  void listen<AgentSignal>("backsteros:agent-signal", (e) => {
    ingestSignal(e.payload);
  });
}

export function isAgentActivePty(ptyId: number): boolean {
  const state = ptyStates.get(ptyId);
  if (!state) return false;
  return state.lifecycle === "active" || state.lifecycle === "activating";
}

export function isAgentWorkingPty(ptyId: number): boolean {
  const state = ptyStates.get(ptyId);
  if (!state) return false;
  return (
    (state.lifecycle === "active" || state.lifecycle === "activating") &&
    state.substate === "working"
  );
}

export function isAgentWaitingPty(ptyId: number): boolean {
  const state = ptyStates.get(ptyId);
  if (!state) return false;
  return (
    (state.lifecycle === "active" || state.lifecycle === "activating") &&
    state.substate === "waiting_for_user"
  );
}

export function getAgentPtyState(ptyId: number): AgentPtyState | null {
  return ptyStates.get(ptyId) ?? null;
}

export function markAgentPtyExited(ptyId: number, reason = "pty_closed"): void {
  ingestSignal({ id: ptyId, kind: "exited", reason });
}

export function __applyAgentSignalForTests(signal: AgentSignal): void {
  ingestSignal(signal);
}

export function __resetAgentActivityForTests(): void {
  ptyStates.clear();
  fallbackSeqByPty.clear();
  transitionListeners.clear();
  activityListeners.clear();
  onExited = null;
}
