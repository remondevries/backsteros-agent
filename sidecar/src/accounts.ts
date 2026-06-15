import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getDataDir } from "./config.ts";

export type UserAccountWorkspace = {
  inboxLinearTeamId: string | null;
  dailyLinearTeamId: string | null;
  workoutsLinearTeamId: string | null;
  lettersLinearTeamId: string | null;
  knowledgeBaseLinearTeamId: string | null;
  addressbookLinearTeamId: string | null;
  setupCompletedAt: string | null;
};

export type UserAccountRecord = UserAccountWorkspace & {
  linearUserId: string;
  updatedAt: string;
};

const EMPTY_WORKSPACE: UserAccountWorkspace = {
  inboxLinearTeamId: null,
  dailyLinearTeamId: null,
  workoutsLinearTeamId: null,
  lettersLinearTeamId: null,
  knowledgeBaseLinearTeamId: null,
  addressbookLinearTeamId: null,
  setupCompletedAt: null,
};

export function getAccountsDir(): string {
  const dir = join(getDataDir(), "accounts");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function accountFilePath(linearUserId: string): string | null {
  const id = linearUserId.trim();
  if (!id || id.includes("/") || id.includes("\\") || id.includes("..")) {
    return null;
  }
  return join(getAccountsDir(), `${id}.json`);
}

export function getUserAccountFilePath(linearUserId: string): string | null {
  return accountFilePath(linearUserId);
}

export function userAccountFileExists(linearUserId: string): boolean {
  const path = accountFilePath(linearUserId);
  return Boolean(path && existsSync(path));
}

export function deleteUserAccount(linearUserId: string): boolean {
  const path = accountFilePath(linearUserId);
  if (!path || !existsSync(path)) {
    return false;
  }
  unlinkSync(path);
  return true;
}

export type StoredUserAccountSummary = {
  linearUserId: string;
  filePath: string;
  workspace: UserAccountWorkspace;
  updatedAt: string | null;
};

export function listStoredUserAccounts(): StoredUserAccountSummary[] {
  const dir = getAccountsDir();
  const summaries: StoredUserAccountSummary[] = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const linearUserId = entry.name.slice(0, -".json".length).trim();
    if (!linearUserId) continue;

    const record = loadUserAccount(linearUserId);
    const filePath = getUserAccountFilePath(linearUserId);
    if (!filePath) continue;

    summaries.push({
      linearUserId,
      filePath,
      workspace: record
        ? {
            inboxLinearTeamId: record.inboxLinearTeamId,
            dailyLinearTeamId: record.dailyLinearTeamId,
            workoutsLinearTeamId: record.workoutsLinearTeamId,
            lettersLinearTeamId: record.lettersLinearTeamId,
            knowledgeBaseLinearTeamId: record.knowledgeBaseLinearTeamId,
            addressbookLinearTeamId: record.addressbookLinearTeamId,
            setupCompletedAt: record.setupCompletedAt,
          }
        : { ...EMPTY_WORKSPACE },
      updatedAt: record?.updatedAt ?? null,
    });
  }

  return summaries.sort((left, right) => {
    const leftTime = left.updatedAt ? Date.parse(left.updatedAt) : 0;
    const rightTime = right.updatedAt ? Date.parse(right.updatedAt) : 0;
    return rightTime - leftTime;
  });
}

function normalizeNullableId(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed || null;
}

export function loadUserAccount(linearUserId: string): UserAccountRecord | null {
  const path = accountFilePath(linearUserId);
  if (!path || !existsSync(path)) return null;

  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as Partial<UserAccountRecord>;
    const id = parsed.linearUserId?.trim() || linearUserId.trim();
    return {
      linearUserId: id,
      inboxLinearTeamId: normalizeNullableId(parsed.inboxLinearTeamId),
      dailyLinearTeamId:
        normalizeNullableId(parsed.dailyLinearTeamId) ??
        normalizeNullableId((parsed as { journalLinearProjectId?: string | null }).journalLinearProjectId),
      workoutsLinearTeamId: normalizeNullableId(parsed.workoutsLinearTeamId),
      lettersLinearTeamId: normalizeNullableId(parsed.lettersLinearTeamId),
      knowledgeBaseLinearTeamId: normalizeNullableId(parsed.knowledgeBaseLinearTeamId),
      addressbookLinearTeamId: normalizeNullableId(parsed.addressbookLinearTeamId),
      setupCompletedAt: normalizeNullableId(parsed.setupCompletedAt),
      updatedAt: parsed.updatedAt?.trim() || new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
}

export function loadUserAccountWorkspace(linearUserId: string): UserAccountWorkspace {
  const record = loadUserAccount(linearUserId);
  if (!record) return { ...EMPTY_WORKSPACE };
  return {
    inboxLinearTeamId: record.inboxLinearTeamId,
    dailyLinearTeamId: record.dailyLinearTeamId,
    workoutsLinearTeamId: record.workoutsLinearTeamId,
    lettersLinearTeamId: record.lettersLinearTeamId,
    knowledgeBaseLinearTeamId: record.knowledgeBaseLinearTeamId,
    addressbookLinearTeamId: record.addressbookLinearTeamId,
    setupCompletedAt: record.setupCompletedAt,
  };
}

export function saveUserAccountWorkspace(
  linearUserId: string,
  updates: {
    inboxLinearTeamId?: string | null;
    dailyLinearTeamId?: string | null;
    workoutsLinearTeamId?: string | null;
    lettersLinearTeamId?: string | null;
    knowledgeBaseLinearTeamId?: string | null;
    addressbookLinearTeamId?: string | null;
    setupCompletedAt?: string | null;
    markSetupComplete?: boolean;
  },
): UserAccountRecord {
  const id = linearUserId.trim();
  const path = accountFilePath(id);
  if (!path) {
    throw new Error("Invalid Linear user id");
  }

  const existing = loadUserAccount(id);
  const next: UserAccountRecord = {
    linearUserId: id,
    inboxLinearTeamId:
      updates.inboxLinearTeamId !== undefined
        ? normalizeNullableId(updates.inboxLinearTeamId)
        : existing?.inboxLinearTeamId ?? null,
    dailyLinearTeamId:
      updates.dailyLinearTeamId !== undefined
        ? normalizeNullableId(updates.dailyLinearTeamId)
        : existing?.dailyLinearTeamId ?? null,
    workoutsLinearTeamId:
      updates.workoutsLinearTeamId !== undefined
        ? normalizeNullableId(updates.workoutsLinearTeamId)
        : existing?.workoutsLinearTeamId ?? null,
    lettersLinearTeamId:
      updates.lettersLinearTeamId !== undefined
        ? normalizeNullableId(updates.lettersLinearTeamId)
        : existing?.lettersLinearTeamId ?? null,
    knowledgeBaseLinearTeamId:
      updates.knowledgeBaseLinearTeamId !== undefined
        ? normalizeNullableId(updates.knowledgeBaseLinearTeamId)
        : existing?.knowledgeBaseLinearTeamId ?? null,
    addressbookLinearTeamId:
      updates.addressbookLinearTeamId !== undefined
        ? normalizeNullableId(updates.addressbookLinearTeamId)
        : existing?.addressbookLinearTeamId ?? null,
    setupCompletedAt:
      updates.setupCompletedAt !== undefined
        ? normalizeNullableId(updates.setupCompletedAt)
        : updates.markSetupComplete
          ? new Date().toISOString()
          : existing?.setupCompletedAt ?? null,
    updatedAt: new Date().toISOString(),
  };

  writeFileSync(path, JSON.stringify(next, null, 2));
  return next;
}
