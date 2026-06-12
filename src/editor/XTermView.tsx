import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import { useEffect, useRef } from "react";
import "@xterm/xterm/css/xterm.css";

function readThemeColors() {
  const styles = getComputedStyle(document.documentElement);
  return {
    background: styles.getPropertyValue("--bg-app").trim() || "#070707",
    foreground: styles.getPropertyValue("--text-primary").trim() || "#f5f5f7",
    cursor: styles.getPropertyValue("--text-primary").trim() || "#f5f5f7",
    selectionBackground: styles.getPropertyValue("--surface-2").trim() || "#2a2b30",
  };
}

export function XTermView({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const terminal = new Terminal({
      cursorBlink: true,
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      fontSize: 12,
      lineHeight: 1.4,
      theme: readThemeColors(),
    });
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(container);
    fitAddon.fit();

    const observer = new ResizeObserver(() => {
      fitAddon.fit();
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      terminal.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={["xterm-view", className].filter(Boolean).join(" ")}
    />
  );
}
