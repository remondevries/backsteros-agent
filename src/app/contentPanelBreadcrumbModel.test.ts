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
      { id: "nav-projects", label: "Projects" },
      { id: "linear-view-teams", label: "Teams" },
      { id: "view-chat", label: "Backster" },
    ]);
  });
});
