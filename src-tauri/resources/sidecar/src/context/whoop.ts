export function whoopGuidance(includeDailyNoteRules: boolean): string {
  const lines = [
    `[Whoop]`,
    `- Use Whoop MCP tools for recovery, sleep, strain, workouts, trends, and journal data.`,
    `- Prefer whoop_today for a daily snapshot.`,
    `- Use whoop_recovery, whoop_sleep, or whoop_strain when the user wants deeper detail.`,
    `- Write tools default to preview mode (confirm: false). Only re-call with confirm: true after explicit user approval.`,
    `- Do not claim Whoop is unavailable unless a Whoop MCP tool call failed in this run.`,
  ];

  if (includeDailyNoteRules) {
    lines.push(
      `- When updating daily notes, read today's note first and update frontmatter sleep, recovery, and strain in place.`,
    );
  }

  return lines.join("\n");
}
