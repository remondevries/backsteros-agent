import type {
  CalendarEventEntity,
  LinearIssueEntity,
  MarkdownFileEntity,
  StructuredPayload,
  WhoopSnapshotEntity,
} from "./types";
import { filterOpenLinearIssues, linearItemKey } from "./linearIssue";

function mergeLinearIssue(
  existing: LinearIssueEntity,
  incoming: LinearIssueEntity,
): LinearIssueEntity {
  return {
    ...existing,
    ...incoming,
    identifier: incoming.identifier ?? existing.identifier,
    title:
      incoming.title && incoming.title !== incoming.identifier
        ? incoming.title
        : existing.title,
    status: incoming.status ?? existing.status,
    stateType: incoming.stateType ?? existing.stateType,
    statusColor: incoming.statusColor ?? existing.statusColor,
    url: incoming.url ?? existing.url,
    priority: incoming.priority ?? existing.priority,
    assigneeName: incoming.assigneeName ?? existing.assigneeName,
    assigneeAvatarUrl: incoming.assigneeAvatarUrl ?? existing.assigneeAvatarUrl,
    assigneeId: incoming.assigneeId ?? existing.assigneeId,
    projectName: incoming.projectName ?? existing.projectName,
    dueDate: incoming.dueDate ?? existing.dueDate,
  };
}

function mergeLinearItems(
  existing: LinearIssueEntity[],
  incoming: LinearIssueEntity[],
): LinearIssueEntity[] {
  const merged = new Map<string, LinearIssueEntity>();

  for (const item of existing) {
    const key = linearItemKey(item);
    if (key) merged.set(key, item);
  }

  for (const item of incoming) {
    const key = linearItemKey(item);
    if (!key) continue;
    const previous = merged.get(key);
    if (!previous) {
      merged.set(key, item);
      continue;
    }

    if (previous.title === previous.identifier && item.title !== item.identifier) {
      merged.set(key, mergeLinearIssue(previous, item));
      continue;
    }

    merged.set(key, mergeLinearIssue(previous, item));
  }

  return [...merged.values()];
}

function mergeMarkdownItems(
  existing: MarkdownFileEntity[],
  incoming: MarkdownFileEntity[],
): MarkdownFileEntity[] {
  const merged = new Map<string, MarkdownFileEntity>();

  for (const item of existing) {
    merged.set(item.path, item);
  }

  for (const item of incoming) {
    merged.set(item.path, { ...merged.get(item.path), ...item });
  }

  return [...merged.values()];
}

function mergeCalendarItems(
  existing: CalendarEventEntity[],
  incoming: CalendarEventEntity[],
): CalendarEventEntity[] {
  const merged = new Map<string, CalendarEventEntity>();

  for (const item of existing) {
    merged.set(item.id, item);
  }

  for (const item of incoming) {
    merged.set(item.id, { ...merged.get(item.id), ...item });
  }

  return [...merged.values()];
}

function mergeWhoopItems(
  existing: WhoopSnapshotEntity[],
  incoming: WhoopSnapshotEntity[],
): WhoopSnapshotEntity[] {
  const merged = new Map<string, WhoopSnapshotEntity>();

  for (const item of existing) {
    merged.set(item.id, item);
  }

  for (const item of incoming) {
    const previous = merged.get(item.id);
    if (!previous) {
      merged.set(item.id, item);
      continue;
    }

    const workouts =
      item.workouts && item.workouts.length > 0
        ? item.workouts
        : previous.workouts;
    const strainTarget =
      item.strainTarget &&
      (item.strainTarget.value != null ||
        item.strainTarget.optimalLower != null ||
        item.strainTarget.optimalUpper != null)
        ? item.strainTarget
        : previous.strainTarget;
    const strainZoneDurations = item.strainZoneDurations ?? previous.strainZoneDurations;

    merged.set(item.id, {
      ...previous,
      ...item,
      strainTarget,
      strainZoneDurations,
      workouts,
      workoutsCount: Math.max(previous.workoutsCount ?? 0, item.workoutsCount ?? 0, workouts?.length ?? 0),
      steps: item.steps ?? previous.steps,
      strengthActivityTime: item.strengthActivityTime ?? previous.strengthActivityTime,
      strainCalories: item.strainCalories ?? previous.strainCalories,
      strainAvgHrBpm: item.strainAvgHrBpm ?? previous.strainAvgHrBpm,
      strainMaxHrBpm: item.strainMaxHrBpm ?? previous.strainMaxHrBpm,
    });
  }

  return [...merged.values()];
}

export function mergeStructuredPayload(
  entities: StructuredPayload[],
  payload: StructuredPayload,
): StructuredPayload[] {
  if (payload.type === "linear_issues") {
    const index = entities.findIndex((entity) => entity.type === "linear_issues");
    const items = filterOpenLinearIssues(
      mergeLinearItems(
        index >= 0 && entities[index].type === "linear_issues" ? entities[index].items : [],
        payload.items,
      ),
    );
    const card: StructuredPayload = { type: "linear_issues", items };
    if (index >= 0) {
      const next = [...entities];
      next[index] = card;
      return next;
    }
    return [...entities, card];
  }

  if (payload.type === "markdown_files") {
    const index = entities.findIndex((entity) => entity.type === "markdown_files");
    const items = mergeMarkdownItems(
      index >= 0 && entities[index].type === "markdown_files" ? entities[index].items : [],
      payload.items,
    );
    const card: StructuredPayload = { type: "markdown_files", items };
    if (index >= 0) {
      const next = [...entities];
      next[index] = card;
      return next;
    }
    return [...entities, card];
  }

  if (payload.type === "calendar_events") {
    const index = entities.findIndex((entity) => entity.type === "calendar_events");
    const items = mergeCalendarItems(
      index >= 0 && entities[index].type === "calendar_events" ? entities[index].items : [],
      payload.items,
    );
    const card: StructuredPayload = { type: "calendar_events", items };
    if (index >= 0) {
      const next = [...entities];
      next[index] = card;
      return next;
    }
    return [...entities, card];
  }

  if (payload.type === "whoop_snapshots") {
    const index = entities.findIndex((entity) => entity.type === "whoop_snapshots");
    const items = mergeWhoopItems(
      index >= 0 && entities[index].type === "whoop_snapshots" ? entities[index].items : [],
      payload.items,
    );
    const card: StructuredPayload = { type: "whoop_snapshots", items };
    if (index >= 0) {
      const next = [...entities];
      next[index] = card;
      return next;
    }
    return [...entities, card];
  }

  if (payload.type === "morning_review_meta") {
    const index = entities.findIndex((entity) => entity.type === "morning_review_meta");
    const card: StructuredPayload = { type: "morning_review_meta", meta: payload.meta };
    if (index >= 0) {
      const next = [...entities];
      next[index] = card;
      return next;
    }
    return [...entities, card];
  }

  if (payload.type === "good_night_meta") {
    const index = entities.findIndex((entity) => entity.type === "good_night_meta");
    const card: StructuredPayload = { type: "good_night_meta", meta: payload.meta };
    if (index >= 0) {
      const next = [...entities];
      next[index] = card;
      return next;
    }
    return [...entities, card];
  }

  if (payload.type === "linear_issues_moved") {
    const index = entities.findIndex((entity) => entity.type === "linear_issues_moved");
    const items = mergeLinearItems(
      index >= 0 && entities[index].type === "linear_issues_moved" ? entities[index].items : [],
      payload.items,
    );
    const card: StructuredPayload = { type: "linear_issues_moved", items };
    if (index >= 0) {
      const next = [...entities];
      next[index] = card;
      return next;
    }
    return [...entities, card];
  }

  if (payload.type === "linear_issues_completed") {
    const index = entities.findIndex((entity) => entity.type === "linear_issues_completed");
    const items = mergeLinearItems(
      index >= 0 && entities[index].type === "linear_issues_completed"
        ? entities[index].items
        : [],
      payload.items,
    );
    const card: StructuredPayload = { type: "linear_issues_completed", items };
    if (index >= 0) {
      const next = [...entities];
      next[index] = card;
      return next;
    }
    return [...entities, card];
  }

  return [...entities, payload];
}
