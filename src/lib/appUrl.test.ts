import { describe, expect, test } from "vitest";
import { buildAppUrl, parseAppUrl } from "./appUrl";

const USER = "550e8400-e29b-41d4-a716-446655440000";

describe("appUrl", () => {
  test("parses settings paths", () => {
    expect(parseAppUrl(`/${USER}/settings`)).toMatchObject({
      userId: USER,
      showSettings: true,
      settingsTab: "account",
    });

    expect(parseAppUrl(`/${USER}/settings/linear`)).toMatchObject({
      userId: USER,
      showSettings: true,
      settingsTab: "linear",
    });
  });

  test("builds bare settings path for account tab", () => {
    const path = buildAppUrl({
      linearUserId: USER,
      showSettings: true,
      activeSettingsTab: "account",
      activeVaultNavItem: "inbox",
      linearSelection: null,
      linearWorkspaceView: null,
      activeLinearIssueId: null,
      activeLinearIssueIdentifier: null,
      activeLinearIssueProjectName: null,
      activeLinearDocumentId: null,
      activeVaultDocumentPath: null,
    });

    expect(path).toBe(`/${USER}/settings`);
    expect(parseAppUrl(path)?.settingsTab).toBe("account");
  });

  test("parses primary nav paths", () => {
    expect(parseAppUrl(`/${USER}/daily`)).toMatchObject({
      userId: USER,
      navItem: "daily",
      showSettings: false,
    });
  });

  test("parses project team selection with view", () => {
    expect(parseAppUrl(`/${USER}/projects/team/team-1/documents`)).toMatchObject({
      navItem: "projects",
      linearSelection: { kind: "team", id: "team-1" },
      linearWorkspaceView: "documents",
    });
  });

  test("parses issue detail as project slug and identifier", () => {
    expect(parseAppUrl(`/${USER}/backster-os/BOS-42`)).toMatchObject({
      linearIssueIdentifier: "BOS-42",
      linearIssueProjectSlug: "backster-os",
    });
  });

  test("parses legacy project issue detail", () => {
    expect(parseAppUrl(`/${USER}/projects/project/proj-1/issues/BOS-9`)).toMatchObject({
      linearSelection: { kind: "project", id: "proj-1" },
      linearIssueIdentifier: "BOS-9",
    });
  });

  test("parses inbox document detail", () => {
    expect(parseAppUrl(`/${USER}/inbox/documents/doc-1`)).toMatchObject({
      navItem: "inbox",
      linearDocumentId: "doc-1",
    });
  });

  test("parses inbox issue by uuid", () => {
    const issueUuid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    expect(parseAppUrl(`/${USER}/inbox/${issueUuid}`)).toMatchObject({
      navItem: "inbox",
      linearIssueId: issueUuid,
      linearIssueIdentifier: null,
    });
  });

  test("parses legacy inbox issue by identifier", () => {
    expect(parseAppUrl(`/${USER}/inbox/BOS-42`)).toMatchObject({
      navItem: "inbox",
      linearIssueId: "BOS-42",
      linearIssueIdentifier: "BOS-42",
    });
  });

  test("builds inbox issue path with uuid", () => {
    const issueUuid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    const path = buildAppUrl({
      linearUserId: USER,
      showSettings: false,
      activeSettingsTab: "general",
      activeVaultNavItem: "inbox",
      linearSelection: null,
      linearWorkspaceView: null,
      activeLinearIssueId: issueUuid,
      activeLinearIssueIdentifier: "BOS-42",
      activeLinearIssueProjectName: "Backster OS",
      activeLinearDocumentId: null,
      activeVaultDocumentPath: null,
    });

    expect(path).toBe(`/${USER}/inbox/${issueUuid}`);
    expect(parseAppUrl(path)).toMatchObject({
      navItem: "inbox",
      linearIssueId: issueUuid,
    });
  });

  test("builds project issue paths with project slug and identifier", () => {
    const path = buildAppUrl({
      linearUserId: USER,
      showSettings: false,
      activeSettingsTab: "general",
      activeVaultNavItem: "projects",
      linearSelection: { kind: "project", id: "proj-1" },
      linearWorkspaceView: "issues",
      activeLinearIssueId: "issue-uuid",
      activeLinearIssueIdentifier: "BOS-42",
      activeLinearIssueProjectName: "Backster OS",
      activeLinearDocumentId: null,
      activeVaultDocumentPath: null,
    });

    expect(path).toBe(`/${USER}/backster-os/BOS-42`);
    expect(parseAppUrl(path)).toMatchObject({
      linearIssueIdentifier: "BOS-42",
      linearIssueProjectSlug: "backster-os",
    });
  });

  test("builds round-trip document paths", () => {
    const state = {
      linearUserId: USER,
      showSettings: false,
      activeSettingsTab: "general" as const,
      activeVaultNavItem: "projects" as const,
      linearSelection: { kind: "project" as const, id: "proj-1" },
      linearWorkspaceView: "documents" as const,
      activeLinearIssueId: null,
      activeLinearIssueIdentifier: null,
      activeLinearIssueProjectName: null,
      activeLinearDocumentId: "doc-2",
      activeVaultDocumentPath: null,
    };

    const path = buildAppUrl(state);
    expect(path).toBe(`/${USER}/projects/project/proj-1/documents/doc-2`);
    expect(parseAppUrl(path)).toMatchObject({
      navItem: "projects",
      linearDocumentId: "doc-2",
    });
  });
});
