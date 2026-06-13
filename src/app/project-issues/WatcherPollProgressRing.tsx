const RING_RADIUS = 6;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function WatcherPollProgressRing({
  pollIntervalMs,
  animationKey,
}: {
  pollIntervalMs: number;
  animationKey: number;
}) {
  return (
    <svg
      key={animationKey}
      className="watcher-poll-progress-ring"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      width="16"
      height="16"
      aria-hidden="true"
      style={{ ["--watcher-poll-duration" as string]: `${pollIntervalMs}ms` }}
    >
      <circle
        className="watcher-poll-progress-ring__track"
        cx="8"
        cy="8"
        r={RING_RADIUS}
        fill="none"
      />
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
    </svg>
  );
}
