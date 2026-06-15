import { afterEach, describe, expect, test } from "bun:test";
import {
  registerLinearIssuePropertyShortcuts,
  resetLinearIssuePropertyShortcutsForTests,
  triggerLinearIssuePropertyShortcut,
} from "./linearIssuePropertyShortcuts";

afterEach(() => {
  resetLinearIssuePropertyShortcutsForTests();
});

describe("linearIssuePropertyShortcuts", () => {
  test("triggerLinearIssuePropertyShortcut runs the registered action", () => {
    let opened = false;
    const unregister = registerLinearIssuePropertyShortcuts({
      openStatus: () => {
        opened = true;
        return true;
      },
    });

    expect(triggerLinearIssuePropertyShortcut("s")).toBe(true);
    expect(opened).toBe(true);

    unregister();
  });

  test("triggerLinearIssuePropertyShortcut runs openOrganization", () => {
    let opened = false;
    const unregister = registerLinearIssuePropertyShortcuts({
      openOrganization: () => {
        opened = true;
        return true;
      },
    });

    expect(triggerLinearIssuePropertyShortcut("o")).toBe(true);
    expect(opened).toBe(true);

    unregister();
  });

  test("triggerLinearIssuePropertyShortcut runs openProject with shift", () => {
    let opened = false;
    const unregister = registerLinearIssuePropertyShortcuts({
      openProject: () => {
        opened = true;
        return true;
      },
    });

    expect(triggerLinearIssuePropertyShortcut("p", { shiftKey: true })).toBe(true);
    expect(opened).toBe(true);

    unregister();
  });

  test("triggerLinearIssuePropertyShortcut returns false when nothing is registered", () => {
    expect(triggerLinearIssuePropertyShortcut("p")).toBe(false);
  });
});
