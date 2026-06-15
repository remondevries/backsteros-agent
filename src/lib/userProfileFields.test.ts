import { describe, expect, test } from "bun:test";
import {
  buildUserProfileMarkdown,
  parseUserProfileFields,
} from "./userProfileFields";

describe("userProfileFields", () => {
  test("parse and build profile markdown", () => {
    const content = buildUserProfileMarkdown({
      name: "Jane Doe",
      timezone: "America/New_York",
      city: "New York, USA",
      role: "Designer",
    });
    const parsed = parseUserProfileFields(content);
    expect(parsed).toEqual({
      name: "Jane Doe",
      timezone: "America/New_York",
      city: "New York, USA",
      role: "Designer",
    });
  });
});
