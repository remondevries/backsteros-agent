import type { LinearIssueEntity } from "../chat/types";
import type { LinearIssueDetail } from "./api";
import { isDraftIssueId } from "./inboxDraftIssue";

type IssueDetailSeed = {
  detail: LinearIssueDetail;
  freshCreate: boolean;
};

const seeds = new Map<string, IssueDetailSeed>();

function entityToDetailSeed(entity: LinearIssueEntity): LinearIssueDetail {
  const id = entity.id.trim();
  const identifier = entity.identifier?.trim();
  return {
    id,
    identifier: identifier || (isDraftIssueId(id) ? "" : id),
    title: entity.title,
    description: null,
    url: entity.url?.trim() || "",
    status: entity.status?.trim() || "",
    stateId: entity.stateId ?? null,
    stateType: entity.stateType,
    statusColor: entity.statusColor,
    priority: entity.priority ?? 0,
    priorityLabel: entity.priorityLabel?.trim() || "",
    assigneeId: entity.assigneeId ?? null,
    assigneeName: entity.assigneeName ?? null,
    assigneeUsername: null,
    assigneeAvatarUrl: entity.assigneeAvatarUrl ?? null,
    dueDate: entity.dueDate ?? null,
    estimate: entity.estimate ?? null,
    branchName: null,
    teamId: null,
    teamName: null,
    projectId: entity.projectId ?? null,
    projectName: entity.projectName ?? null,
    labels: (entity.labels ?? []).map((label, index) => ({
      id: `seed-label-${index}`,
      name: label.name,
      color: label.color,
    })),
    availableLabels: [],
    workflowStates: [],
    teamMembers: [],
    teamEstimation: null,
  };
}

export function seedLinearIssueDetailFromEntity(
  entity: LinearIssueEntity,
  options?: { freshCreate?: boolean },
): void {
  const id = entity.id.trim();
  if (!id) return;

  seeds.set(id, {
    detail: entityToDetailSeed(entity),
    freshCreate: options?.freshCreate ?? false,
  });
}

export function peekLinearIssueDetailSeed(issueId: string): LinearIssueDetail | null {
  const id = issueId.trim();
  if (!id) return null;
  return seeds.get(id)?.detail ?? null;
}

export function peekLinearIssueDetailSeedMeta(
  issueId: string,
): { detail: LinearIssueDetail; freshCreate: boolean } | null {
  const id = issueId.trim();
  if (!id) return null;
  return seeds.get(id) ?? null;
}

/** @deprecated Use peekLinearIssueDetailSeed — kept for callers that still consume. */
export function consumeLinearIssueDetailSeed(issueId: string): LinearIssueDetail | null {
  return peekLinearIssueDetailSeed(issueId);
}

export function migrateLinearIssueDetailSeed(
  draftIssueId: string,
  entity: LinearIssueEntity,
  options?: { freshCreate?: boolean },
): void {
  const draftId = draftIssueId.trim();
  const realId = entity.id.trim();
  if (!draftId || !realId || draftId === realId) return;

  const draftSeed = seeds.get(draftId);
  seeds.delete(draftId);
  seeds.set(realId, {
    detail: entityToDetailSeed(entity),
    freshCreate: options?.freshCreate ?? draftSeed?.freshCreate ?? false,
  });
}

export function clearLinearIssueDetailSeed(issueId: string): void {
  const id = issueId.trim();
  if (!id) return;
  seeds.delete(id);
}
