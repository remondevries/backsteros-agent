import { describe, expect, test } from "bun:test";
import {
  applyAllModeInputChange,
  applyProjectsModeInputChange,
  createDefaultCommandPaletteFilterState,
  exitProjectsFilterMode,
} from "./commandPaletteFilter";

describe("commandPaletteFilter", () => {
  test("exact p activates project filter and clears search", () => {
    const next = applyAllModeInputChange("p", createDefaultCommandPaletteFilterState());
    expect(next).toEqual({ mode: "projects", searchTerm: "" });
  });

  test("p with space activates project filter with remainder", () => {
    const next = applyAllModeInputChange("p backster", createDefaultCommandPaletteFilterState());
    expect(next).toEqual({ mode: "projects", searchTerm: "backster" });
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

  test("exitProjectsFilterMode preserves search term", () => {
    const next = exitProjectsFilterMode({ mode: "projects", searchTerm: "backster" });
    expect(next).toEqual({ mode: "all", searchTerm: "backster" });
  });
});
