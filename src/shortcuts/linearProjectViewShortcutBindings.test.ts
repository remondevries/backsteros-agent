import { describe, expect, test } from "bun:test";
import {
  getLinearWorkspaceViewForShortcutDigit,
  linearProjectViewShortcutHint,
} from "./linearProjectViewShortcutBindings";

describe("linearProjectViewShortcutBindings", () => {
  test("maps digit keys to project views", () => {
    expect(getLinearWorkspaceViewForShortcutDigit("project", "1")).toBe("overview");
    expect(getLinearWorkspaceViewForShortcutDigit("project", "2")).toBe("issues");
    expect(getLinearWorkspaceViewForShortcutDigit("project", "3")).toBe("documents");
    expect(getLinearWorkspaceViewForShortcutDigit("project", "4")).toBe("meetings");
    expect(getLinearWorkspaceViewForShortcutDigit("project", "5")).toBe("letters");
    expect(getLinearWorkspaceViewForShortcutDigit("project", "6")).toBe("activities");
  });

  test("maps digit keys to team views", () => {
    expect(getLinearWorkspaceViewForShortcutDigit("team", "1")).toBe("overview");
    expect(getLinearWorkspaceViewForShortcutDigit("team", "2")).toBe("projects");
    expect(getLinearWorkspaceViewForShortcutDigit("team", "6")).toBe("activities");
  });

  test("ignores unsupported digits", () => {
    expect(getLinearWorkspaceViewForShortcutDigit("project", "7")).toBeNull();
    expect(getLinearWorkspaceViewForShortcutDigit("project", "a")).toBeNull();
  });

  test("returns shortcut hints by tab index", () => {
    expect(linearProjectViewShortcutHint(0)).toBe("1");
    expect(linearProjectViewShortcutHint(5)).toBe("6");
    expect(linearProjectViewShortcutHint(6)).toBeUndefined();
  });
});
