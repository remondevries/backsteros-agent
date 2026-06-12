const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function ordinal(day: number): string {
  const suffix = day % 100;
  if (suffix >= 11 && suffix <= 13) return `${day}th`;
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

export function formatOverviewStartMonth(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const match = String(dateStr).match(/^(\d{4})-(\d{2})/);
  if (!match) return "—";
  const month = Number.parseInt(match[2]!, 10);
  if (month < 1 || month > 12) return "—";
  return MONTH_NAMES[month - 1]!;
}

export function formatOverviewTargetDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const match = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return "—";
  const month = Number.parseInt(match[2]!, 10);
  const day = Number.parseInt(match[3]!, 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return "—";
  return `${MONTH_NAMES[month - 1]!} ${ordinal(day)}`;
}
