/** Paper List Group gradient variants (T1E-0 / paper-component-registry listGroupGradient). */
export type GroupVariant =
  | "default"
  | "triage"
  | "backlog"
  | "unstarted"
  | "planned"
  | "maintenance"
  | "development"
  | "inReview"
  | "onHold"
  | "canceled"
  | "duplicate"
  | "completed";

/** Maps a status / state label to a List Group variant for gradient styling. */
export function groupVariantFromStatusKey(statusKey: string): GroupVariant {
  const s = statusKey.toLowerCase().trim();
  if (!s || s === "no status" || s === "unknown") return "default";

  if (s === "triage") {
    return "triage";
  }
  if (s.includes("backlog") || s === "inbox" || s === "concept") {
    return "backlog";
  }
  if (s.includes("ready to start") || s === "todo" || s === "to do" || s === "unstarted") {
    return "unstarted";
  }
  if (s.includes("planned") || s.includes("plannend")) {
    return "planned";
  }
  if (s.includes("maintenance") || s.includes("maintanance")) {
    return "maintenance";
  }
  if (s === "in progress" || s.includes("development") || s === "started") {
    return "development";
  }
  if (s.includes("review")) {
    return "inReview";
  }
  if (s.includes("duplicate")) {
    return "duplicate";
  }
  if (s.includes("completed") || s === "done" || s === "archive" || s.includes("archived")) {
    return "completed";
  }
  if (s.includes("cancelled") || s.includes("canceled")) {
    return "canceled";
  }
  if (s.includes("hold") || s.includes("paused")) {
    return "onHold";
  }
  return "default";
}

export function groupVariantClassName(variant: GroupVariant): string {
  return `workspace-status-group--${variant}`;
}
