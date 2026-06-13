import { ensureMonoFontsLoaded } from "../../../lib/fonts";
import { useTerminalPreferences } from "../preferences";
import { invoke } from "@tauri-apps/api/core";
import type { SearchAddon } from "@xterm/addon-search";
import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { DormantRing } from "./dormantRing";
import {
  createShellIntegrationState,
  registerCwdHandler,
  registerPromptTracker,
} from "./osc-handlers";
import { openPty, type PtySession } from "./pty-bridge";
import {
  ensureAgentActivityListener,
  isAgentActivePty,
  isAgentWaitingPty,
  isAgentWorkingPty,
  markAgentPtyExited,
  subscribeAgentActivity,
} from "./agentActivity";
import {
  acquireSlot,
  applyBackgroundActive,
  applyCursorBlink,
  applyFontFamily,
  applyFontSize,
  applyLetterSpacing,
  applyTheme as applyPoolTheme,
  applyScrollback,
  applyWebglPreference,
  configureRendererPool,
  discardRetainedSlot,
  disposeLeafSlot,
  focusSlot,
  getLiveSlotForLeaf,
  getSlotForLeaf,
  isLeafAltScreen,
  parkLeafSlot,
  refreshLeafSlot,
  releaseSlot,
  setSlotFocused,
} from "./rendererPool";

type Callbacks = {
  onSearchReady?: (addon: SearchAddon) => void;
  onExit?: (code: number) => void;
  onCwd?: (cwd: string) => void;
};

type Session = {
  pty: PtySession | null;
  ptyOpening: boolean;
  initialCwd: string | undefined;
  lastCwd: string | null;
  pendingExit: number | null;
  shellExited: boolean;
  callbacks: Callbacks;
  visibleNow: boolean;
  focusedNow: boolean;
  disposed: boolean;
  ready: Promise<void>;
  cols: number;
  rows: number;
  container: HTMLDivElement | null;
  snapshot: string | null;
  searchQuery: string | null;
  dormantRing: DormantRing;
  hasSlot: boolean;
  altScreenAtRelease: boolean;
  commandRunning: boolean;
  hiddenReleaseTimer: ReturnType<typeof setTimeout> | null;
  spawnFailed: boolean;
};

const sessions = new Map<number, Session>();

export function isLeafSessionActive(leafId: number): boolean {
  const session = sessions.get(leafId);
  if (!session || session.disposed) return false;
  return session.pty !== null || session.ptyOpening;
}

const leafSessionActiveListeners = new Set<() => void>();
let leafSessionActiveTick: ReturnType<typeof setInterval> | null = null;
let detachAgentActivitySubscription: (() => void) | null = null;

function notifyLeafSessionActiveListeners(): void {
  for (const listener of leafSessionActiveListeners) {
    listener();
  }
}

function startLeafSessionActiveTick(): void {
  if (leafSessionActiveTick !== null) return;
  leafSessionActiveTick = setInterval(() => {
    notifyLeafSessionActiveListeners();
  }, 700);
}

function stopLeafSessionActiveTick(): void {
  if (leafSessionActiveTick === null) return;
  clearInterval(leafSessionActiveTick);
  leafSessionActiveTick = null;
}

function subscribeLeafSessionActive(listener: () => void): () => void {
  leafSessionActiveListeners.add(listener);
  if (!detachAgentActivitySubscription) {
    detachAgentActivitySubscription = subscribeAgentActivity(
      notifyLeafSessionActiveListeners,
    );
  }
  startLeafSessionActiveTick();
  return () => {
    leafSessionActiveListeners.delete(listener);
    if (leafSessionActiveListeners.size === 0) {
      detachAgentActivitySubscription?.();
      detachAgentActivitySubscription = null;
      stopLeafSessionActiveTick();
    }
  };
}

export function useLeafSessionActive(leafId: number): boolean {
  return useSyncExternalStore(
    (listener) => subscribeLeafSessionActive(listener),
    () => isLeafSessionActive(leafId),
    () => false,
  );
}

export function isLeafAgentActive(leafId: number): boolean {
  const session = sessions.get(leafId);
  if (!session || session.disposed || !session.pty) return false;
  return isAgentActivePty(session.pty.id);
}

export function useLeafAgentActive(leafId: number): boolean {
  return useSyncExternalStore(
    (listener) => subscribeLeafSessionActive(listener),
    () => isLeafAgentActive(leafId),
    () => false,
  );
}

export function isLeafAgentWorking(leafId: number): boolean {
  const session = sessions.get(leafId);
  if (!session || session.disposed || !session.pty) return false;
  // Working is driven purely by the agent's own lifecycle markers
  // (started/working set membership). The CLI process being alive
  // (commandRunning) is NOT used as a proxy: an interactive agent keeps a
  // single long-lived foreground command running even while idle, so it would
  // otherwise never reach the "not doing anything" (green) state.
  return isAgentWorkingPty(session.pty.id);
}

export function useLeafAgentWorking(leafId: number): boolean {
  return useSyncExternalStore(
    (listener) => subscribeLeafSessionActive(listener),
    () => isLeafAgentWorking(leafId),
    () => false,
  );
}

export function isLeafAgentWaiting(leafId: number): boolean {
  const session = sessions.get(leafId);
  if (!session || session.disposed || !session.pty) return false;
  const ptyId = session.pty.id;
  if (!isAgentActivePty(ptyId)) return false;
  // Trust the explicit waiting marker even while a foreground command is
  // running: the agent CLI itself keeps commandRunning=true the whole time it
  // is open, so it cannot be used to disqualify the waiting state.
  return isAgentWaitingPty(ptyId);
}

export function useLeafAgentWaiting(leafId: number): boolean {
  return useSyncExternalStore(
    (listener) => subscribeLeafSessionActive(listener),
    () => isLeafAgentWaiting(leafId),
    () => false,
  );
}

const readyLeaves = new Set<number>();
const readyWaiters = new Map<
  number,
  { resolve: () => void; timer: ReturnType<typeof setTimeout> }[]
>();

function markSessionReady(leafId: number): void {
  if (readyLeaves.has(leafId)) return;
  readyLeaves.add(leafId);
  const waiters = readyWaiters.get(leafId);
  if (!waiters) return;
  readyWaiters.delete(leafId);
  for (const w of waiters) {
    clearTimeout(w.timer);
    w.resolve();
  }
}

export function whenSessionReady(
  leafId: number,
  timeoutMs = 4000,
): Promise<void> {
  if (readyLeaves.has(leafId)) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      const arr = readyWaiters.get(leafId);
      const i = arr?.findIndex((w) => w.timer === timer) ?? -1;
      if (arr && i >= 0) arr.splice(i, 1);
      resolve();
    }, timeoutMs);
    const arr = readyWaiters.get(leafId) ?? [];
    arr.push({ resolve, timer });
    readyWaiters.set(leafId, arr);
  });
}

export function writeToSession(leafId: number, data: string): boolean {
  const s = sessions.get(leafId);
  if (!s?.pty) return false;
  void s.pty.write(data);
  return true;
}

export function leafCwd(leafId: number): string | null {
  return sessions.get(leafId)?.lastCwd ?? null;
}

export function clearFocusedTerminal(): boolean {
  for (const [leafId, s] of sessions) {
    if (!s.visibleNow || !s.focusedNow) continue;
    const slot = getSlotForLeaf(leafId);
    if (!slot) continue;
    slot.term.clear();
    return true;
  }
  return false;
}

export function leafIdForPty(ptyId: number): number | null {
  for (const [leafId, s] of sessions) {
    if (s.pty?.id === ptyId) return leafId;
  }
  return null;
}

function leafBusy(s: Session): boolean {
  return s.commandRunning || (s.pty !== null && isAgentActivePty(s.pty.id));
}

const HIDDEN_RELEASE_DELAY_MS = 300;

function scheduleHiddenRelease(leafId: number, s: Session): void {
  if (s.visibleNow || !s.hasSlot) return;
  cancelHiddenRelease(s);
  s.hiddenReleaseTimer = setTimeout(() => {
    s.hiddenReleaseTimer = null;
    if (s.disposed || s.visibleNow || !s.hasSlot) return;
    if (isLeafAltScreen(leafId) || leafBusy(s)) return;
    unbindLeafFromSlot(leafId, s);
  }, HIDDEN_RELEASE_DELAY_MS);
}

function cancelHiddenRelease(s: Session): void {
  if (s.hiddenReleaseTimer !== null) {
    clearTimeout(s.hiddenReleaseTimer);
    s.hiddenReleaseTimer = null;
  }
}

async function releaseIfIdle(leafId: number, s: Session): Promise<void> {
  const busy = await leafHasForegroundJob(leafId);
  if (busy || s.disposed || s.visibleNow || !s.hasSlot) return;
  if (isLeafAltScreen(leafId) || leafBusy(s)) return;
  unbindLeafFromSlot(leafId, s);
}

async function leafHasForegroundJob(leafId: number): Promise<boolean> {
  const s = sessions.get(leafId);
  if (!s?.pty || s.shellExited) return false;
  try {
    return await invoke<boolean>("pty_has_foreground_job", { id: s.pty.id });
  } catch (e) {
    console.error("[backsteros] pty_has_foreground_job failed for leaf", leafId, e);
    return false;
  }
}

function onLeafCommandState(leafId: number, running: boolean): void {
  const s = sessions.get(leafId);
  if (!s || s.commandRunning === running) return;
  s.commandRunning = running;
  if (!running) {
    scheduleHiddenRelease(leafId, s);
    return;
  }
  cancelHiddenRelease(s);
  if (!s.visibleNow && !s.hasSlot && s.container && !s.disposed) {
    setTimeout(() => {
      if (s.disposed || s.visibleNow || s.hasSlot || !s.container) return;
      if (!leafBusy(s)) return;
      bindLeafToSlot(leafId, s);
      parkLeafSlot(leafId);
    }, 0);
  }
}

ensureAgentActivityListener((ptyId) => {
  const leafId = leafIdForPty(ptyId);
  if (leafId === null) return;
  const s = sessions.get(leafId);
  if (s) scheduleHiddenRelease(leafId, s);
});

configureRendererPool({
  resolveLeaf(leafId) {
    const s = sessions.get(leafId);
    if (!s) return null;
    return {
      writeToPty: (data) => {
        if (s.spawnFailed) {
          if (data.includes("\r")) void respawnSession(leafId);
          return;
        }
        s.pty?.write(data);
      },
      resizePty: (cols, rows) => {
        s.cols = cols;
        s.rows = rows;
        s.pty?.resize(cols, rows);
      },
      kickPty: (cols, rows) => {
        const pty = s.pty;
        if (!pty || cols <= 0 || rows <= 0) return;
        pty
          .resize(cols, rows + 1)
          .then(() => pty.resize(cols, rows))
          .catch((e) => console.warn("[backsteros] kickPty failed:", e));
      },
    };
  },
  evictLeaf(leafId) {
    const s = sessions.get(leafId);
    if (!s) return;
    unbindLeafFromSlot(leafId, s);
  },
  isLeafFocused(leafId) {
    const s = sessions.get(leafId);
    return !!s && s.visibleNow && s.focusedNow;
  },
  isLeafBlocks() {
    return false;
  },
  isLeafBusy(leafId) {
    const s = sessions.get(leafId);
    return !!s && leafBusy(s);
  },
  isLeafVisible(leafId) {
    return sessions.get(leafId)?.visibleNow ?? false;
  },
  storeSnapshot(leafId, out) {
    const s = sessions.get(leafId);
    if (!s) return;
    s.snapshot = out.snapshot;
    if (out.cols > 0) s.cols = out.cols;
    if (out.rows > 0) s.rows = out.rows;
    s.altScreenAtRelease = out.altScreen;
  },
});

function ensureSession(leafId: number, initialCwd?: string): Session {
  const existing = sessions.get(leafId);
  if (existing) return existing;

  const session: Session = {
    pty: null,
    ptyOpening: false,
    initialCwd,
    lastCwd: null,
    pendingExit: null,
    shellExited: false,
    callbacks: {},
    visibleNow: false,
    focusedNow: false,
    disposed: false,
    ready: Promise.resolve(),
    cols: 0,
    rows: 0,
    container: null,
    snapshot: null,
    searchQuery: null,
    dormantRing: new DormantRing(),
    hasSlot: false,
    altScreenAtRelease: false,
    commandRunning: false,
    hiddenReleaseTimer: null,
    spawnFailed: false,
  };
  sessions.set(leafId, session);

  session.ready = (async () => {
    await ensureMonoFontsLoaded();
    await document.fonts.ready;
  })();

  return session;
}

function deliverPtyBytes(leafId: number, bytes: Uint8Array): void {
  const s = sessions.get(leafId);
  if (!s) return;
  const slot = getLiveSlotForLeaf(leafId);
  if (slot) slot.term.write(bytes);
  else s.dormantRing.push(bytes);
}

const SPAWN_RETRY_DELAY_MS = 250;

async function openPtyWithRetry(
  leafId: number,
  s: Session,
  cwd: string | undefined,
): Promise<PtySession> {
  try {
    return await openPtyForSession(leafId, s, cwd);
  } catch (e) {
    console.error("[backsteros] openPty failed, retrying once:", e);
    await new Promise((r) => setTimeout(r, SPAWN_RETRY_DELAY_MS));
    if (s.disposed) throw e;
    return openPtyForSession(leafId, s, cwd);
  }
}

function surfaceSpawnFailure(leafId: number, s: Session, e: unknown): void {
  console.error("[backsteros] shell spawn failed:", e);
  s.shellExited = true;
  s.spawnFailed = true;
  const detail = String(e)
    .replace(/[\x00-\x1f\x7f]/g, " ")
    .slice(0, 300);
  deliverPtyBytes(
    leafId,
    new TextEncoder().encode(
      `\r\n\x1b[31m[backsteros] failed to start shell: ${detail}\x1b[0m\r\n\x1b[2mpress Enter to retry\x1b[0m\r\n`,
    ),
  );
}

async function openPtyForSession(
  leafId: number,
  s: Session,
  cwd: string | undefined,
): Promise<PtySession> {
  const startCols = s.cols > 0 ? s.cols : 80;
  const startRows = s.rows > 0 ? s.rows : 24;
  const pty = await openPty(
    startCols,
    startRows,
    {
      onData: (bytes) => deliverPtyBytes(leafId, bytes),
      onExit: (code) => {
        const exitedPtyId = s.pty?.id ?? null;
        s.shellExited = true;
        s.pty = null;
        s.commandRunning = false;
        if (exitedPtyId !== null) {
          markAgentPtyExited(exitedPtyId, "pty_exit");
        }
        const slot = getSlotForLeaf(leafId);
        if (slot) slot.term.options.disableStdin = true;
        scheduleHiddenRelease(leafId, s);
        if (s.callbacks.onExit) s.callbacks.onExit(code);
        else s.pendingExit = code;
      },
    },
    cwd,
  );
  if (
    s.cols > 0 &&
    s.rows > 0 &&
    (s.cols !== startCols || s.rows !== startRows)
  ) {
    void pty.resize(s.cols, s.rows);
  }
  return pty;
}

function bindLeafToSlot(leafId: number, s: Session): void {
  if (!s.container) return;
  const altScreen = s.altScreenAtRelease;
  s.altScreenAtRelease = false;
  acquireSlot({
    leafId,
    container: s.container,
    snapshot: s.snapshot,
    altScreen,
    drainRing: (write) => s.dormantRing.drain(write),
    shellExited: s.shellExited && !s.spawnFailed,
    searchQuery: s.searchQuery,
    cols: s.cols,
    rows: s.rows,
    registerOsc: (term) => {
      const shellState = createShellIntegrationState();
      const prompt = registerPromptTracker(term, shellState, (running) =>
        onLeafCommandState(leafId, running),
      );
      const cwd = registerCwdHandler(
        term,
        (next) => {
          markSessionReady(leafId);
          if (s.lastCwd === next) return;
          s.lastCwd = next;
          s.callbacks.onCwd?.(next);
        },
        shellState,
      );
      return [prompt.dispose, cwd];
    },
    onSearchReady: (addon) => s.callbacks.onSearchReady?.(addon),
  });
  s.snapshot = null;
  s.hasSlot = true;
  if (s.lastCwd !== null) s.callbacks.onCwd?.(s.lastCwd);
  if (s.pendingExit !== null) {
    const code = s.pendingExit;
    s.pendingExit = null;
    s.callbacks.onExit?.(code);
  }
}

function unbindLeafFromSlot(leafId: number, s: Session): void {
  if (!s.hasSlot) return;
  const out = releaseSlot(leafId);
  if (out) {
    if (out.cols > 0) s.cols = out.cols;
    if (out.rows > 0) s.rows = out.rows;
  }
  s.hasSlot = false;
}

function attachSession(
  leafId: number,
  container: HTMLDivElement,
  callbacks: Callbacks,
): void {
  const s = sessions.get(leafId);
  if (!s || s.disposed) return;
  s.callbacks = callbacks;
  s.container = container;

  if (s.visibleNow) bindLeafToSlot(leafId, s);

  if (!s.pty && !s.ptyOpening && !s.shellExited) {
    s.ptyOpening = true;
    openPtyWithRetry(leafId, s, s.initialCwd)
      .then((pty) => {
        s.ptyOpening = false;
        if (s.disposed) {
          pty.close();
          return;
        }
        s.pty = pty;
      })
      .catch((e) => {
        s.ptyOpening = false;
        if (!s.disposed) surfaceSpawnFailure(leafId, s, e);
      });
  }
}

function detachSession(leafId: number): void {
  const s = sessions.get(leafId);
  if (!s) return;
  unbindLeafFromSlot(leafId, s);
  s.callbacks = {};
  s.container = null;
}

export async function respawnSession(
  leafId: number,
  cwd?: string,
): Promise<void> {
  const s = sessions.get(leafId);
  if (!s || s.disposed) return;
  const previousPtyId = s.pty?.id ?? null;
  if (previousPtyId !== null) {
    markAgentPtyExited(previousPtyId, "pty_respawn");
  }
  s.pty?.close();
  s.pty = null;
  s.snapshot = null;
  s.dormantRing = new DormantRing();
  s.shellExited = false;
  s.pendingExit = null;
  s.altScreenAtRelease = false;
  s.commandRunning = false;
  s.spawnFailed = false;
  cancelHiddenRelease(s);

  const slot = getSlotForLeaf(leafId);
  if (slot) {
    slot.term.options.disableStdin = false;
    slot.term.clear();
    slot.term.reset();
  } else {
    discardRetainedSlot(leafId);
  }

  s.ptyOpening = true;
  let pty: PtySession;
  try {
    pty = await openPtyWithRetry(leafId, s, cwd ?? s.initialCwd);
  } catch (e) {
    s.ptyOpening = false;
    if (!s.disposed) surfaceSpawnFailure(leafId, s, e);
    return;
  }
  s.ptyOpening = false;
  if (s.disposed) {
    pty.close();
    return;
  }
  s.pty = pty;
}

export function disposeSession(leafId: number): void {
  const s = sessions.get(leafId);
  if (!s) return;
  const ptyId = s.pty?.id ?? null;
  if (ptyId !== null) {
    markAgentPtyExited(ptyId, "pty_dispose");
  }
  s.disposed = true;
  cancelHiddenRelease(s);
  disposeLeafSlot(leafId);
  s.hasSlot = false;
  s.snapshot = null;
  s.pty?.close();
  s.pty = null;
  sessions.delete(leafId);
  readyLeaves.delete(leafId);
  const waiters = readyWaiters.get(leafId);
  if (waiters) {
    readyWaiters.delete(leafId);
    for (const w of waiters) {
      clearTimeout(w.timer);
      w.resolve();
    }
  }
}

type Options = {
  leafId: number;
  container: React.RefObject<HTMLDivElement | null>;
  visible: boolean;
  focused?: boolean;
  initialCwd?: string;
  onSearchReady?: (addon: SearchAddon) => void;
  onExit?: (code: number) => void;
  onCwd?: (cwd: string) => void;
};

export function useTerminalSession({
  leafId,
  container,
  visible,
  focused = true,
  initialCwd,
  onSearchReady,
  onExit,
  onCwd,
}: Options) {
  const cbRef = useRef({ onSearchReady, onExit, onCwd });
  cbRef.current = { onSearchReady, onExit, onCwd };

  const initialCwdRef = useRef(initialCwd);
  initialCwdRef.current = initialCwd;

  useEffect(() => {
    let cancelled = false;
    const s = ensureSession(leafId, initialCwdRef.current);
    s.ready.then(() => {
      if (cancelled || s.disposed) return;
      const node = container.current;
      if (!node) return;
      attachSession(leafId, node, {
        onSearchReady: (a) => cbRef.current.onSearchReady?.(a),
        onExit: (c) => cbRef.current.onExit?.(c),
        onCwd: (c) => cbRef.current.onCwd?.(c),
      });
      if (s.visibleNow && s.focusedNow) focusSlot(leafId);
    });
    return () => {
      cancelled = true;
      detachSession(leafId);
    };
  }, [leafId, container]);

  const prefs = useTerminalPreferences();

  useEffect(() => {
    applyFontSize(Math.max(4, Math.round(prefs.terminalFontSize * prefs.zoomLevel)));
  }, [prefs.terminalFontSize, prefs.zoomLevel]);

  useEffect(() => {
    applyFontFamily(prefs.terminalFontFamily);
  }, [prefs.terminalFontFamily]);

  useEffect(() => {
    applyLetterSpacing(prefs.terminalLetterSpacing);
  }, [prefs.terminalLetterSpacing]);

  useEffect(() => {
    applyScrollback(prefs.terminalScrollback);
  }, [prefs.terminalScrollback]);

  useEffect(() => {
    applyWebglPreference(prefs.terminalWebglEnabled);
  }, [prefs.terminalWebglEnabled]);

  useEffect(() => {
    applyCursorBlink(prefs.terminalCursorBlink);
  }, [prefs.terminalCursorBlink]);

  const bgActive =
    prefs.backgroundKind === "image" && !!prefs.backgroundImageId;
  useEffect(() => {
    applyBackgroundActive(bgActive);
  }, [bgActive]);

  useEffect(() => {
    const s = sessions.get(leafId);
    if (!s) return;
    s.visibleNow = visible;
    s.focusedNow = focused;
    if (visible) {
      cancelHiddenRelease(s);
      if (s.container && !s.hasSlot) bindLeafToSlot(leafId, s);
      else if (s.hasSlot) refreshLeafSlot(leafId);
      setSlotFocused(leafId, focused);
      if (focused) focusSlot(leafId);
    } else if (s.hasSlot) {
      parkLeafSlot(leafId);
      if (!isLeafAltScreen(leafId) && !leafBusy(s)) {
        void releaseIfIdle(leafId, s);
      }
    }
  }, [leafId, visible, focused]);

  const write = useCallback(
    (data: string) => sessions.get(leafId)?.pty?.write(data),
    [leafId],
  );

  const focus = useCallback(() => focusSlot(leafId), [leafId]);

  const getBuffer = useCallback(
    (maxLines = 200): string | null => {
      const s = sessions.get(leafId);
      if (!s) return null;
      const slot = getLiveSlotForLeaf(leafId);
      if (slot) {
        const buf = slot.term.buffer.active;
        const total = buf.length;
        const lines: string[] = [];
        const start = Math.max(0, total - maxLines);
        for (let i = start; i < total; i++) {
          lines.push(buf.getLine(i)?.translateToString(true) ?? "");
        }
        while (lines.length && lines[lines.length - 1] === "") lines.pop();
        return lines.join("\n");
      }
      if (!s.snapshot) return "";
      const plain = stripAnsi(s.snapshot);
      const lines = plain.split(/\r?\n/);
      const tail = lines.slice(-maxLines);
      while (tail.length && tail[tail.length - 1] === "") tail.pop();
      return tail.join("\n");
    },
    [leafId],
  );

  const getSelection = useCallback((): string | null => {
    const slot = getSlotForLeaf(leafId);
    const sel = slot?.term.getSelection() ?? "";
    return sel.length > 0 ? sel : null;
  }, [leafId]);

  const applyTheme = useCallback(() => {
    applyPoolTheme();
  }, []);

  return useMemo(
    () => ({
      write,
      focus,
      getBuffer,
      getSelection,
      applyTheme,
    }),
    [write, focus, getBuffer, getSelection, applyTheme],
  );
}

const ANSI_RE =
  /\x1b\[[0-9;?]*[A-Za-z]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b[()][AB012]|\x1b[78=>]|\x1bc|\x1b[NOP\]X^_]/g;

function stripAnsi(s: string): string {
  return s.replace(ANSI_RE, "");
}
