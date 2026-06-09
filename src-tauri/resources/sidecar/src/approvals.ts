import { randomUUID } from "node:crypto";
import type { ApprovalRequest } from "./types.ts";

export interface PendingApproval extends ApprovalRequest {
  decision: Promise<boolean>;
}

const pending = new Map<string, PendingApproval>();

export function createApprovalRequest(input: {
  runId: string;
  summary: string;
  action: string;
  path?: string;
}): PendingApproval {
  const id = randomUUID();
  let resolveDecision: (approved: boolean) => void = () => {};

  const decision = new Promise<boolean>((resolve) => {
    resolveDecision = resolve;
  });

  const request: PendingApproval = {
    id,
    runId: input.runId,
    summary: input.summary,
    action: input.action,
    path: input.path,
    createdAt: Date.now(),
    resolve: (approved) => resolveDecision(approved),
    decision,
  };

  pending.set(id, request);
  return request;
}

export function getApproval(id: string): PendingApproval | undefined {
  return pending.get(id);
}

export function resolveApproval(id: string, approved: boolean): boolean {
  const request = pending.get(id);
  if (!request) return false;
  request.resolve(approved);
  pending.delete(id);
  return true;
}

export async function waitForApproval(
  request: PendingApproval,
  timeoutMs = 5 * 60 * 1000,
): Promise<boolean> {
  const timeout = new Promise<boolean>((resolve) => {
    setTimeout(() => {
      resolveApproval(request.id, false);
      resolve(false);
    }, timeoutMs);
  });

  return Promise.race([request.decision, timeout]);
}

export function listPendingApprovals(): ApprovalRequest[] {
  return [...pending.values()];
}
