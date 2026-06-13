import { describe, expect, test } from "bun:test";
import { buildContentPanelBreadcrumbSegments } from "./contentPanelBreadcrumbModel";

describe("contentPanelBreadcrumbModel", () => {
  test("builds settings breadcrumbs", () => {
    expect(
      buildContentPanelBreadcrumbSegments({
        settingsOpen: true,
        activeSettingsTab: "linear",
        activeVaultNavItem: "inbox",
        sidebarSegments: [],
      }),
    ).toEqual([
      { id: "settings", label: "Settings" },
      { id: "settings-linear", label: "Linear" },
    ]);
  });

  test("combines vault nav and sidebar path", () => {
    const segments = buildContentPanelBreadcrumbSegments({
      settingsOpen: false,
      activeSettingsTab: "general",
      activeVaultNavItem: "inbox",
      sidebarSegments: [{ id: "vault-Inbox/Reports", label: "Reports" }],
    });

    expect(segments).toEqual([
      { id: "nav-inbox", label: "Inbox", navItemId: "inbox" },
      { id: "vault-Inbox/Reports", label: "Reports" },
    ]);
  });

  test("builds linear workspace breadcrumbs", () => {
    expect(
      buildContentPanelBreadcrumbSegments({
        settingsOpen: false,
        activeSettingsTab: "general",
        activeVaultNavItem: "projects",
        sidebarSegments: [{ id: "linear-view-teams", label: "Teams" }],
      }),
    ).toEqual([
      { id: "nav-projects", label: "Projects", navItemId: "projects" },
      { id: "linear-view-teams", label: "Teams" },
    ]);
  });

  test("root breadcrumb can activate the active nav item", () => {
    const onActivateNavItem = () => {};
    expect(
      buildContentPanelBreadcrumbSegments({
        settingsOpen: false,
        activeSettingsTab: "general",
        activeVaultNavItem: "projects",
        sidebarSegments: [],
        onActivateNavItem,
      }),
    ).toEqual([
      {
        id: "nav-projects",
        label: "Projects",
        navItemId: "projects",
        onActivate: expect.any(Function),
      },
    ]);
  });

  test("includes selected linear item in breadcrumbs", () => {
    expect(
      buildContentPanelBreadcrumbSegments({
        settingsOpen: false,
        activeSettingsTab: "general",
        activeVaultNavItem: "projects",
        sidebarSegments: [{ id: "linear-view-teams", label: "Teams" }],
        linearSelection: { kind: "team", id: "team-1", name: "Engineering" },
      }),
    ).toEqual([
      { id: "nav-projects", label: "Projects", navItemId: "projects" },
      { id: "linear-view-teams", label: "Teams" },
      { id: "team-team-1", label: "Engineering" },
    ]);
  });

  test("includes active linear document in breadcrumbs", () => {
    const onClear = () => {};
    expect(
      buildContentPanelBreadcrumbSegments({
        settingsOpen: false,
        activeSettingsTab: "general",
        activeVaultNavItem: "projects",
        sidebarSegments: [{ id: "linear-view-projects", label: "Projects" }],
        linearSelection: { kind: "project", id: "proj-1", name: "Backster OS" },
        linearWorkspaceView: "documents",
        activeLinearDocument: { id: "doc-1", title: "Untitled note" },
        onClearActiveLinearDocument: onClear,
      }),
    ).toEqual([
      { id: "nav-projects", label: "Projects", navItemId: "projects" },
      { id: "linear-view-projects", label: "Projects" },
      { id: "project-proj-1", label: "Backster OS", onActivate: onClear },
      { id: "linear-tab-project-documents", label: "Documents", onActivate: onClear },
      { id: "linear-doc-doc-1", label: "Untitled note" },
    ]);
  });

  test("includes linear workspace tab in breadcrumbs except overview", () => {
    expect(
      buildContentPanelBreadcrumbSegments({
        settingsOpen: false,
        activeSettingsTab: "general",
        activeVaultNavItem: "projects",
        sidebarSegments: [{ id: "linear-view-projects", label: "Projects" }],
        linearSelection: { kind: "project", id: "proj-1", name: "Backster OS" },
        linearWorkspaceView: "issues",
      }),
    ).toEqual([
      { id: "nav-projects", label: "Projects", navItemId: "projects" },
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
        sidebarSegments: [{ id: "linear-view-projects", label: "Projects" }],
        linearSelection: { kind: "project", id: "proj-1", name: "Backster OS" },
        linearWorkspaceView: "overview",
      }),
    ).toEqual([
      { id: "nav-projects", label: "Projects", navItemId: "projects" },
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
        sidebarSegments: [{ id: "vault-Inbox/Reports", label: "Reports" }],
        linearSelection: { kind: "team", id: "team-1", name: "Engineering" },
      }),
    ).toEqual([
      { id: "nav-inbox", label: "Inbox", navItemId: "inbox" },
      { id: "vault-Inbox/Reports", label: "Reports" },
      { id: "team-team-1", label: "Engineering" },
    ]);
  });

  test("includes source daily note breadcrumb when opening a linear issue from daily", () => {
    expect(
      buildContentPanelBreadcrumbSegments({
        settingsOpen: false,
        activeSettingsTab: "general",
        activeVaultNavItem: "daily",
        sidebarSegments: [],
        activeLinearIssue: {
          id: "issue-1",
          identifier: "BOS-70",
          title: "Define Linear rules for agent issue operations",
          sourceVaultDocumentPath: "Daily/2026-06-13.md",
          sourceVaultDocumentTitle: "2026-06-13",
        },
      }),
    ).toEqual([
      { id: "nav-daily", label: "Daily", navItemId: "daily" },
      { id: "vault-doc-Daily/2026-06-13.md", label: "2026-06-13" },
      { id: "linear-issue-issue-1", label: "BOS-70 Define Linear rules for agent issue operations" },
    ]);
  });
});
