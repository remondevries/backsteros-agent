import type { LinearProjectHealth } from "../../lib/api";
import {
  linearProjectHealthClassName,
  linearProjectHealthLabel,
} from "../../lib/linearProjectHealth";

function HealthIcon({ health }: { health: LinearProjectHealth }) {
  const color =
    health === "onTrack"
      ? "var(--linear-project-health-on-track, #39c53b)"
      : health === "atRisk"
        ? "var(--linear-project-health-at-risk, #fabd00)"
        : "var(--linear-project-health-off-track, #ff4852)";

  return (
    <svg
      className="linear-project-health__icon"
      viewBox="0 0 16 16"
      width="16"
      height="16"
      aria-hidden="true"
    >
      <path
        d="M8 16C12.418 16 16 12.418 16 8C16 3.582 12.418 0 8 0C3.582 0 0 3.582 0 8C0 12.418 3.582 16 8 16Z"
        fill={color}
        fillOpacity="0.2"
      />
      {health === "onTrack" ? (
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M12.681 5.703C12.992 5.976 13.024 6.449 12.751 6.761L9.719 10.226C9.566 10.402 9.339 10.496 9.106 10.481C8.873 10.466 8.66 10.343 8.531 10.149L6.764 7.499L4.377 10.226C4.105 10.538 3.631 10.57 3.319 10.297C3.007 10.024 2.976 9.55 3.249 9.239L6.281 5.774C6.434 5.598 6.661 5.504 6.894 5.519C7.127 5.534 7.34 5.657 7.469 5.851L9.236 8.501L11.622 5.773C11.895 5.462 12.369 5.43 12.681 5.703Z"
          fill={color}
        />
      ) : (
        <path
          d="M8 4.5V8.5M8 11.5H8.01"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

export function LinearProjectHealthLabel({ health }: { health: LinearProjectHealth }) {
  const label = linearProjectHealthLabel(health);

  return (
    <span className={`linear-project-health ${linearProjectHealthClassName(health)}`}>
      <HealthIcon health={health} />
      <span className="linear-project-health__label">{label}</span>
    </span>
  );
}
