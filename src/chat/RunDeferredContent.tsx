import { useEffect, useState, type ReactNode } from "react";

export function RunDeferredContent({
  ready,
  animate = true,
  children,
}: {
  ready: boolean;
  animate?: boolean;
  children: ReactNode;
}) {
  const shouldShow = ready || !animate;
  const [revealed, setRevealed] = useState(!animate);

  useEffect(() => {
    if (!shouldShow) {
      setRevealed(false);
      return;
    }
    if (!animate) {
      setRevealed(true);
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      setRevealed(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [animate, shouldShow]);

  if (!shouldShow) {
    return null;
  }

  return (
    <div
      className={`run-deferred-content${revealed && animate ? " run-deferred-content--revealed" : ""}`}
    >
      <div className="run-deferred-content-inner">{children}</div>
    </div>
  );
}
