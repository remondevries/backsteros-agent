import { useId } from "react";

export function BacksterIcon({
  className,
  size = 16,
}: {
  className?: string;
  size?: number;
}) {
  const uid = useId().replace(/:/g, "");
  const clipId = `backster-logo-clip-${uid}`;
  const paint0 = `backster-logo-paint0-${uid}`;
  const paint1 = `backster-logo-paint1-${uid}`;
  const paint2 = `backster-logo-paint2-${uid}`;
  const paint3 = `backster-logo-paint3-${uid}`;

  return (
    <svg
      className={className ?? "backster-icon"}
      width={size}
      height={size}
      viewBox="0 0 113 118"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <g clipPath={`url(#${clipId})`}>
        <rect
          x="72.8337"
          y="29.4073"
          width="65.289"
          height="65.289"
          rx="15"
          transform="rotate(45 72.8337 29.4073)"
          fill={`url(#${paint0})`}
        />
        <rect
          x="40.1663"
          y="89.0464"
          width="65.289"
          height="65.289"
          rx="15"
          transform="rotate(-135 40.1663 89.0464)"
          fill={`url(#${paint1})`}
        />
        <rect
          x="92.5219"
          y="66.4581"
          width="65.289"
          height="65.289"
          rx="15"
          transform="rotate(120 92.5219 66.4581)"
          fill={`url(#${paint2})`}
        />
        <rect
          x="26.7189"
          y="51.3057"
          width="65.289"
          height="65.289"
          rx="15"
          transform="rotate(-60 26.7189 51.3057)"
          fill={`url(#${paint3})`}
        />
        <rect
          x="45.8871"
          y="45.9196"
          width="25.578"
          height="24.4153"
          rx="12.2077"
          fill="var(--backster-logo-solid)"
        />
      </g>
      <defs>
        <linearGradient
          id={paint0}
          x1="105.478"
          y1="29.4073"
          x2="105.478"
          y2="94.6964"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="var(--backster-logo-gradient)" />
          <stop offset="1" stopColor="var(--backster-logo-gradient)" stopOpacity="0" />
        </linearGradient>
        <linearGradient
          id={paint1}
          x1="72.8108"
          y1="89.0464"
          x2="72.8108"
          y2="154.335"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="var(--backster-logo-gradient)" />
          <stop offset="1" stopColor="var(--backster-logo-gradient)" stopOpacity="0" />
        </linearGradient>
        <linearGradient
          id={paint2}
          x1="125.166"
          y1="66.4581"
          x2="125.166"
          y2="131.747"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="var(--backster-logo-gradient)" />
          <stop offset="1" stopColor="var(--backster-logo-gradient)" stopOpacity="0" />
        </linearGradient>
        <linearGradient
          id={paint3}
          x1="59.3634"
          y1="51.3057"
          x2="59.3634"
          y2="116.595"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="var(--backster-logo-gradient)" />
          <stop offset="1" stopColor="var(--backster-logo-gradient)" stopOpacity="0" />
        </linearGradient>
        <clipPath id={clipId}>
          <rect width="113" height="118" rx="22" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}
