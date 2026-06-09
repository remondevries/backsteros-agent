import type { SlidingHighlightRect } from "../hooks/useSlidingRowHighlight";

export function SlidingListHighlight({
  highlightRect,
  className,
  animateClassName,
  animate,
}: {
  highlightRect: SlidingHighlightRect | null;
  className: string;
  animateClassName: string;
  animate: boolean;
}) {
  if (!highlightRect) return null;

  const classes = [className, animate ? animateClassName : null].filter(Boolean).join(" ");

  return (
    <div
      className={classes}
      aria-hidden
      style={{
        transform: `translate(${highlightRect.left}px, ${highlightRect.top}px)`,
        width: `${highlightRect.width}px`,
        height: `${highlightRect.height}px`,
        borderRadius: highlightRect.borderRadius,
      }}
    />
  );
}
