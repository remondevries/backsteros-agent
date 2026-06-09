const RING_PATH =
  "M15 27.6C21.9587 27.6 27.6 21.9587 27.6 15C27.6 8.04122 21.9587 2.4 15 2.4C8.04122 2.4 2.4 8.04122 2.4 15C2.4 21.9587 8.04122 27.6 15 27.6ZM15 29C22.732 29 29 22.732 29 15C29 7.26801 22.732 1 15 1C7.26801 1 1 7.26801 1 15C1 22.732 7.26801 29 15 29Z";

const MARK_PATHS = [
  "M6.6 9.86667L8.98053 17.1814H10.4713L8.09198 9.86667H6.6Z",
  "M21.9081 9.8667L18.8272 19.3346L17.1916 14.3095H15.7008L18.0814 21.6267H19.5733L23.4 9.8667H21.9081Z",
  "M10.4267 21.6267L14.2546 9.8667H15.7454L11.9187 21.6267H10.4267Z",
] as const;

const SOLID_PATH =
  "M10 1C5.02944 1 1 5.02944 1 10C1 14.9706 5.02944 19 10 19C14.9706 19 19 14.9706 19 10C19 5.02944 14.9706 1 10 1ZM7.29371 14.3427L9.62632 6.28671H10.5664L8.23382 14.3427H7.29371ZM5.72028 6.53846L7.0188 11.3846H6.0979L4.79938 6.53846H5.72028ZM14.5354 6.28671L12.6396 12.834L11.7622 9.55944H10.8413L12.1399 14.4056H13.0608L15.4755 6.28671H14.5354Z";

export function WhoopIcon({
  className,
  size = 16,
  variant = "outline",
}: {
  className?: string;
  size?: number;
  variant?: "outline" | "solid";
}) {
  if (variant === "solid") {
    return (
      <svg
        className={className ?? "whoop-icon"}
        width={size}
        height={size}
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path fillRule="evenodd" clipRule="evenodd" d={SOLID_PATH} fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg
      className={className ?? "whoop-icon"}
      width={size}
      height={size}
      viewBox="0 0 30 30"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path fillRule="evenodd" clipRule="evenodd" d={RING_PATH} fill="currentColor" />
      {MARK_PATHS.map((path) => (
        <path key={path} d={path} fill="currentColor" />
      ))}
    </svg>
  );
}
