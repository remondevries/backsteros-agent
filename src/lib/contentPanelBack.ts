import type { SidebarNavItemId } from "./sidebarNavItems";
import type {
  ActiveLinearDocument,
  ActiveLinearIssue,
  ActiveVaultDocument,
} from "../app/contentPanelNavigation";
import type { LinearWorkspaceSelection } from "../app/linearWorkspaceSelection";
import type { LinearWorkspaceViewId } from "../app/linearProjectViews";
import { isWorkoutSessionPath } from "../app/ContentPanelMainSlot";
import { tryContentPanelLocalBack } from "./contentPanelLocalBack";

export type ContentPanelBackActions = {
  closeCommandPalette?: () => void;
  clearActiveLinearIssue: () => void;
  clearActiveLinearDocument: () => void;
  clearActiveVaultDocument: () => void;
  setLinearWorkspaceView: (view: LinearWorkspaceViewId | null) => void;
  setLinearSelection: (selection: LinearWorkspaceSelection | null) => void;
  clearKeyboardListFocus?: () => boolean;
};

export type ContentPanelBackState = {
  commandPaletteOpen: boolean;
  activeLinearIssue: ActiveLinearIssue | null;
  activeLinearDocument: ActiveLinearDocument | null;
  activeVaultDocument: ActiveVaultDocument | null;
  activeVaultNavItem: SidebarNavItemId | null;
  linearSelection: LinearWorkspaceSelection | null;
  linearWorkspaceView: LinearWorkspaceViewId | null;
};

export function shouldClearVaultDocumentOnBack(
  activeVaultNavItem: SidebarNavItemId | null,
  documentPath: string,
): boolean {
  if (!activeVaultNavItem) return true;
  if (activeVaultNavItem === "daily") return false;
  if (activeVaultNavItem === "workouts") {
    return isWorkoutSessionPath(documentPath);
  }
  return true;
}

export function performContentPanelBack(
  state: ContentPanelBackState,
  actions: ContentPanelBackActions,
): boolean {
  if (state.commandPaletteOpen) {
    actions.closeCommandPalette?.();
    return true;
  }

  if (tryContentPanelLocalBack()) {
    return true;
  }

  if (state.activeLinearIssue) {
    actions.clearActiveLinearIssue();
    return true;
  }

  if (state.activeLinearDocument) {
    actions.clearActiveLinearDocument();
    return true;
  }

  if (
    state.activeVaultDocument &&
    shouldClearVaultDocumentOnBack(state.activeVaultNavItem, state.activeVaultDocument.path)
  ) {
    actions.clearActiveVaultDocument();
    return true;
  }

  if (
    state.linearSelection &&
    state.linearWorkspaceView &&
    state.linearWorkspaceView !== "overview"
  ) {
    actions.setLinearWorkspaceView("overview");
    return true;
  }

  if (state.linearSelection) {
    actions.setLinearSelection(null);
    return true;
  }

  if (actions.clearKeyboardListFocus?.()) {
    return true;
  }

  return false;
}
