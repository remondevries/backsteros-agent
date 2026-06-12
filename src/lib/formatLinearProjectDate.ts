function ordinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) return "th";
  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

/** Linear-style project date label, e.g. "Dec 8th, 2024". */
export function formatLinearProjectDate(value?: string | null): string | null {
  if (!value?.trim()) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value.trim();

  const day = parsed.getDate();
  const month = parsed.toLocaleDateString(undefined, { month: "short" });
  const year = parsed.getFullYear();
  return `${month} ${day}${ordinalSuffix(day)}, ${year}`;
}

export function formatLinearProjectProgress(value?: number | null): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return `${percent}%`;
}
