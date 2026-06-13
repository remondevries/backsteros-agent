import { describe, expect, test } from "bun:test";
import {
  performContentPanelBack,
  shouldClearVaultDocumentOnBack,
  type ContentPanelBackActions,
  type ContentPanelBackState,
} from "./contentPanelBack";
import { clearContentPanelLocalBackHandlers, registerContentPanelLocalBack } from "./contentPanelLocalBack";

function createActions(overrides: Partial<ContentPanelBackActions> = {}): ContentPanelBackActions {
  return {
    closeCommandPalette: () => {},
    clearActiveLinearIssue: () => {},
    clearActiveLinearDocument: () => {},
    clearActiveVaultDocument: () => {},
    setLinearWorkspaceView: () => {},
    setLinearSelection: () => {},
    clearKeyboardListFocus: () => false,
    ...overrides,
  };
}

function createState(overrides: Partial<ContentPanelBackState> = {}): ContentPanelBackState {
  return {
    commandPaletteOpen: false,
    activeLinearIssue: null,
    activeLinearDocument: null,
    activeVaultDocument: null,
    activeVaultNavItem: "projects",
    linearSelection: null,
    linearWorkspaceView: null,
    ...overrides,
  };
}

describe("shouldClearVaultDocumentOnBack", () => {
  test("keeps daily notes open", () => {
    expect(shouldClearVaultDocumentOnBack("daily", "Daily/2026-06-13.md")).toBe(false);
  });

  test("clears workout sessions but not the dashboard", () => {
    expect(shouldClearVaultDocumentOnBack("workouts", "Workouts/2026-02-03.csv")).toBe(true);
    expect(shouldClearVaultDocumentOnBack("workouts", "Workouts/dashboard.md")).toBe(false);
  });

  test("clears inbox documents", () => {
    expect(shouldClearVaultDocumentOnBack("inbox", "Inbox/Note.md")).toBe(true);
  });
});

describe("performContentPanelBack", () => {
  test("closes the command palette first", () => {
    let closed = false;
    const handled = performContentPanelBack(
      createState({ commandPaletteOpen: true }),
      createActions({
        closeCommandPalette: () => {
          closed = true;
        },
      }),
    );

    expect(handled).toBe(true);
    expect(closed).toBe(true);
  });

  test("runs registered local back handlers before navigation", () => {
    clearContentPanelLocalBackHandlers();
    let localHandled = false;
    registerContentPanelLocalBack(() => {
      localHandled = true;
      return true;
    });

    const handled = performContentPanelBack(
      createState({
        activeLinearIssue: {
          id: "issue-1",
          identifier: "BOS-1",
          title: "Issue",
        },
      }),
      createActions(),
    );

    expect(handled).toBe(true);
    expect(localHandled).toBe(true);
    clearContentPanelLocalBackHandlers();
  });

  test("closes a linear issue before clearing project context", () => {
    let clearedIssue = false;
    let clearedSelection = false;

    const handled = performContentPanelBack(
      createState({
        linearSelection: { kind: "project", id: "proj-1", name: "Backster OS" },
        activeLinearIssue: {
          id: "issue-1",
          identifier: "BOS-1",
          title: "Issue",
        },
      }),
      createActions({
        clearActiveLinearIssue: () => {
          clearedIssue = true;
        },
        setLinearSelection: () => {
          clearedSelection = true;
        },
      }),
    );

    expect(handled).toBe(true);
    expect(clearedIssue).toBe(true);
    expect(clearedSelection).toBe(false);
  });

  test("returns from a project tab to overview", () => {
    let nextView: string | null = "unchanged";

    const handled = performContentPanelBack(
      createState({
        linearSelection: { kind: "project", id: "proj-1", name: "Backster OS" },
        linearWorkspaceView: "issues",
      }),
      createActions({
        setLinearWorkspaceView: (view) => {
          nextView = view;
        },
      }),
    );

    expect(handled).toBe(true);
    expect(nextView).toBe("overview");
  });

  test("clears project selection from overview", () => {
    let clearedSelection = false;

    const handled = performContentPanelBack(
      createState({
        linearSelection: { kind: "project", id: "proj-1", name: "Backster OS" },
        linearWorkspaceView: "overview",
      }),
      createActions({
        setLinearSelection: () => {
          clearedSelection = true;
        },
      }),
    );

    expect(handled).toBe(true);
    expect(clearedSelection).toBe(true);
  });

  test("clears keyboard list focus as a last resort", () => {
    let clearedFocus = false;

    const handled = performContentPanelBack(
      createState(),
      createActions({
        clearKeyboardListFocus: () => {
          clearedFocus = true;
          return true;
        },
      }),
    );

    expect(handled).toBe(true);
    expect(clearedFocus).toBe(true);
  });
});
