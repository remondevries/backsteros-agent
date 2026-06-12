import type { ReactNode } from "react";

export function ProjectOverviewPill({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={["project-overview-pill", className].filter(Boolean).join(" ")}>
      {children}
    </span>
  );
}

function OverviewLeadAvatar({ avatarUrl }: { avatarUrl: string | null }) {
  const url = avatarUrl?.trim();
  if (!url) {
    return <span className="project-overview-avatar" aria-hidden="true" />;
  }

  return (
    <img
      src={url}
      alt=""
      className="project-overview-avatar project-overview-avatar-image"
      aria-hidden="true"
    />
  );
}

export function ProjectOverviewLeadPill({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl: string | null;
}) {
  return (
    <ProjectOverviewPill>
      <OverviewLeadAvatar avatarUrl={avatarUrl} />
      <span>{name}</span>
    </ProjectOverviewPill>
  );
}
