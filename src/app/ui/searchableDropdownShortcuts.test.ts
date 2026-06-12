import { describe, expect, test } from "bun:test";
import {
  searchableDropdownShortcut,
  searchableDropdownShortcutIndex,
} from "./searchableDropdownShortcuts";

describe("searchableDropdownShortcuts", () => {
  test("maps the first nine options to 1-9", () => {
    expect(searchableDropdownShortcut(0)).toBe("1");
    expect(searchableDropdownShortcut(8)).toBe("9");
  });

  test("maps the tenth option to 0", () => {
    expect(searchableDropdownShortcut(9)).toBe("0");
    expect(searchableDropdownShortcut(10)).toBeUndefined();
  });

  test("resolves keyboard digits back to option indexes", () => {
    expect(searchableDropdownShortcutIndex("1")).toBe(0);
    expect(searchableDropdownShortcutIndex("9")).toBe(8);
    expect(searchableDropdownShortcutIndex("0")).toBe(9);
    expect(searchableDropdownShortcutIndex("s")).toBeNull();
  });
});
