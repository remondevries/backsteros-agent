export function BacksterIcon({
  className,
  size = 16,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      className={className ?? "backster-icon"}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="8" cy="1.4" r="0.8" fill="currentColor" />
      <path
        d="M8 2.2V3.4"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <rect
        x="4"
        y="3.4"
        width="8"
        height="6.8"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.1"
      />
      <circle cx="6.4" cy="6.2" r="0.75" fill="currentColor" />
      <circle cx="9.6" cy="6.2" r="0.75" fill="currentColor" />
      <path
        d="M6.2 8.1H9.8"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <rect
        x="5.2"
        y="10.8"
        width="5.6"
        height="3.6"
        rx="1.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.1"
      />
      <path
        d="M3.6 11.6H5.2M10.8 11.6H12.4"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </svg>
  );
}
