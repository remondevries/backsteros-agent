import { useContentPanelNavigation } from "../app/contentPanelNavigation";

/** True when main/sidebar focus is on a document, issue, or vault note rather than a list. */
export function isContentDetailViewOpen(
  navigation: Pick<
    ReturnType<typeof useContentPanelNavigation>,
    "activeLinearDocument" | "activeLinearIssue" | "activeVaultDocument"
  >,
): boolean {
  return (
    navigation.activeLinearDocument != null ||
    navigation.activeLinearIssue != null ||
    navigation.activeVaultDocument != null
  );
}
