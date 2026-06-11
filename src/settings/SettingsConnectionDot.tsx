export function SettingsConnectionDot({
  className,
  title = "Connected",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <span
      className={["settings-connection-dot", className].filter(Boolean).join(" ")}
      aria-label={title}
      title={title}
    />
  );
}
