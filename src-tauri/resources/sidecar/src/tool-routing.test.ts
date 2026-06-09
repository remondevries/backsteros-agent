import { describe, expect, test } from "bun:test";
import { resolveToolSelection, selectTools } from "./tool-routing.ts";

describe("resolveToolSelection", () => {
  test("uses routing when pins are empty", () => {
    expect(resolveToolSelection("Search my notes", {})).toEqual({
      obsidian: true,
      linear: false,
      calendar: false,
      whoop: false,
    });
  });

  test("forces a service on when pinned", () => {
    expect(
      resolveToolSelection("hello", {
        calendar: "on",
      }),
    ).toEqual({
      obsidian: false,
      linear: false,
      calendar: true,
      whoop: false,
    });
  });

  test("forces a service off when pinned", () => {
    expect(
      resolveToolSelection("Search my notes", {
        obsidian: "off",
      }),
    ).toEqual({
      obsidian: false,
      linear: false,
      calendar: false,
      whoop: false,
    });
  });

  test("matches capture and agenda keywords", () => {
    expect(selectTools("capture this idea").obsidian).toBe(true);
    expect(selectTools("what's on my agenda").calendar).toBe(true);
  });
});
