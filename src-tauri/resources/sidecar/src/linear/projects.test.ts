import { describe, expect, test } from "bun:test";
import { fetchLinearProjectsPage } from "./projects.ts";

describe("linear projects", () => {
  test("fetchLinearProjectsPage requires LINEAR_API_KEY", async () => {
    const previous = process.env.LINEAR_API_KEY;
    delete process.env.LINEAR_API_KEY;

    try {
      await expect(fetchLinearProjectsPage()).rejects.toThrow("LINEAR_API_KEY is not configured");
    } finally {
      if (previous) {
        process.env.LINEAR_API_KEY = previous;
      }
    }
  });
});
