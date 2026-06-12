import type { LinearIssueEntity } from "./types";

const LINEAR_IDENTIFIER = /^[A-Z]{1,10}-\d+$/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function looksLikeLinearIdentifier(value: string): boolean {
  return LINEAR_IDENTIFIER.test(value.trim());
}

function identifierFromUrl(url: string): string | undefined {
  const match = url.match(/\/issue\/([A-Za-z]{1,10}-\d+)/i);
  return match ? match[1].toUpperCase() : undefined;
}

export function getLinearIssueDisplayId(
  item: Pick<LinearIssueEntity, "id" | "identifier" | "url">,
): string {
  if (item.identifier && looksLikeLinearIdentifier(item.identifier)) {
    return item.identifier.toUpperCase();
  }
  if (item.url) {
    const fromUrl = identifierFromUrl(item.url);
    if (fromUrl) return fromUrl;
  }
  if (looksLikeLinearIdentifier(item.id)) return item.id.toUpperCase();
  if (!UUID.test(item.id)) return item.id;
  return item.identifier ?? item.id;
}

export function linearItemKey(item: LinearIssueEntity): string {
  return UUID.test(item.id) ? item.id : (item.identifier ?? item.id);
}

export function isValidLinearIssueDisplay(
  item: Pick<LinearIssueEntity, "id" | "identifier" | "url">,
): boolean {
  return looksLikeLinearIdentifier(getLinearIssueDisplayId(item));
}

export function isValidLinearContextChip(chip: {
  id: string;
  entityType: string;
}): boolean {
  if (chip.entityType !== "linear_issue") return true;
  return looksLikeLinearIdentifier(chip.id);
}

export function isCompletedLinearIssue(item: LinearIssueEntity): boolean {
  const stateType = item.stateType?.trim().toLowerCase();
  if (stateType === "backlog" || stateType === "unstarted" || stateType === "started") {
    return false;
  }
  if (stateType === "completed" || stateType === "canceled" || stateType === "cancelled") {
    return true;
  }

  const status = item.status?.trim().toLowerCase() ?? "";
  if (!status) {
    return false;
  }

  return (
    status === "done" ||
    status === "completed" ||
    status === "complete" ||
    status === "closed" ||
    status === "cancelled" ||
    status === "canceled"
  );
}

export function filterOpenLinearIssues(items: LinearIssueEntity[]): LinearIssueEntity[] {
  if (items.length <= 1) {
    return items;
  }

  return items.filter((item) => !isCompletedLinearIssue(item));
}

export function formatLinearDueDate(value?: string): string | null {
  if (!value?.trim()) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: parsed.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function formatLinearIssueDueDate(value?: string | null): string | null {
  if (!value?.trim()) return null;

  const parsed = startOfLocalDay(new Date(`${value.trim()}T12:00:00`));
  if (Number.isNaN(parsed.getTime())) {
    return formatLinearDueDate(value);
  }

  const today = startOfLocalDay(new Date());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (parsed.getTime() === today.getTime()) return "Today";
  if (parsed.getTime() === tomorrow.getTime()) return "Tomorrow";

  return formatLinearDueDate(value);
}

export function formatLinearEstimateLabel(estimate: number | null | undefined): string | null {
  if (estimate == null || !Number.isFinite(estimate) || estimate <= 0) return null;
  const rounded = Math.round(estimate);
  return rounded === 1 ? "1 Point" : `${rounded} Points`;
}
