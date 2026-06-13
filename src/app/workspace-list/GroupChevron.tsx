export function GroupChevron({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`workspace-status-group__chevron${expanded ? " workspace-status-group__chevron--expanded" : ""}`}
      viewBox="0 0 24 24"
      width="14"
      height="14"
      aria-hidden="true"
    >
      <path
        d="M9 6l6 6-6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
