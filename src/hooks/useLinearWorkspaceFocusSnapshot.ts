import { useEffect } from "react";
import { useContentPanelNavigation, useFocusContent } from "../app/contentPanelNavigation";
import { fetchLinearProjectOverview } from "../lib/api";

export function useLinearWorkspaceFocusSnapshot() {
  const {
    linearSelection,
    linearWorkspaceView,
    activeLinearIssue,
    activeLinearDocument,
    activeVaultDocument,
  } = useContentPanelNavigation();
  const { setFocusContentSnapshot } = useFocusContent();

  useEffect(() => {
    if (activeLinearIssue || activeLinearDocument || activeVaultDocument || !linearSelection) {
      return;
    }

    if (
      linearSelection.kind === "project" &&
      linearWorkspaceView === "overview"
    ) {
      return;
    }

    if (linearSelection.kind === "team") {
      setFocusContentSnapshot({
        kind: "linear_workspace",
        summary: null,
        description: null,
      });
      return () => {
        setFocusContentSnapshot((current) =>
          current?.kind === "linear_workspace" ? null : current,
        );
      };
    }

    let cancelled = false;
    void (async () => {
      try {
        const result = await fetchLinearProjectOverview(linearSelection.id);
        if (cancelled) return;
        const overview = result.overview;
        setFocusContentSnapshot({
          kind: "linear_workspace",
          summary: overview?.summary ?? null,
          description: overview?.description ?? null,
        });
      } catch {
        if (cancelled) return;
        setFocusContentSnapshot({
          kind: "linear_workspace",
          summary: null,
          description: null,
        });
      }
    })();

    return () => {
      cancelled = true;
      setFocusContentSnapshot((current) =>
        current?.kind === "linear_workspace" ? null : current,
      );
    };
  }, [
    activeLinearIssue,
    activeLinearDocument,
    activeVaultDocument,
    linearSelection,
    linearWorkspaceView,
    setFocusContentSnapshot,
  ]);
}
