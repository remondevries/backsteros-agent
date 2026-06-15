import { invalidateLinearListCacheByPrefix } from "./list-cache.ts";

/** Bust cached Linear list responses after document mutations. */
export function invalidateLinearDocumentListCaches(): void {
  invalidateLinearListCacheByPrefix("team-api-documents:");
  invalidateLinearListCacheByPrefix("project-api-documents:");
  invalidateLinearListCacheByPrefix("meeting-documents");
}

/** Bust cached Linear list responses after issue mutations. */
export function invalidateLinearIssueListCaches(): void {
  invalidateLinearListCacheByPrefix("team-issues:");
  invalidateLinearListCacheByPrefix("project-issues:");
}
