import { useEffect, useRef } from "react";
import { isTauriRuntime } from "../lib/tauriRuntime";
import { disposeSession, useTerminalSession } from "../modules/terminal/lib/useTerminalSession";

/** Single embedded terminal in LinearIssueView — one stable session across remounts. */
const EMBEDDED_TERMINAL_LEAF_ID = 1;

export function XTermView({
  className,
  workingDirectory,
}: {
  className?: string;
  workingDirectory?: string | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { focus } = useTerminalSession({
    leafId: EMBEDDED_TERMINAL_LEAF_ID,
    container: containerRef,
    visible: true,
    focused: true,
    initialCwd: workingDirectory?.trim() || undefined,
  });

  useEffect(() => {
    if (!isTauriRuntime()) return;
    focus();
  }, [focus]);

  useEffect(() => {
    return () => {
      disposeSession(EMBEDDED_TERMINAL_LEAF_ID);
    };
  }, []);

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
