import type { LinearIssueEntity, StructuredPayload } from "../types.ts";

const LINEAR_IDENTIFIER = /^[A-Z]{1,10}-\d+$/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function isUuid(value: string): boolean {
  return UUID.test(value);
}

function looksLikeLinearIdentifier(value: string): boolean {
  return LINEAR_IDENTIFIER.test(value.trim());
}

function identifierFromUrl(url: string): string | undefined {
  const match = url.match(/\/issue\/([A-Za-z]{1,10}-\d+)/i);
  return match ? match[1].toUpperCase() : undefined;
}

function teamKey(raw: Record<string, unknown>): string | undefined {
  const team = asRecord(raw.team);
  if (team && typeof team.key === "string") return team.key;

  const project = asRecord(raw.project);
  const projectTeam = project ? asRecord(project.team) : null;
  if (projectTeam && typeof projectTeam.key === "string") return projectTeam.key;

  return undefined;
}

function issueNumber(raw: Record<string, unknown>): number | undefined {
  if (typeof raw.number === "number") return raw.number;
  if (typeof raw.issueNumber === "number") return raw.issueNumber;
  return undefined;
}

function stringField(raw: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function extractLinearIdentifier(raw: Record<string, unknown>): string | undefined {
  for (const value of [
    stringField(raw, "identifier", "issueIdentifier", "issueKey", "key"),
    stringField(asRecord(raw.issue) ?? {}, "identifier", "issueIdentifier", "issueKey", "key"),
  ]) {
    if (value && looksLikeLinearIdentifier(value)) {
      return value.toUpperCase();
    }
  }

  for (const source of [raw, asRecord(raw.issue) ?? {}]) {
    const key = teamKey(source);
    const number = issueNumber(source);
    if (key && number !== undefined) {
      return `${key.toUpperCase()}-${number}`;
    }
  }

  for (const url of [stringField(raw, "url"), stringField(asRecord(raw.issue) ?? {}, "url")]) {
    if (url) {
      const fromUrl = identifierFromUrl(url);
      if (fromUrl) return fromUrl;
    }
  }

  const title = stringField(raw, "title") ?? stringField(asRecord(raw.issue) ?? {}, "title");
  if (title) {
    const match = title.match(/^([A-Za-z]{1,10}-\d+)\b/);
    if (match) return match[1].toUpperCase();
  }

  return undefined;
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
  if (!isUuid(item.id)) return item.id;
  return item.identifier ?? item.id;
}

function isLikelyLinearUser(raw: Record<string, unknown>): boolean {
  if (typeof raw.email === "string") return true;
  if (raw.guest === true || raw.guest === false) return true;
  if (raw.admin === true || raw.admin === false) return true;

  const hasName = Boolean(stringField(raw, "name") || stringField(raw, "displayName"));
  const hasTitle = Boolean(stringField(raw, "title"));
  const hasIdentifier = Boolean(extractLinearIdentifier(raw));
  const hasIssueFields =
    raw.state !== undefined ||
    raw.stateId !== undefined ||
    typeof raw.number === "number" ||
    typeof raw.priority === "number";

  if (hasName && !hasTitle && !hasIdentifier && !hasIssueFields) {
    return true;
  }

  return false;
}

function isLikelyLinearIssue(raw: Record<string, unknown>): boolean {
  const issueRecord = asRecord(raw.issue) ?? raw;
  if (isLikelyLinearUser(issueRecord)) return false;

  const typename = stringField(issueRecord, "__typename") ?? stringField(raw, "__typename");
  if (typename === "User") return false;
  if (typename === "Issue") return true;

  if (extractLinearIdentifier(raw) || extractLinearIdentifier(issueRecord)) return true;

  const url = stringField(issueRecord, "url") ?? stringField(raw, "url");
  if (url?.includes("/issue/")) return true;

  if (issueRecord.state !== undefined || issueRecord.stateId !== undefined) return true;
  if (typeof issueRecord.priority === "number") return true;
  if (typeof issueRecord.number === "number" && teamKey(issueRecord)) return true;
  if (Array.isArray(issueRecord.labels)) return true;

  const id = stringField(issueRecord, "id") ?? stringField(raw, "id");
  if (id && isUuid(id)) return false;

  return Boolean(stringField(issueRecord, "title"));
}

function resolveLinearToolName(toolName?: string, args?: unknown): string {
  const argsObj = linearArgs(args);
  return (typeof argsObj.toolName === "string" ? argsObj.toolName : toolName ?? "").toLowerCase();
}

function isNonIssueLinearTool(toolName?: string, args?: unknown): boolean {
  const innerTool = resolveLinearToolName(toolName, args);
  return /(?:^|_)(get_user|list_users|get_team|list_teams|list_projects|get_project|get_initiative|list_initiatives)(?:$|_)/.test(
    innerTool,
  );
}

function linearItemKey(item: LinearIssueEntity): string {
  return isUuid(item.id) ? item.id : (item.identifier ?? item.id);
}

function isDisplayableLinearIssue(item: LinearIssueEntity): boolean {
  return looksLikeLinearIdentifier(getLinearIssueDisplayId(item));
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

function parseState(raw: Record<string, unknown>): {
  status?: string;
  stateType?: string;
  statusColor?: string;
} {
  const state = raw.state;
  if (typeof state === "string") {
    return { status: state };
  }

  const stateRecord = asRecord(state);
  if (stateRecord) {
    return {
      status: typeof stateRecord.name === "string" ? stateRecord.name : undefined,
      stateType: typeof stateRecord.type === "string" ? stateRecord.type : undefined,
      statusColor: typeof stateRecord.color === "string" ? stateRecord.color : undefined,
    };
  }

  if (typeof raw.status === "string") {
    return {
      status: raw.status,
      stateType: typeof raw.statusType === "string" ? raw.statusType : undefined,
    };
  }

  const statusRecord = asRecord(raw.status);
  if (statusRecord) {
    return {
      status: typeof statusRecord.name === "string" ? statusRecord.name : undefined,
      stateType: typeof statusRecord.type === "string" ? statusRecord.type : undefined,
      statusColor: typeof statusRecord.color === "string" ? statusRecord.color : undefined,
    };
  }

  return {};
}

function parsePriority(raw: Record<string, unknown>): number | undefined {
  if (typeof raw.priority === "number") return raw.priority;
  const priorityRecord = asRecord(raw.priority);
  if (priorityRecord) {
    if (typeof priorityRecord.value === "number") return priorityRecord.value;
    if (typeof priorityRecord.priority === "number") return priorityRecord.priority;
  }
  return undefined;
}

function parseAssignee(raw: Record<string, unknown>): {
  assigneeName?: string;
  assigneeAvatarUrl?: string;
  assigneeId?: string;
} {
  const assigneeId = stringField(raw, "assigneeId", "assignee_id");
  const assignee = asRecord(raw.assignee);

  if (assignee) {
    return {
      assigneeId: assigneeId ?? stringField(assignee, "id"),
      assigneeName:
        stringField(assignee, "displayName", "name") ??
        stringField(asRecord(assignee.user) ?? {}, "displayName", "name"),
      assigneeAvatarUrl:
        stringField(assignee, "avatarUrl", "avatar_url") ??
        stringField(asRecord(assignee.user) ?? {}, "avatarUrl", "avatar_url"),
    };
  }

  if (typeof raw.assignee === "string" && raw.assignee.trim()) {
    return {
      assigneeId,
      assigneeName: raw.assignee.trim(),
    };
  }

  return { assigneeId };
}

function mergeAssignee(
  primary: ReturnType<typeof parseAssignee>,
  secondary: ReturnType<typeof parseAssignee>,
): ReturnType<typeof parseAssignee> {
  return {
    assigneeId: primary.assigneeId ?? secondary.assigneeId,
    assigneeName: primary.assigneeName ?? secondary.assigneeName,
    assigneeAvatarUrl: primary.assigneeAvatarUrl ?? secondary.assigneeAvatarUrl,
  };
}

function parseProject(raw: Record<string, unknown>): { projectName?: string } {
  if (typeof raw.project === "string" && raw.project.trim()) {
    return { projectName: raw.project.trim() };
  }

  const project = asRecord(raw.project);
  if (!project) return {};
  return { projectName: stringField(project, "name") };
}

function parseDueDate(raw: Record<string, unknown>): string | undefined {
  for (const key of ["dueDate", "due_date", "dueAt", "due"]) {
    const value = raw[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function mergeLinearIssue(
  existing: LinearIssueEntity,
  incoming: LinearIssueEntity,
): LinearIssueEntity {
  const identifier =
    (incoming.identifier && looksLikeLinearIdentifier(incoming.identifier)
      ? incoming.identifier.toUpperCase()
      : undefined) ??
    (existing.identifier && looksLikeLinearIdentifier(existing.identifier)
      ? existing.identifier.toUpperCase()
      : undefined);

  return {
    ...existing,
    ...incoming,
    identifier,
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

function parseIssue(raw: Record<string, unknown>): LinearIssueEntity | null {
  if (!isLikelyLinearIssue(raw)) return null;

  const issueRecord = asRecord(raw.issue) ?? raw;
  const rawId = stringField(raw, "id") ?? stringField(issueRecord, "id");
  const identifier = extractLinearIdentifier(raw);
  const id = rawId ?? identifier ?? "";
  const title =
    stringField(raw, "title") ??
    stringField(issueRecord, "title") ??
    identifier ??
    "";
  if (!id && !title) return null;

  const state = parseState(issueRecord);
  const url = stringField(raw, "url") ?? stringField(issueRecord, "url");
  const priority = parsePriority(issueRecord) ?? parsePriority(raw);
  const assignee = mergeAssignee(parseAssignee(issueRecord), parseAssignee(raw));
  const project = {
    ...parseProject(raw),
    ...parseProject(issueRecord),
  };
  const dueDate = parseDueDate(issueRecord) ?? parseDueDate(raw);

  return {
    id,
    identifier,
    title,
    status: state.status,
    stateType: state.stateType,
    statusColor: state.statusColor,
    url,
    priority,
    assigneeName: assignee.assigneeName,
    assigneeAvatarUrl: assignee.assigneeAvatarUrl,
    assigneeId: assignee.assigneeId,
    projectName: project.projectName,
    dueDate,
  };
}

function unwrapMcpPayload(result: unknown): unknown[] {
  const payloads: unknown[] = [];
  const record = asRecord(result);
  if (!record) return [result];

  if (record.status === "success" && record.value !== undefined) {
    const value = record.value;
    const valueRecord = asRecord(value);
    const content = valueRecord?.content;
    if (Array.isArray(content)) {
      for (const item of content) {
        const itemRecord = asRecord(item);
        if (typeof itemRecord?.text === "string") {
          try {
            payloads.push(JSON.parse(itemRecord.text));
          } catch {
            payloads.push(itemRecord.text);
          }
          continue;
        }

        const textBlock = asRecord(itemRecord?.text);
        const innerText = textBlock?.text;
        if (typeof innerText === "string") {
          try {
            payloads.push(JSON.parse(innerText));
          } catch {
            payloads.push(innerText);
          }
        }
      }
    }
    if (payloads.length === 0) {
      payloads.push(value);
    }
    return payloads;
  }

  return [result];
}

function linearArgs(args?: unknown): Record<string, unknown> {
  const root = args && typeof args === "object" ? (args as Record<string, unknown>) : {};
  const nested =
    root.args && typeof root.args === "object" ? (root.args as Record<string, unknown>) : {};
  return { ...nested, ...root };
}

function identifierFromArgs(args?: unknown): string | undefined {
  const argsObj = linearArgs(args);
  for (const value of [
    argsObj.issueId,
    argsObj.identifier,
    argsObj.issueIdentifier,
    argsObj.id,
  ]) {
    if (typeof value === "string" && looksLikeLinearIdentifier(value)) {
      return value.toUpperCase();
    }
  }
  return undefined;
}

export async function enrichLinearResult(
  result: unknown,
  args?: unknown,
  toolName?: string,
  options?: { includeCompleted?: boolean },
): Promise<StructuredPayload | undefined> {
  const items: LinearIssueEntity[] = [];
  const skipSingleRecordParse = isNonIssueLinearTool(toolName, args);

  const collect = (value: unknown) => {
    const record = asRecord(value);
    if (!record) return;

    if (Array.isArray(record.issues)) {
      for (const issue of record.issues) {
        const parsed = parseIssue(asRecord(issue) ?? {});
        if (parsed) items.push(parsed);
      }
    }

    if (Array.isArray(record.nodes)) {
      for (const node of record.nodes) {
        const parsed = parseIssue(asRecord(node) ?? {});
        if (parsed) items.push(parsed);
      }
    }

    const nestedIssue = asRecord(record.issue);
    if (nestedIssue) {
      const parsed = parseIssue(record);
      if (parsed) items.push(parsed);
      return;
    }

    if (!skipSingleRecordParse) {
      const single = parseIssue(record);
      if (single) items.push(single);
    }
  };

  for (const payload of unwrapMcpPayload(result)) {
    if (Array.isArray(payload)) {
      for (const entry of payload) collect(entry);
    } else {
      collect(payload);
    }
  }

  const text = typeof result === "string" ? result : JSON.stringify(result ?? "");
  if (items.length === 0) {
    const identifierMatches = text.matchAll(/\b([A-Z]{2,10}-\d+)\b/g);
    for (const match of identifierMatches) {
      items.push({ id: match[1], identifier: match[1], title: match[1] });
    }
  }

  for (const item of items) {
    if (!item.identifier) {
      item.identifier = extractLinearIdentifier({
        id: item.id,
        identifier: item.identifier,
        url: item.url,
        title: item.title,
      }) ?? (looksLikeLinearIdentifier(item.id) ? item.id.toUpperCase() : undefined);
    }
  }

  const argsIdentifier = identifierFromArgs(args);
  if (argsIdentifier) {
    for (const item of items) {
      if (!item.identifier && isUuid(item.id)) {
        item.identifier = argsIdentifier;
      }
    }
    if (items.length === 0) {
      items.push({
        id: argsIdentifier,
        identifier: argsIdentifier,
        title: argsIdentifier,
      });
    }
  }

  const unique = new Map<string, LinearIssueEntity>();
  for (const item of items) {
    const key = linearItemKey(item);
    if (!key) continue;
    const existing = unique.get(key);
    if (!existing) {
      unique.set(key, item);
      continue;
    }

    if (existing.title === existing.identifier && item.title !== item.identifier) {
      unique.set(key, mergeLinearIssue(existing, item));
      continue;
    }

    unique.set(key, mergeLinearIssue(existing, item));
  }

  const deduped = [...unique.values()].filter(isDisplayableLinearIssue);
  const issues = options?.includeCompleted ? deduped : filterOpenLinearIssues(deduped);
  if (issues.length === 0) return undefined;
  // Avatars are resolved asynchronously (see resolveLinearIssueAvatars) so a
  // GraphQL round-trip never blocks the agent event stream. A follow-up
  // entities.updated event backfills avatar URLs once they resolve.
  return { type: "linear_issues", items: issues };
}
