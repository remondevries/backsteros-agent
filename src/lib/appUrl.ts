import type { SidebarNavItemId } from "./sidebarNavItems";
import { isSidebarNavItemId } from "./sidebarNavItems";
import {
  isLinearProjectViewId,
  isLinearTeamViewId,
  type LinearWorkspaceViewId,
} from "../app/linearProjectViews";
import { normalizeSettingsTabId, type SettingsTabId } from "../settings/settingsTabs";
import {
  canBuildIssueAppUrlPath,
  issueProjectSlug,
  looksLikeLinearIssueIdentifier,
} from "./appIssueUrl";

const USER_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

export type AppUrlLinearSelectionRef = {
  kind: "team" | "project";
  id: string;
};

export type ParsedAppUrl = {
  userId: string;
  showSettings: boolean;
  settingsTab: SettingsTabId;
  navItem: SidebarNavItemId;
  linearSelection: AppUrlLinearSelectionRef | null;
  linearWorkspaceView: LinearWorkspaceViewId | null;
  linearIssueId: string | null;
  linearIssueIdentifier: string | null;
  linearIssueProjectSlug: string | null;
  linearDocumentId: string | null;
  vaultDocumentPath: string | null;
};

export type AppUrlState = {
  linearUserId: string;
  showSettings: boolean;
  activeSettingsTab: SettingsTabId;
  activeVaultNavItem: SidebarNavItemId | null;
  linearSelection: AppUrlLinearSelectionRef | null;
  linearWorkspaceView: LinearWorkspaceViewId | null;
  activeLinearIssueId: string | null;
  activeLinearIssueIdentifier: string | null;
  activeLinearIssueProjectName: string | null;
  activeLinearDocumentId: string | null;
  activeVaultDocumentPath: string | null;
};

function emptyParsedFields(): Pick<
  ParsedAppUrl,
  | "linearSelection"
  | "linearWorkspaceView"
  | "linearIssueId"
  | "linearIssueIdentifier"
  | "linearIssueProjectSlug"
  | "linearDocumentId"
  | "vaultDocumentPath"
> {
  return {
    linearSelection: null,
    linearWorkspaceView: null,
    linearIssueId: null,
    linearIssueIdentifier: null,
    linearIssueProjectSlug: null,
    linearDocumentId: null,
    vaultDocumentPath: null,
  };
}

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function encodeSegment(segment: string): string {
  return encodeURIComponent(segment);
}

function isSafeUserId(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= 128 && USER_ID_PATTERN.test(trimmed);
}

function parseSettingsTab(segment: string | undefined): SettingsTabId {
  if (!segment) return "general";
  return normalizeSettingsTabId(segment as SettingsTabId);
}

function parseWorkspaceView(
  kind: "team" | "project",
  segment: string | undefined,
): LinearWorkspaceViewId | null {
  if (!segment) return null;
  if (kind === "team" && isLinearTeamViewId(segment)) return segment;
  if (kind === "project" && isLinearProjectViewId(segment)) return segment;
  return null;
}

/** Parse `/{userId}/...` app paths. Returns null for root or non-app paths. */
export function parseAppUrl(pathname: string): ParsedAppUrl | null {
  const segments = pathname
    .split("/")
    .filter(Boolean)
    .map(decodeSegment);

  if (segments.length === 0) return null;

  const userId = segments[0] ?? "";
  if (!isSafeUserId(userId)) return null;

  const rest = segments.slice(1);
  if (rest.length === 0) {
    return {
      userId,
      showSettings: false,
      settingsTab: "general",
      navItem: "inbox",
      ...emptyParsedFields(),
    };
  }

  if (rest[0] === "settings") {
    return {
      userId,
      showSettings: true,
      settingsTab: parseSettingsTab(rest[1]),
      navItem: "inbox",
      ...emptyParsedFields(),
    };
  }

  if (rest[0] === "projects") {
    const kind = rest[1];
    const selectionId = rest[2]?.trim();
    if ((kind === "team" || kind === "project") && selectionId) {
      const detailKind = rest[3];
      if (detailKind === "issues" && rest[4]) {
        const legacyIssueRef = rest[4].trim();
        return {
          userId,
          showSettings: false,
          settingsTab: "general",
          navItem: "projects",
          linearSelection: { kind, id: selectionId },
          linearWorkspaceView: "issues",
          linearIssueId: legacyIssueRef,
          linearIssueIdentifier: looksLikeLinearIssueIdentifier(legacyIssueRef)
            ? legacyIssueRef
            : null,
          linearIssueProjectSlug: null,
          linearDocumentId: null,
          vaultDocumentPath: null,
        };
      }
      if (detailKind === "documents" && rest[4]) {
        return {
          userId,
          showSettings: false,
          settingsTab: "general",
          navItem: "projects",
          linearSelection: { kind, id: selectionId },
          linearWorkspaceView: "documents",
          linearIssueId: null,
          linearIssueIdentifier: null,
          linearIssueProjectSlug: null,
          linearDocumentId: rest[4],
          vaultDocumentPath: null,
        };
      }

      const view = parseWorkspaceView(kind, detailKind) ?? null;
      return {
        userId,
        showSettings: false,
        settingsTab: "general",
        navItem: "projects",
        ...emptyParsedFields(),
        linearSelection: { kind, id: selectionId },
        linearWorkspaceView: view,
      };
    }

    return {
      userId,
      showSettings: false,
      settingsTab: "general",
      navItem: "projects",
      ...emptyParsedFields(),
    };
  }

  const navCandidate = rest[0] ?? "";
  if (!isSidebarNavItemId(navCandidate)) {
    if (rest.length === 2 && looksLikeLinearIssueIdentifier(rest[1] ?? "")) {
      return {
        userId,
        showSettings: false,
        settingsTab: "general",
        navItem: "inbox",
        linearSelection: null,
        linearWorkspaceView: null,
        linearIssueId: null,
        linearIssueIdentifier: rest[1] ?? null,
        linearIssueProjectSlug: rest[0] ?? null,
        linearDocumentId: null,
        vaultDocumentPath: null,
      };
    }
    return null;
  }

  const detailKind = rest[1];
  if (
    navCandidate === "inbox" &&
    rest.length === 2 &&
    detailKind &&
    detailKind !== "issues" &&
    detailKind !== "documents" &&
    detailKind !== "notes"
  ) {
    const issueRef = detailKind.trim();
    return {
      userId,
      showSettings: false,
      settingsTab: "general",
      navItem: "inbox",
      linearSelection: null,
      linearWorkspaceView: null,
      linearIssueId: issueRef,
      linearIssueIdentifier: looksLikeLinearIssueIdentifier(issueRef) ? issueRef : null,
      linearIssueProjectSlug: null,
      linearDocumentId: null,
      vaultDocumentPath: null,
    };
  }
  if (detailKind === "issues" && rest[2]) {
    const legacyIssueRef = rest[2].trim();
    return {
      userId,
      showSettings: false,
      settingsTab: "general",
      navItem: navCandidate,
      linearSelection: null,
      linearWorkspaceView: null,
      linearIssueId: legacyIssueRef,
      linearIssueIdentifier: looksLikeLinearIssueIdentifier(legacyIssueRef)
        ? legacyIssueRef
        : null,
      linearIssueProjectSlug: null,
      linearDocumentId: null,
      vaultDocumentPath: null,
    };
  }
  if (detailKind === "documents" && rest[2]) {
    return {
      userId,
      showSettings: false,
      settingsTab: "general",
      navItem: navCandidate,
      linearSelection: null,
      linearWorkspaceView: null,
      linearIssueId: null,
      linearIssueIdentifier: null,
      linearIssueProjectSlug: null,
      linearDocumentId: rest[2],
      vaultDocumentPath: null,
    };
  }
  if (detailKind === "notes" && rest[2]) {
    return {
      userId,
      showSettings: false,
      settingsTab: "general",
      navItem: navCandidate,
      linearSelection: null,
      linearWorkspaceView: null,
      linearIssueId: null,
      linearIssueIdentifier: null,
      linearIssueProjectSlug: null,
      linearDocumentId: null,
      vaultDocumentPath: rest[2],
    };
  }

  return {
    userId,
    showSettings: false,
    settingsTab: "general",
    navItem: navCandidate,
    ...emptyParsedFields(),
  };
}

/** Build a clean `/{userId}/...` pathname from app navigation state. */
export function buildAppUrl(state: AppUrlState): string {
  const parts = [`/${encodeSegment(state.linearUserId)}`];

  if (state.showSettings) {
    parts.push("settings");
    if (state.activeSettingsTab !== "general") {
      parts.push(state.activeSettingsTab);
    }
    return parts.join("/");
  }

  if (state.activeVaultNavItem === "inbox" && state.activeLinearIssueId?.trim()) {
    parts.push("inbox", encodeSegment(state.activeLinearIssueId.trim()));
    return parts.join("/");
  }

  if (
    canBuildIssueAppUrlPath(state.activeLinearIssueIdentifier) &&
    state.activeLinearIssueProjectName?.trim()
  ) {
    parts.push(
      encodeSegment(issueProjectSlug(state.activeLinearIssueProjectName)),
      encodeSegment(state.activeLinearIssueIdentifier!.trim()),
    );
    return parts.join("/");
  }

  const navItem = state.activeVaultNavItem ?? "projects";

  if (navItem === "projects" && state.linearSelection) {
    parts.push("projects");
    parts.push(state.linearSelection.kind === "team" ? "team" : "project");
    parts.push(encodeSegment(state.linearSelection.id));

    if (state.activeLinearDocumentId) {
      parts.push("documents", encodeSegment(state.activeLinearDocumentId));
      return parts.join("/");
    }
    if (state.linearWorkspaceView && state.linearWorkspaceView !== "overview") {
      parts.push(state.linearWorkspaceView);
    }
    return parts.join("/");
  }

  parts.push(navItem);

  if (state.activeLinearDocumentId) {
    parts.push("documents", encodeSegment(state.activeLinearDocumentId));
    return parts.join("/");
  }
  if (state.activeVaultDocumentPath) {
    parts.push("notes", encodeSegment(state.activeVaultDocumentPath));
  }

  return parts.join("/");
}

export function appUrlPathsEqual(left: string, right: string): boolean {
  const normalize = (path: string) => {
    if (!path.startsWith("/")) return `/${path}`;
    return path.replace(/\/+$/, "") || "/";
  };
  return normalize(left) === normalize(right);
}

export function withPreservedSearch(pathname: string): string {
  if (typeof window === "undefined") return pathname;
  const search = window.location.search;
  return search ? `${pathname}${search}` : pathname;
}
