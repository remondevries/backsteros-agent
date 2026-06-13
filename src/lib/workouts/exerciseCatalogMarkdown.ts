import type { ExerciseCatalogEntry } from './types';
import { DEFAULT_MUSCLE_GROUP_BY_EXERCISE_NAME } from './exerciseCatalogDefault';

export interface ParsedExerciseCatalogSection {
  name: string;
  /** From optional `Muscle group: …` line under the heading (not an alias). */
  muscleGroup?: string;
  aliases: string[];
}

const MUSCLE_GROUP_LINE_RE = /^Muscle group:\s*(.+?)\s*$/i;

const CATALOG_HEADER = `# Exercise catalog

Edit workout names (\`##\` headings) and description sentences (\`-\` bullets).
Used when matching free-form exercise descriptions in the workout logger.

`;

/**
 * Parse vault markdown:
 * ## Workout name
 * - sentence #1
 * - sentence #2
 */
export function parseExerciseCatalogMarkdown(text: string): ParsedExerciseCatalogSection[] {
  const sections: ParsedExerciseCatalogSection[] = [];
  let current: ParsedExerciseCatalogSection | null = null;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    const headingMatch = line.match(/^##\s+(.+?)\s*$/);
    if (headingMatch) {
      if (current) sections.push(current);
      current = { name: headingMatch[1]!.trim(), aliases: [] };
      continue;
    }
    const muscleMatch = line.match(MUSCLE_GROUP_LINE_RE);
    if (muscleMatch && current) {
      current.muscleGroup = muscleMatch[1]!.trim();
      continue;
    }
    const bulletMatch = line.match(/^-\s+(.+?)\s*$/);
    if (bulletMatch && current) {
      const alias = bulletMatch[1]!.trim();
      if (alias) current.aliases.push(alias);
    }
  }

  if (current) sections.push(current);
  return sections.filter((section) => section.name.length > 0);
}

export function serializeExerciseCatalogMarkdown(
  entries: readonly Pick<ExerciseCatalogEntry, 'name' | 'muscleGroup' | 'aliases'>[],
): string {
  const blocks = entries.map((entry) => {
    const muscleLine =
      entry.muscleGroup?.trim() ? `Muscle group: ${entry.muscleGroup.trim()}\n` : '';
    const aliasLines = entry.aliases.map((alias) => `- ${alias}`).join('\n');
    return `## ${entry.name}\n${muscleLine}${aliasLines}`;
  });
  return `${CATALOG_HEADER}${blocks.join('\n\n')}\n`;
}

/** Attach muscle groups from the built-in map (known exercises) when loading vault markdown. */
function catalogEntriesFromMarkdownSections(
  sections: readonly ParsedExerciseCatalogSection[],
): ExerciseCatalogEntry[] {
  return sections.map((section) => ({
    name: section.name,
    muscleGroup:
      section.muscleGroup?.trim() ||
      DEFAULT_MUSCLE_GROUP_BY_EXERCISE_NAME.get(section.name.toLowerCase()) ||
      '',
    aliases: [...section.aliases],
  }));
}

export function catalogEntriesFromMarkdown(text: string): ExerciseCatalogEntry[] {
  return catalogEntriesFromMarkdownSections(parseExerciseCatalogMarkdown(text));
}
