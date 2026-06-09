import { describe, expect, test } from "bun:test";
import { buildRuntimeContext } from "./index.ts";
import { inferAreasFromPaths, selectObsidianAreas } from "./obsidian-areas.ts";

describe("selectObsidianAreas", () => {
  test("detects daily and project areas", () => {
    expect(selectObsidianAreas("Update today's daily note in Daily/2026-06-08.md")).toEqual([
      "daily",
    ]);
    expect(selectObsidianAreas("Open Projects/Backster status")).toEqual(["projects"]);
  });
});

describe("inferAreasFromPaths", () => {
  test("infers areas from vault paths", () => {
    expect(inferAreasFromPaths(["Daily/2026-06-08.md", "Projects/Alpha.md"])).toEqual([
      "daily",
      "projects",
    ]);
  });
});

describe("buildRuntimeContext", () => {
  test("returns no sections when no services are active", () => {
    expect(buildRuntimeContext("What is the capital of France?", {
      obsidian: false,
      linear: false,
      calendar: false,
      whoop: false,
    }, "/tmp/notes")).toEqual([]);
  });

  test("loads obsidian core only when no area hints are present", () => {
    const sections = buildRuntimeContext("Search my notes for composer UI", {
      obsidian: true,
      linear: false,
      calendar: false,
      whoop: false,
    }, "/tmp/notes", "TestVault");
    expect(sections.some((section) => section.includes("[Obsidian paths]"))).toBe(true);
    expect(sections.some((section) => section.includes("TestVault"))).toBe(true);
    expect(sections.some((section) => section.includes("[Obsidian workspace]"))).toBe(true);
    expect(sections.some((section) => section.includes("[Daily notes]"))).toBe(false);
  });

  test("trickles down daily guidance when daily area is detected", () => {
    const sections = buildRuntimeContext("Append to today's daily note", {
      obsidian: true,
      linear: false,
      calendar: false,
      whoop: false,
    }, "/tmp/notes");
    expect(sections.some((section) => section.includes("[Daily notes]"))).toBe(true);
  });

  test("loads focused linear guidance only for linear turns", () => {
    const sections = buildRuntimeContext("What's the status of BAC-123?", {
      obsidian: false,
      linear: true,
      calendar: false,
      whoop: false,
    }, "/tmp/notes");
    expect(sections.some((section) => section.includes("[Linear]"))).toBe(true);
  });

  test("loads whoop daily-note crossover only when both services are active", () => {
    const sections = buildRuntimeContext("Update today's daily note with Whoop recovery", {
      obsidian: true,
      linear: false,
      calendar: false,
      whoop: true,
    }, "/tmp/notes");
    expect(sections.some((section) => section.includes("[Whoop]"))).toBe(true);
    expect(sections.some((section) => section.includes("frontmatter sleep, recovery, and strain"))).toBe(
      true,
    );
  });
});
