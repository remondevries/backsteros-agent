import { listen } from "@tauri-apps/api/event";

type AgentSignal = { id: number; kind: string };

const active = new Set<number>();
const working = new Set<number>();
const waiting = new Set<number>();
let onExited: ((ptyId: number) => void) | null = null;
let bound = false;

export function ensureAgentActivityListener(
  exited: (ptyId: number) => void,
): void {
  onExited = exited;
  if (bound || typeof window === "undefined") return;
  bound = true;
  void listen<AgentSignal>("backsteros:agent-signal", (e) => {
    const { id, kind } = e.payload;
    if (kind === "started") {
      active.add(id);
      working.add(id);
      waiting.delete(id);
      return;
    }

    if (kind === "working") {
      active.add(id);
      working.add(id);
      waiting.delete(id);
      return;
    }

    if (kind === "attention") {
      active.add(id);
      working.delete(id);
      waiting.add(id);
      return;
    }

    if (kind === "finished") {
      active.add(id);
      working.delete(id);
      // "finished" means the agent stopped generating and is now awaiting
      // user input/next prompt, which should be rendered as waiting.
      waiting.add(id);
      return;
    }

    if (kind === "waiting" || kind === "prompt") {
      active.add(id);
      working.delete(id);
      waiting.add(id);
      return;
    }

    if (kind === "exited") {
      active.delete(id);
      working.delete(id);
      waiting.delete(id);
      onExited?.(id);
    }
  });
}

export function isAgentActivePty(ptyId: number): boolean {
  return active.has(ptyId);
}

export function isAgentWorkingPty(ptyId: number): boolean {
  return working.has(ptyId);
}

export function isAgentWaitingPty(ptyId: number): boolean {
  return waiting.has(ptyId);
}
