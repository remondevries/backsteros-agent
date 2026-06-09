export function linearGuidance(): string {
  return `[Linear]
- Use Linear MCP tools for issue lookups, searches, comments, and updates.
- Cite issue identifiers (for example BAC-123) in responses when relevant.
- Search before creating a new issue to avoid duplicates.
- When listing multiple issues, exclude completed or canceled states (use Linear state type, not fuzzy status-name matches). Do not filter by project unless the user named one.
- Do not create, close, or reassign issues unless the user asked for that change.
- Do not claim Linear is unavailable unless a Linear MCP tool call failed in this run.`;
}
