export function formatMessageTimestamp(timestamp: number, now = Date.now()): string {
  const date = new Date(timestamp);
  const today = new Date(now);
  const sameDay = date.toDateString() === today.toDateString();
  const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  if (sameDay) {
    return time;
  }

  return `${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}, ${time}`;
}
