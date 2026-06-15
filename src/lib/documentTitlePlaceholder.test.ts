import { describe, expect, test } from "bun:test";
import { documentBodyPlaceholder, documentTitlePlaceholder } from "./documentTitlePlaceholder";

describe("documentTitlePlaceholder", () => {
  test("prefers explicit section flags over nav item", () => {
    expect(
      documentTitlePlaceholder({
        activeVaultNavItem: "inbox",
        lettersSection: true,
      }),
    ).toBe("Type here your letter title");
  });

  test("uses nav item label when no section flag is set", () => {
    expect(
      documentTitlePlaceholder({
        activeVaultNavItem: "knowledge-base",
      }),
    ).toBe("Type here your knowledge base title");
  });

  test("falls back for projects nav", () => {
    expect(
      documentTitlePlaceholder({
        activeVaultNavItem: "projects",
      }),
    ).toBe("Type here your document title");
  });
});

describe("documentBodyPlaceholder", () => {
  test("uses section-specific description copy", () => {
    expect(documentBodyPlaceholder({ lettersSection: true })).toBe(
      "Type here the issue description",
    );
    expect(documentBodyPlaceholder({ meetingsSection: true })).toBe(
      "Type here your meeting description",
    );
  });

  test("uses nav item label when no section flag is set", () => {
    expect(
      documentBodyPlaceholder({
        activeVaultNavItem: "knowledge-base",
      }),
    ).toBe("Type here your knowledge base description");
  });

  test("falls back for projects nav", () => {
    expect(
      documentBodyPlaceholder({
        activeVaultNavItem: "projects",
      }),
    ).toBe("Type here your description");
  });
});
