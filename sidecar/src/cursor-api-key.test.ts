import { describe, expect, test } from "bun:test";
import {
  cursorApiKeyErrorStatus,
  invalidateCursorApiKeyValidityCache,
} from "./cursor-api-key.ts";

describe("cursorApiKeyErrorStatus", () => {
  test("maps invalid key messages to 401", () => {
    expect(cursorApiKeyErrorStatus("Invalid User API Key")).toBe(401);
    expect(cursorApiKeyErrorStatus("CURSOR_API_KEY is not set")).toBe(401);
    expect(cursorApiKeyErrorStatus("Unauthorized")).toBe(401);
  });

  test("maps transient failures to 503", () => {
    expect(cursorApiKeyErrorStatus("Cursor model list timed out")).toBe(503);
    expect(cursorApiKeyErrorStatus("Network error")).toBe(503);
  });
});

describe("invalidateCursorApiKeyValidityCache", () => {
  test("does not throw", () => {
    invalidateCursorApiKeyValidityCache();
    expect(true).toBe(true);
  });
});
