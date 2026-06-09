export function LinearProjectIcon({ title }: { title?: string }) {
  return (
    <svg
      className="linear-project-icon"
      viewBox="0 0 14 14"
      width="14"
      height="14"
      aria-hidden={title ? undefined : true}
      aria-label={title ? undefined : "Project"}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M6.2 1.4 1.8 3.5v7l4.4 2.1 4.4-2.1v-7L6.2 1.4Zm0 1.2 3.2 1.5-3.2 1.5-3.2-1.5 3.2-1.5ZM2.8 4.8l3.4 1.6v5.4L2.8 10.2V4.8Zm6.8 0v5.4l-3.4 1.6V6.4l3.4-1.6Z"
        fill="currentColor"
      />
    </svg>
  );
}
