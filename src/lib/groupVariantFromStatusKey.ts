/** Paper List Group gradient variants (T1E-0 / paper-component-registry listGroupGradient). */
export type GroupVariant =
  | "default"
  | "backlog"
  | "planned"
  | "development"
  | "inReview"
  | "onHold"
  | "completed";

/** Maps a status / state label to a List Group variant for gradient styling. */
export function groupVariantFromStatusKey(statusKey: string): GroupVariant {
  const s = statusKey.toLowerCase().trim();
  if (!s || s === "no status" || s === "unknown") return "default";

  if (
    s.includes("backlog") ||
    s === "inbox" ||
    s === "triage" ||
    s === "concept" ||
    s.includes("ready to start") ||
    s === "todo" ||
    s === "to do"
  ) {
    return "backlog";
  }
  if (s.includes("planned")) {
    return "planned";
  }
  if (s === "in progress" || s.includes("development") || s === "started") {
    return "development";
  }
  if (s.includes("review")) {
    return "inReview";
  }
  if (s.includes("completed") || s === "done" || s === "archive" || s.includes("archived")) {
    return "completed";
  }
  if (
    s.includes("hold") ||
    s.includes("paused") ||
    s.includes("cancelled") ||
    s.includes("canceled")
  ) {
    return "onHold";
  }
  return "default";
}

export function groupVariantClassName(variant: GroupVariant): string {
  return `workspace-status-group--${variant}`;
}
