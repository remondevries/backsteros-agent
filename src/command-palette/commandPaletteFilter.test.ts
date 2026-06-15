import { describe, expect, test } from "bun:test";
import {
  applyAllModeInputChange,
  applyDocumentsModeInputChange,
  applyOrganizationsModeInputChange,
  applyProjectsModeInputChange,
  applyVaultFolderModeInputChange,
  createDefaultCommandPaletteFilterState,
  exitDocumentsFilterMode,
  exitOrganizationsFilterMode,
  exitProjectsFilterMode,
  exitVaultFolderFilterMode,
  type VaultFolderFilterMode,
} from "./commandPaletteFilter";

describe("commandPaletteFilter", () => {
  test("p alone stays in all mode", () => {
    const next = applyAllModeInputChange("p", createDefaultCommandPaletteFilterState());
    expect(next).toEqual({ mode: "all", searchTerm: "p" });
  });

  test("p with space activates project filter and clears search", () => {
    const next = applyAllModeInputChange("p ", createDefaultCommandPaletteFilterState());
    expect(next).toEqual({ mode: "projects", searchTerm: "" });
  });

  test("p with space and query activates project filter with remainder", () => {
    const next = applyAllModeInputChange("p backster", createDefaultCommandPaletteFilterState());
    expect(next).toEqual({ mode: "projects", searchTerm: "backster" });
  });

  test("d with space activates document filter and clears search", () => {
    const next = applyAllModeInputChange("d ", createDefaultCommandPaletteFilterState());
    expect(next).toEqual({ mode: "documents", searchTerm: "" });
  });

  test("d with space and query activates document filter with remainder", () => {
    const next = applyAllModeInputChange("d spec", createDefaultCommandPaletteFilterState());
    expect(next).toEqual({ mode: "documents", searchTerm: "spec" });
  });

  test.each([
    ["c", "contacts", "jane"],
    ["l", "letters", "tax"],
    ["m", "meetings", "standup"],
    ["i", "inbox", "todo"],
    ["f", "financials", "invoice"],
    ["k", "kb", "guide"],
  ] as const)("vault folder prefix %s activates %s filter", (prefix, mode, query) => {
    const empty = applyAllModeInputChange(`${prefix} `, createDefaultCommandPaletteFilterState());
    expect(empty).toEqual({ mode, searchTerm: "" });

    const withQuery = applyAllModeInputChange(`${prefix} ${query}`, createDefaultCommandPaletteFilterState());
    expect(withQuery).toEqual({ mode, searchTerm: query });

    const alone = applyAllModeInputChange(prefix, createDefaultCommandPaletteFilterState());
    expect(alone).toEqual({ mode: "all", searchTerm: prefix });
  });

  test("o with space activates organizations filter and clears search", () => {
    const next = applyAllModeInputChange("o ", createDefaultCommandPaletteFilterState());
    expect(next).toEqual({ mode: "organizations", searchTerm: "" });
  });

  test("pr stays in all mode for normal search", () => {
    const next = applyAllModeInputChange("pr", createDefaultCommandPaletteFilterState());
    expect(next).toEqual({ mode: "all", searchTerm: "pr" });
  });

  test("projects mode updates search term only", () => {
    const current = { mode: "projects" as const, searchTerm: "" };
    const next = applyProjectsModeInputChange("backster", current);
    expect(next).toEqual({ mode: "projects", searchTerm: "backster" });
  });

  test("documents mode updates search term only", () => {
    const current = { mode: "documents" as const, searchTerm: "" };
    const next = applyDocumentsModeInputChange("spec", current);
    expect(next).toEqual({ mode: "documents", searchTerm: "spec" });
  });

  test("organizations mode updates search term only", () => {
    const current = { mode: "organizations" as const, searchTerm: "" };
    const next = applyOrganizationsModeInputChange("eng", current);
    expect(next).toEqual({ mode: "organizations", searchTerm: "eng" });
  });

  test.each([
    "contacts",
    "letters",
    "meetings",
    "inbox",
    "financials",
    "kb",
  ] as const)("vault folder mode %s updates search term only", (mode: VaultFolderFilterMode) => {
    const current = { mode, searchTerm: "" };
    const next = applyVaultFolderModeInputChange("query", current);
    expect(next).toEqual({ mode, searchTerm: "query" });
  });

  test("exitProjectsFilterMode preserves search term", () => {
    const next = exitProjectsFilterMode({ mode: "projects", searchTerm: "backster" });
    expect(next).toEqual({ mode: "all", searchTerm: "backster" });
  });

  test("exitDocumentsFilterMode preserves search term", () => {
    const next = exitDocumentsFilterMode({ mode: "documents", searchTerm: "spec" });
    expect(next).toEqual({ mode: "all", searchTerm: "spec" });
  });

  test("exitOrganizationsFilterMode preserves search term", () => {
    const next = exitOrganizationsFilterMode({ mode: "organizations", searchTerm: "eng" });
    expect(next).toEqual({ mode: "all", searchTerm: "eng" });
  });

  test.each([
    "contacts",
    "letters",
    "meetings",
    "inbox",
    "financials",
    "kb",
  ] as const)("exitVaultFolderFilterMode preserves search term for %s", (mode: VaultFolderFilterMode) => {
    const next = exitVaultFolderFilterMode({ mode, searchTerm: "query" });
    expect(next).toEqual({ mode: "all", searchTerm: "query" });
  });
});
