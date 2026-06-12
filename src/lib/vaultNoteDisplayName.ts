/** Display label for a vault note filename. Hides the .md extension. */
export function formatVaultNoteDisplayName(filename: string): string {
  return filename.replace(/\.md$/i, "");
}
