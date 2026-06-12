import { describe, expect, test } from "bun:test";
import { buildContentPanelBreadcrumbSegments } from "./contentPanelBreadcrumbModel";

describe("contentPanelBreadcrumbModel", () => {
  test("builds settings breadcrumbs", () => {
    expect(
      buildContentPanelBreadcrumbSegments({
        settingsOpen: true,
        activeSettingsTab: "linear",
        activeVaultNavItem: "inbox",
        activeView: "chat",
        sidebarSegments: [],
      }),
    ).toEqual([
      { id: "settings", label: "Settings" },
      { id: "settings-linear", label: "Linear" },
    ]);
  });

  test("combines vault nav, sidebar path, and active session", () => {
    const segments = buildContentPanelBreadcrumbSegments({
      settingsOpen: false,
      activeSettingsTab: "general",
      activeVaultNavItem: "inbox",
      activeView: "chat",
      activeSessionTitle: "Morning review",
      sidebarSegments: [{ id: "vault-Inbox/Reports", label: "Reports" }],
    });

    expect(segments).toEqual([
      { id: "nav-inbox", label: "Inbox" },
      { id: "vault-Inbox/Reports", label: "Reports" },
      { id: "view-chat", label: "Backster" },
      { id: "session-chat-Morning review", label: "Morning review" },
    ]);
  });

  test("builds linear workspace breadcrumbs", () => {
    expect(
      buildContentPanelBreadcrumbSegments({
        settingsOpen: false,
        activeSettingsTab: "general",
        activeVaultNavItem: "projects",
        activeView: "chat",
        sidebarSegments: [{ id: "linear-view-teams", label: "Teams" }],
      }),
    ).toEqual([
      { id: "nav-projects", label: "Linear", kind: "linear-logo" },
      { id: "linear-view-teams", label: "Teams" },
    ]);
  });

  test("includes selected linear item in breadcrumbs", () => {
    expect(
      buildContentPanelBreadcrumbSegments({
        settingsOpen: false,
        activeSettingsTab: "general",
        activeVaultNavItem: "projects",
        activeView: "chat",
        sidebarSegments: [{ id: "linear-view-teams", label: "Teams" }],
        linearSelection: { kind: "team", id: "team-1", name: "Engineering" },
      }),
    ).toEqual([
      { id: "nav-projects", label: "Linear", kind: "linear-logo" },
      { id: "linear-view-teams", label: "Teams" },
      { id: "team-team-1", label: "Engineering" },
    ]);
  });

  test("includes active vault document in breadcrumbs", () => {
    const onClear = () => {};
    expect(
      buildContentPanelBreadcrumbSegments({
        settingsOpen: false,
        activeSettingsTab: "general",
        activeVaultNavItem: "projects",
        activeView: "chat",
        sidebarSegments: [{ id: "linear-view-projects", label: "Projects" }],
        linearSelection: { kind: "project", id: "proj-1", name: "Backster OS" },
        linearWorkspaceView: "documents",
        activeVaultDocument: { path: "Organizations/team/proj/note.md", title: "Untitled note" },
        onClearActiveVaultDocument: onClear,
      }),
    ).toEqual([
      { id: "nav-projects", label: "Linear", kind: "linear-logo" },
      { id: "linear-view-projects", label: "Projects" },
      { id: "project-proj-1", label: "Backster OS", onActivate: onClear },
      { id: "linear-tab-project-documents", label: "Documents", onActivate: onClear },
      { id: "vault-doc-Organizations/team/proj/note.md", label: "Untitled note" },
    ]);
  });

  test("includes linear workspace tab in breadcrumbs except overview", () => {
    expect(
      buildContentPanelBreadcrumbSegments({
        settingsOpen: false,
        activeSettingsTab: "general",
        activeVaultNavItem: "projects",
        activeView: "chat",
        sidebarSegments: [{ id: "linear-view-projects", label: "Projects" }],
        linearSelection: { kind: "project", id: "proj-1", name: "Backster OS" },
        linearWorkspaceView: "issues",
      }),
    ).toEqual([
      { id: "nav-projects", label: "Linear", kind: "linear-logo" },
      { id: "linear-view-projects", label: "Projects" },
      { id: "project-proj-1", label: "Backster OS" },
      { id: "linear-tab-project-issues", label: "Issues" },
    ]);
  });

  test("omits overview tab from breadcrumbs", () => {
    expect(
      buildContentPanelBreadcrumbSegments({
        settingsOpen: false,
        activeSettingsTab: "general",
        activeVaultNavItem: "projects",
        activeView: "chat",
        sidebarSegments: [{ id: "linear-view-projects", label: "Projects" }],
        linearSelection: { kind: "project", id: "proj-1", name: "Backster OS" },
        linearWorkspaceView: "overview",
      }),
    ).toEqual([
      { id: "nav-projects", label: "Linear", kind: "linear-logo" },
      { id: "linear-view-projects", label: "Projects" },
      { id: "project-proj-1", label: "Backster OS" },
    ]);
  });

  test("keeps linear selection in breadcrumbs when another sidebar section is active", () => {
    expect(
      buildContentPanelBreadcrumbSegments({
        settingsOpen: false,
        activeSettingsTab: "general",
        activeVaultNavItem: "inbox",
        activeView: "chat",
        activeSessionTitle: "Morning review",
        sidebarSegments: [{ id: "vault-Inbox/Reports", label: "Reports" }],
        linearSelection: { kind: "team", id: "team-1", name: "Engineering" },
      }),
    ).toEqual([
      { id: "nav-inbox", label: "Inbox" },
      { id: "vault-Inbox/Reports", label: "Reports" },
      { id: "team-team-1", label: "Engineering" },
    ]);
  });
});
