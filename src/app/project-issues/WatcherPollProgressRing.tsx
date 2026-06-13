const RING_RADIUS = 6;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function WatcherPollProgressRing({
  pollIntervalMs,
  animationKey,
  active = true,
  autoAssignActive = false,
}: {
  pollIntervalMs: number;
  animationKey: number;
  active?: boolean;
  autoAssignActive?: boolean;
}) {
  return (
    <svg
      key={active ? animationKey : "inactive"}
      className={[
        "watcher-poll-progress-ring",
        active ? "watcher-poll-progress-ring--active" : "watcher-poll-progress-ring--inactive",
        autoAssignActive ? "watcher-poll-progress-ring--auto-assign" : null,
      ]
        .filter(Boolean)
        .join(" ")}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      width="16"
      height="16"
      aria-hidden="true"
      style={active ? { ["--watcher-poll-duration" as string]: `${pollIntervalMs}ms` } : undefined}
    >
      <circle
        className="watcher-poll-progress-ring__track"
        cx="8"
        cy="8"
        r={RING_RADIUS}
        fill="none"
      />
      {active ? (
        <circle
          className="watcher-poll-progress-ring__progress"
          cx="8"
          cy="8"
          r={RING_RADIUS}
          fill="none"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={RING_CIRCUMFERENCE}
          transform="rotate(-90 8 8)"
        />
      ) : null}
      {active && autoAssignActive ? (
        <circle className="watcher-poll-progress-ring__auto-assign-dot" cx="8" cy="8" r="2.25" />
      ) : null}
    </svg>
  );
}
