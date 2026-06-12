import { useEffect } from "react";
import { ensureLinearWorkspaceVaultStructure } from "../lib/api";
import type { LinearWorkspaceSelection } from "../app/linearWorkspaceSelection";

export function useEnsureLinearWorkspaceVaultStructure(
  selection: LinearWorkspaceSelection | null,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled || !selection) return;

    void ensureLinearWorkspaceVaultStructure({
      teamId: selection.kind === "team" ? selection.id : undefined,
      projectId: selection.kind === "project" ? selection.id : undefined,
    }).catch(() => {
      // Best-effort — vault may be unavailable until notes path is configured.
    });
  }, [enabled, selection]);
}
