import { describe, expect, test } from "bun:test";
import { isUserAccountSetupComplete } from "./accountWorkspace.ts";

describe("isUserAccountSetupComplete", () => {
  test("returns true when setupCompletedAt is set", () => {
    expect(
      isUserAccountSetupComplete({
        inboxLinearTeamId: null,
        dailyLinearTeamId: null,
        workoutsLinearTeamId: null,
        lettersLinearTeamId: null,
        knowledgeBaseLinearTeamId: null,
        addressbookLinearTeamId: null,
        setupCompletedAt: "2026-06-14T00:00:00.000Z",
      }),
    ).toBe(true);
  });

  test("returns true when all workspace ids are present", () => {
    expect(
      isUserAccountSetupComplete({
        inboxLinearTeamId: "team-1",
        dailyLinearTeamId: "team-daily",
        workoutsLinearTeamId: "team-workouts",
        lettersLinearTeamId: "team-letters",
        knowledgeBaseLinearTeamId: "team-kb",
        addressbookLinearTeamId: "team-2",
        setupCompletedAt: null,
      }),
    ).toBe(true);
  });

  test("does not require workouts for non-administrators", () => {
    expect(
      isUserAccountSetupComplete(
        {
          inboxLinearTeamId: "team-1",
          dailyLinearTeamId: "team-daily",
          workoutsLinearTeamId: null,
          lettersLinearTeamId: "team-letters",
          knowledgeBaseLinearTeamId: "team-kb",
          addressbookLinearTeamId: "team-2",
          setupCompletedAt: null,
        },
        { isAdministrator: false },
      ),
    ).toBe(true);
  });

  test("returns false when setup is incomplete", () => {
    expect(
      isUserAccountSetupComplete({
        inboxLinearTeamId: "team-1",
        dailyLinearTeamId: null,
        workoutsLinearTeamId: null,
        lettersLinearTeamId: null,
        knowledgeBaseLinearTeamId: null,
        addressbookLinearTeamId: null,
        setupCompletedAt: null,
      }),
    ).toBe(false);
  });
});
