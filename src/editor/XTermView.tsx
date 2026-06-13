import { useEffect, useMemo, useRef } from "react";
import { isTauriRuntime } from "../lib/tauriRuntime";
import {
  disposeSession,
  respawnSession,
  useTerminalSession,
} from "../modules/terminal/lib/useTerminalSession";
import { resolveTerminalLeafId } from "../modules/terminal/leafId";
const SESSION_DISPOSE_DELAY_MS = 60 * 60 * 1000;
const pendingSessionDisposals = new Map<number, ReturnType<typeof setTimeout>>();

export function XTermView({
  className,
  workingDirectory,
  sessionKey,
}: {
  className?: string;
  workingDirectory?: string | null;
  sessionKey?: string | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const leafId = useMemo(() => resolveTerminalLeafId(sessionKey), [sessionKey]);

  const { focus } = useTerminalSession({
    leafId,
    container: containerRef,
    visible: true,
    focused: true,
    initialCwd: workingDirectory?.trim() || undefined,
    onExit: () => {
      void respawnSession(leafId);
    },
  });

  useEffect(() => {
    if (!isTauriRuntime()) return;
    focus();
  }, [focus]);

  useEffect(() => {
    const existingDisposeTimer = pendingSessionDisposals.get(leafId);
    if (existingDisposeTimer) {
      clearTimeout(existingDisposeTimer);
      pendingSessionDisposals.delete(leafId);
    }

    return () => {
      const disposeTimer = setTimeout(() => {
        pendingSessionDisposals.delete(leafId);
        disposeSession(leafId);
      }, SESSION_DISPOSE_DELAY_MS);
      pendingSessionDisposals.set(leafId, disposeTimer);
    };
  }, [leafId]);

  if (!isTauriRuntime()) {
    return (
      <div className={["xterm-view", className].filter(Boolean).join(" ")}>
        <div className="xterm-view-fallback">
          Terminal is only available in the desktop app.
          {workingDirectory ? (
            <div className="xterm-view-fallback-path">
              Configured project location: {workingDirectory}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={["xterm-view", className].filter(Boolean).join(" ")}
    />
  );
}
