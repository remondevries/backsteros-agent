import type { ReactNode } from "react";

export function ShimmerText({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={className ? `text-shimmer ${className}` : "text-shimmer"}>
      <span className="text-shimmer-base">{children}</span>
      <span className="text-shimmer-glow" aria-hidden="true">
        {children}
      </span>
    </span>
  );
}
