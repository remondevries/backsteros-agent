import { describe, expect, test } from "bun:test";
import {
  filterSlashCommands,
  formatSlashCommandTriggerHint,
  isSlashCommandPaletteOpen,
  parseSlashCommandInput,
} from "./slashCommands";

describe("slashCommands", () => {
  test("parseSlashCommandInput only matches a lone slash token", () => {
    expect(parseSlashCommandInput("/")).toEqual({ query: "" });
    expect(parseSlashCommandInput("/dc")).toEqual({ query: "dc" });
    expect(parseSlashCommandInput("/grocery")).toEqual({ query: "grocery" });
    expect(parseSlashCommandInput("/dc shipped")).toBeNull();
    expect(parseSlashCommandInput("plain text")).toBeNull();
  });

  test("filterSlashCommands matches triggers and labels", () => {
    const all = filterSlashCommands("", { now: new Date(2026, 5, 10, 10, 0, 0), context: "chat" });
    expect(all.map((command) => command.id)).toContain("daily-capture");
    expect(all.map((command) => command.id)).toContain("grocery-list");
    expect(all.map((command) => command.id)).toContain("tool-linear");
    expect(all.map((command) => command.id)).toContain("tool-calendar");
    expect(all.map((command) => command.id)).toContain("clear");

    const clearOnly = filterSlashCommands("clear", {
      now: new Date(2026, 5, 10, 10, 0, 0),
      context: "chat",
    });
    expect(clearOnly.map((command) => command.id)).toEqual(["clear"]);

    const grocery = filterSlashCommands("gr", { now: new Date(2026, 5, 10, 10, 0, 0), context: "chat" });
    expect(grocery.map((command) => command.id)).toEqual(["grocery-list"]);

    const capture = filterSlashCommands("dc", { now: new Date(2026, 5, 10, 10, 0, 0), context: "chat" });
    expect(capture.map((command) => command.id)).toEqual(["daily-capture"]);
  });

  test("filterSlashCommands limits lookup context to shared commands", () => {
    const lookupCommands = filterSlashCommands("", {
      now: new Date(2026, 5, 10, 10, 0, 0),
      context: "lookup",
    });
    expect(lookupCommands.map((command) => command.id)).toEqual(["clear"]);
  });

  test("filterSlashCommands hides good morning outside the morning window", () => {
    const morning = filterSlashCommands("", { now: new Date(2026, 5, 10, 8, 0, 0), context: "chat" });
    expect(morning.map((command) => command.id)).toContain("good-morning");

    const afternoon = filterSlashCommands("", { now: new Date(2026, 5, 10, 14, 0, 0), context: "chat" });
    expect(afternoon.map((command) => command.id)).not.toContain("good-morning");
  });

  test("isSlashCommandPaletteOpen tracks slash entry state", () => {
    expect(isSlashCommandPaletteOpen("/dc")).toBe(true);
    expect(isSlashCommandPaletteOpen("/dc shipped")).toBe(false);
    expect(isSlashCommandPaletteOpen("/dc", { enabled: false })).toBe(false);
    expect(isSlashCommandPaletteOpen("hello")).toBe(false);
  });

  test("formatSlashCommandTriggerHint lists aliases", () => {
    const grocery = filterSlashCommands("grocery", {
      now: new Date(2026, 5, 10, 10, 0, 0),
      context: "chat",
    })[0]!;
    expect(formatSlashCommandTriggerHint(grocery)).toBe("/gr · /grocery");
  });

  test("filterSlashCommands matches tool pre-select commands", () => {
    const linear = filterSlashCommands("linear", {
      now: new Date(2026, 5, 10, 10, 0, 0),
      context: "chat",
    });
    expect(linear.map((command) => command.id)).toEqual(["tool-linear"]);
    expect(linear[0]?.toolKey).toBe("linear");

    const calendar = filterSlashCommands("googlecalendar", {
      now: new Date(2026, 5, 10, 10, 0, 0),
      context: "chat",
    });
    expect(calendar.map((command) => command.id)).toEqual(["tool-calendar"]);
    expect(calendar[0]?.toolKey).toBe("calendar");
  });
});
