import type { ReactNode } from "react";

export function ProjectOverviewMetaRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="project-overview-row">
      <span className="project-overview-label">{label}</span>
      <div className="project-overview-values">{children}</div>
    </div>
  );
}
