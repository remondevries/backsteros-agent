import type { LinearDocumentContent } from "./api";
import type { ProjectDocumentEntity } from "./documentStatusGroups";

const seeds = new Map<string, LinearDocumentContent>();

export function seedLinearDocumentContentFromEntity(
  entity: ProjectDocumentEntity,
  options?: { content?: string },
): void {
  const id = entity.linearDocumentId.trim();
  if (!id) return;

  seeds.set(id, {
    id,
    title: entity.title,
    content: options?.content ?? "",
    createdAt: entity.updatedAt,
    updatedAt: entity.updatedAt,
    projectId: entity.projectId,
    projectName: entity.projectName,
    linkedIssueId: entity.linkedIssueId,
    linkedIssueIdentifier: entity.linkedIssueIdentifier,
  });
}

export function peekLinearDocumentContentSeed(documentId: string): LinearDocumentContent | null {
  const id = documentId.trim();
  if (!id) return null;
  return seeds.get(id) ?? null;
}

/** @deprecated Use peekLinearDocumentContentSeed — kept for callers that still consume. */
export function consumeLinearDocumentContentSeed(documentId: string): LinearDocumentContent | null {
  return peekLinearDocumentContentSeed(documentId);
}

export function clearLinearDocumentContentSeed(documentId: string): void {
  const id = documentId.trim();
  if (!id) return;
  seeds.delete(id);
}

export function migrateLinearDocumentContentSeed(
  draftDocumentId: string,
  entity: ProjectDocumentEntity,
  options?: { content?: string },
): void {
  const draftId = draftDocumentId.trim();
  const realId = entity.linearDocumentId.trim();
  if (!draftId || !realId || draftId === realId) return;

  const draftSeed = seeds.get(draftId);
  seeds.delete(draftId);
  seeds.set(realId, {
    id: realId,
    title: entity.title,
    content: options?.content ?? draftSeed?.content ?? "",
    createdAt: entity.updatedAt,
    updatedAt: entity.updatedAt,
    projectId: entity.projectId,
    projectName: entity.projectName,
    linkedIssueId: entity.linkedIssueId,
    linkedIssueIdentifier: entity.linkedIssueIdentifier,
    teamId: draftSeed?.teamId,
    teamName: draftSeed?.teamName,
    url: draftSeed?.url,
  });
}
