const WORKOUT_ICON_PATH =
  "M7.194 1.22C6.361 0.6 5.212 1.386 5.498 2.382C5.788 3.392 5.618 4.479 5.031 5.354L3.857 7.105C3.298 7.938 3 8.919 3 9.922V10.027C3 12.774 5.239 15 8 15C10.761 15 13 12.774 13 10.027V7.111C13 6.267 12.011 5.807 11.36 6.346L10 7.473V5.552C9.999 4.856 9.836 4.171 9.524 3.549C9.211 2.928 8.758 2.388 8.2 1.972L7.194 1.22ZM8 14C6.75 14 5.5 13.564 5.5 11.818C5.5 10.453 6.52 9.11 7.362 8.416C7.64 8.186 8 8.403 8 8.764V10.509C8 10.592 8.021 10.674 8.06 10.747C8.1 10.82 8.157 10.882 8.226 10.927C8.296 10.973 8.375 11 8.458 11.007C8.541 11.014 8.624 11 8.7 10.967L9.8 10.487C10.13 10.343 10.504 10.585 10.483 10.945C10.411 12.205 10.028 14 8 14Z";

export function WhoopWorkoutIcon({
  className,
  size = 16,
  title,
}: {
  className?: string;
  size?: number;
  title?: string;
}) {
  return (
    <svg
      className={className ?? "whoop-workout-icon"}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={title ? undefined : true}
      aria-label={title}
      role={title ? "img" : undefined}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d={WORKOUT_ICON_PATH}
        fill="currentColor"
      />
    </svg>
  );
}
