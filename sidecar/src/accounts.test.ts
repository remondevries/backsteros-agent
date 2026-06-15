import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import {
  deleteUserAccount,
  getUserAccountFilePath,
  loadUserAccount,
  loadUserAccountWorkspace,
  saveUserAccountWorkspace,
  userAccountFileExists,
} from "./accounts.ts";

describe("accounts", () => {
  let dataDir: string;
  const linearUserId = "11111111-2222-4333-8444-555555555555";

  beforeEach(() => {
    dataDir = mkdtempSync(join(tmpdir(), "backster-accounts-"));
    process.env.BACKSTER_DATA_DIR = dataDir;
  });

  afterEach(() => {
    delete process.env.BACKSTER_DATA_DIR;
  });

  it("returns empty workspace when no account file exists", () => {
    expect(loadUserAccountWorkspace(linearUserId)).toEqual({
      inboxLinearTeamId: null,
      dailyLinearTeamId: null,
      workoutsLinearTeamId: null,
      lettersLinearTeamId: null,
      knowledgeBaseLinearTeamId: null,
      addressbookLinearTeamId: null,
      setupCompletedAt: null,
    });
  });

  it("saves and loads workspace by linear user id", () => {
    saveUserAccountWorkspace(linearUserId, {
      inboxLinearTeamId: "team-1",
      dailyLinearTeamId: "team-daily",
      workoutsLinearTeamId: "team-workouts",
      lettersLinearTeamId: "team-letters",
      knowledgeBaseLinearTeamId: "team-kb",
      addressbookLinearTeamId: "team-2",
      markSetupComplete: true,
    });

    const record = loadUserAccount(linearUserId);
    expect(record?.inboxLinearTeamId).toBe("team-1");
    expect(record?.dailyLinearTeamId).toBe("team-daily");
    expect(record?.workoutsLinearTeamId).toBe("team-workouts");
    expect(record?.lettersLinearTeamId).toBe("team-letters");
    expect(record?.knowledgeBaseLinearTeamId).toBe("team-kb");
    expect(record?.addressbookLinearTeamId).toBe("team-2");
    expect(record?.setupCompletedAt).toBeTruthy();

    const filePath = join(dataDir, "accounts", `${linearUserId}.json`);
    const raw = JSON.parse(readFileSync(filePath, "utf8")) as { linearUserId: string };
    expect(raw.linearUserId).toBe(linearUserId);
  });

  it("loads legacy journalLinearProjectId as dailyLinearTeamId", () => {
    const accountsDir = join(dataDir, "accounts");
    mkdirSync(accountsDir, { recursive: true });
    const filePath = join(accountsDir, `${linearUserId}.json`);
    writeFileSync(
      filePath,
      JSON.stringify({
        linearUserId,
        inboxLinearTeamId: null,
        journalLinearProjectId: "legacy-team",
        addressbookLinearTeamId: null,
        setupCompletedAt: null,
        updatedAt: "2026-01-01T00:00:00.000Z",
      }),
    );

    expect(loadUserAccountWorkspace(linearUserId).dailyLinearTeamId).toBe("legacy-team");
  });

  it("deletes the account file when present", () => {
    saveUserAccountWorkspace(linearUserId, {
      inboxLinearTeamId: "team-1",
      markSetupComplete: true,
    });
    const filePath = getUserAccountFilePath(linearUserId);
    expect(filePath).toBeTruthy();
    expect(userAccountFileExists(linearUserId)).toBe(true);

    expect(deleteUserAccount(linearUserId)).toBe(true);
    expect(userAccountFileExists(linearUserId)).toBe(false);
    expect(deleteUserAccount(linearUserId)).toBe(false);
  });
});
