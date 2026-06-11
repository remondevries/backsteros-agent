import type { ObsidianArea } from "./obsidian-areas.ts";

export function obsidianCoreGuidance(): string {
  return `[Obsidian workspace]
Built-in shell/glob/grep/write/edit tools cannot access the notes workspace. Use these custom tools instead:
- count_workspace_files(path)
- list_workspace_entries(path)
- read_workspace_file(path)
- write_workspace_file(path, content)
- delete_workspace_file(path)
- append_workspace_file(path, text)
- today_daily_note(include_content?, create_if_missing?)
- world_time(locations?)
- resolve_wikilink(link, from?)
- run_workspace_shell(command, cwd?)

Rules:
- Prefer today_daily_note before guessing today's Daily/YYYY-MM-DD.md path.
- Prefer world_time for current time in other cities or timezones — do not use shell or web search for simple clock lookups.
- Prefer editing existing notes over creating duplicates.
- Ask before deleting any file.
- Never modify files under archive/.
- Never search, read, write, or delete anything under .obsidian/ — it is Obsidian system config, not user notes.
- Use run_workspace_shell instead of the built-in shell tool.
- When note content contains [[wikilinks]], call resolve_wikilink(link, from=<current file>) then read_workspace_file.
- When citing notes to the user, include [[wikilinks]] when helpful.
- Only claim a write succeeded if the write tool returned successfully.`;
}

const AREA_GUIDANCE: Record<ObsidianArea, string> = {
  daily: `[Daily notes]
- Daily notes live under Daily/ as YYYY-MM-DD.md.
- Call today_daily_note first to resolve today's path in the user's timezone.
- Good morning writes Whoop sleep and recovery in YAML frontmatter between the top --- markers. Strain is updated at good night, not in the morning.
- Read the note before updating frontmatter or day log metric lines.
- Replace metric lines in place instead of duplicating sections.`,
  projects: `[Project notes]
- Project notes live under Projects/.
- Project notes may include an \`alias\` frontmatter list with alternate names used during letter filing.
- Preserve existing headings and wikilinks when updating a project note.
- Link related daily notes, meetings, and specs with [[wikilinks]] instead of duplicating context.`,
  inbox: `[Inbox]
- Inbox/ is for quick captures and unprocessed notes.
- Prefer append_workspace_file or short write_workspace_file updates.
- When processing inbox items, move knowledge into the right folder rather than leaving duplicates.`,
  meetings: `[Meetings]
- Meeting notes live under Meetings/.
- Preserve attendees, agenda, decisions, and action items when editing.
- Link follow-ups to project or daily notes with [[wikilinks]].`,
  letters: `[Letters]
- Letters live under Letters/.
- Each letter PDF has a sibling wrapper note (same basename, .md) with frontmatter: type, assigned, date, organization, project, status, note.
- Wrapper notes embed the PDF with ![[filename.pdf]].
- When filing a new letter, write the PDF to Letters/ and create or update the wrapper note with matching frontmatter.
- When deleting a letter wrapper note (Letters/*.md), always delete the sibling PDF with the same basename too. Prefer delete_workspace_file over shell rm.`,
  contacts: `[Contacts]
- Contact notes live under Contacts/.
- Contacts may include an \`alias\` frontmatter list with OCR or historical name variants used for letter matching.
- Update facts in place; avoid creating a second note for the same person.`,
  organizations: `[Organizations]
- Organization notes live under Organizations/.
- Organizations may include an \`alias\` frontmatter list with sender names seen on incoming letters.
- Keep company context, links, and related contacts consistent with existing notes.`,
  specs: `[Specs]
- Specs and plans live under specs/.
- Prefer precise edits to existing sections over rewriting entire documents unless asked.`,
  archive: `[Archive]
- archive/ is read-only. Never edit, move, or delete files there.
- If the user asks about archived material, read only and say clearly that it cannot be changed.`,
};

export function obsidianAreaGuidance(areas: ObsidianArea[]): string[] {
  return areas.map((area) => AREA_GUIDANCE[area]);
}
