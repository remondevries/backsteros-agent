export function buildLinearDocumentUrl(documentId: string): string {
  const id = documentId.trim();
  if (!id) return "https://linear.app";
  return `https://linear.app/document/${encodeURIComponent(id)}`;
}
