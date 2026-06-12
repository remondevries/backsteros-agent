import { useEffect } from "react";
import { useContentPanelNavigation } from "../app/contentPanelNavigation";
import { fetchLinearProjectOverview } from "../lib/api";

export function useLinearWorkspaceFocusSnapshot() {
  const {
    linearSelection,
    activeLinearIssue,
    activeLinearDocument,
    activeVaultDocument,
    setFocusContentSnapshot,
  } = useContentPanelNavigation();

  useEffect(() => {
    if (activeLinearIssue || activeLinearDocument || activeVaultDocument || !linearSelection) {
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
    setFocusContentSnapshot,
  ]);
}
