function formatThreadTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function summarizeThreadBody(body: string): string {
  const normalized = body.replace(/\s+/g, " ").trim();
  if (!normalized) return "Empty thread";
  if (normalized.length <= 120) return normalized;
  return `${normalized.slice(0, 117)}…`;
}

export function formatLinearThreadCardTime(value: string): string {
  return formatThreadTimestamp(value);
}

export { summarizeThreadBody };
