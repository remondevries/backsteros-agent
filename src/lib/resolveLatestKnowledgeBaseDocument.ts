import type { ActiveVaultDocument } from "../app/contentPanelNavigation";
import { resolveLatestVaultDocumentInFolder } from "./resolveLatestMeetingDocument";

const KNOWLEDGE_BASE_ROOT_PATH = "Knowledge Base";

export async function resolveLatestKnowledgeBaseDocument(): Promise<ActiveVaultDocument | null> {
  return resolveLatestVaultDocumentInFolder(KNOWLEDGE_BASE_ROOT_PATH);
}
