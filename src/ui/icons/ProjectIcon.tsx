/** Linear / workspace project glyph — same asset as sidebar Projects navigation. */
export function ProjectIcon({
  className,
  size = 16,
  title,
}: {
  className?: string;
  size?: number;
  title?: string;
}) {
  const labelled = Boolean(title?.trim());

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={labelled ? undefined : true}
      aria-label={labelled ? title : undefined}
      role={labelled ? "img" : undefined}
    >
      {labelled ? <title>{title}</title> : null}
      <path
        d="M8.878 0.236L14.128 3.281C14.668 3.595 15 4.171 15 4.795V10.893C15 11.2 14.919 11.501 14.767 11.767C14.613 12.033 14.393 12.253 14.128 12.407L8.878 15.452C8.611 15.607 8.308 15.688 8 15.688C7.692 15.688 7.389 15.607 7.122 15.452L1.872 12.407C1.607 12.253 1.387 12.033 1.234 11.767C1.081 11.501 1 11.2 1 10.893V4.795C1 4.171 1.332 3.594 1.872 3.281L7.122 0.236C7.389 0.081 7.692 0 8 0C8.308 0 8.611 0.081 8.878 0.236ZM7.875 1.534L3.245 4.219L8 6.977L12.755 4.219L8.125 1.534C8.087 1.512 8.044 1.5 8 1.5C7.956 1.5 7.913 1.512 7.875 1.534ZM2.5 5.521V10.893C2.5 10.983 2.547 11.064 2.625 11.109L7.25 13.792V8.276L2.5 5.521ZM8.75 13.792L13.375 11.109C13.413 11.087 13.444 11.056 13.466 11.018C13.488 10.98 13.5 10.937 13.5 10.893V5.521L8.75 8.276V13.792Z"
        fill="currentColor"
      />
    </svg>
  );
}
