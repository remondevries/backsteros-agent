export function ProjectOverviewSkeleton() {
  return (
    <div className="project-overview project-overview-loading" aria-busy="true" aria-label="Loading project overview">
      <header className="project-overview-header">
        <div className="project-overview-icon project-overview-skeleton-block project-overview-skeleton-icon" />
        <div className="project-overview-skeleton-block project-overview-skeleton-title" />
        <div className="project-overview-skeleton-block project-overview-skeleton-summary" />
      </header>

      <section className="project-overview-meta" aria-hidden="true">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="project-overview-row">
            <div className="project-overview-skeleton-block project-overview-skeleton-label" />
            <div className="project-overview-values">
              <div className="project-overview-skeleton-block project-overview-skeleton-pill" />
              <div className="project-overview-skeleton-block project-overview-skeleton-pill" />
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
