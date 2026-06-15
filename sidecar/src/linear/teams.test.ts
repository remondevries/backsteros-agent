import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { getLinearOAuthTokenPath } from "../config.ts";
import { fetchLinearTeams, fetchLinearTeamsPage } from "./teams.ts";

const originalFetch = globalThis.fetch;

function seedLinearOAuthToken() {
  writeFileSync(
    getLinearOAuthTokenPath(),
    `${JSON.stringify({ access_token: "test-oauth-token" })}\n`,
    { mode: 0o600 },
  );
}

describe("linear teams", () => {
  let dataDir: string;
  let previousDataDir: string | undefined;

  beforeEach(() => {
    previousDataDir = process.env.BACKSTER_DATA_DIR;
    dataDir = mkdtempSync(join(tmpdir(), "backster-linear-teams-"));
    process.env.BACKSTER_DATA_DIR = dataDir;
    delete process.env.LINEAR_API_KEY;
    delete process.env.LINEAR_OAUTH_CLIENT_ID;
    delete process.env.LINEAR_OAUTH_CLIENT_SECRET;
    delete process.env.LINEAR_OAUTH_CREDENTIALS;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (previousDataDir === undefined) {
      delete process.env.BACKSTER_DATA_DIR;
    } else {
      process.env.BACKSTER_DATA_DIR = previousDataDir;
    }
    rmSync(dataDir, { recursive: true, force: true });
  });

  test("fetchLinearTeamsPage requires Linear OAuth", async () => {
    await expect(fetchLinearTeamsPage()).rejects.toThrow(
      "Linear is not connected. Connect OAuth in Settings.",
    );
  });

  test("fetchLinearTeams loads every page from Linear", async () => {
    seedLinearOAuthToken();

    globalThis.fetch = mock(async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as {
        variables: { after?: string | null; first: number };
      };

      if (!body.variables.after) {
        return new Response(
          JSON.stringify({
            data: {
              teams: {
                nodes: [
                  { id: "team-1", key: "AAA", name: "Alpha" },
                  { id: "team-2", key: "BBB", name: "Bravo" },
                ],
                pageInfo: { hasNextPage: true, endCursor: "cursor-page-2" },
              },
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      expect(body.variables.after).toBe("cursor-page-2");

      return new Response(
        JSON.stringify({
          data: {
            teams: {
              nodes: [{ id: "team-3", key: "CCC", name: "Charlie" }],
              pageInfo: { hasNextPage: false, endCursor: null },
            },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as typeof fetch;

    const teams = await fetchLinearTeams();

    expect(teams).toEqual([
      { id: "team-1", key: "AAA", name: "Alpha" },
      { id: "team-2", key: "BBB", name: "Bravo" },
      { id: "team-3", key: "CCC", name: "Charlie" },
    ]);
    expect((globalThis.fetch as ReturnType<typeof mock>).mock.calls.length).toBe(2);
  });
});
