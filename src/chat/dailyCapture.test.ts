import { describe, expect, test } from "bun:test";
import {
  formatDailyCaptureLogEntry,
  isValidDailyCaptureLogTime,
  normalizeDailyCaptureLogTime,
  parseDailyCaptureLogEntry,
  parseDailyCaptureShortcut,
} from "./dailyCapture";

describe("dailyCapture", () => {
  test("parseDailyCaptureShortcut handles activate and send", () => {
    expect(parseDailyCaptureShortcut("/dc")).toEqual({ kind: "activate" });
    expect(parseDailyCaptureShortcut("/dc ")).toEqual({ kind: "activate" });
    expect(parseDailyCaptureShortcut("/dc shipped the flow")).toEqual({
      kind: "send",
      body: "shipped the flow",
    });
  });

  test("normalizeDailyCaptureLogTime accepts common formats", () => {
    expect(normalizeDailyCaptureLogTime("9:05")).toBe("09:05");
    expect(normalizeDailyCaptureLogTime("930")).toBe("09:30");
    expect(normalizeDailyCaptureLogTime("23:59")).toBe("23:59");
    expect(normalizeDailyCaptureLogTime("24:00")).toBeNull();
  });

  test("formatDailyCaptureLogEntry uses custom log time when valid", () => {
    expect(isValidDailyCaptureLogTime("09:05")).toBe(true);
    expect(formatDailyCaptureLogEntry("note", "09:05")).toBe("- 09:05 — note");
  });

  test("parseDailyCaptureLogEntry extracts time and body", () => {
    expect(parseDailyCaptureLogEntry("- 12:15 — Testing this")).toEqual({
      logTime: "12:15",
      body: "Testing this",
    });
    expect(parseDailyCaptureLogEntry("plain text")).toBeNull();
  });
});
