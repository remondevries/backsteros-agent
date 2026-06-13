import { describe, expect, test } from 'bun:test';
import { DEFAULT_EXERCISE_CATALOG_ENTRIES } from './exerciseCatalogDefault';
import {
  catalogEntriesFromMarkdown,
  parseExerciseCatalogMarkdown,
  serializeExerciseCatalogMarkdown,
} from './exerciseCatalogMarkdown';

describe('parseExerciseCatalogMarkdown', () => {
  test('parses ## headings and bullet aliases', () => {
    const text = `## Bench press
- bench
- flat bench

## Lat pulldown
- pull bar down to chest seated
`;
    expect(parseExerciseCatalogMarkdown(text)).toEqual([
      { name: 'Bench press', aliases: ['bench', 'flat bench'] },
      { name: 'Lat pulldown', aliases: ['pull bar down to chest seated'] },
    ]);
  });

  test('parses optional Muscle group line under heading', () => {
    const text = `## Custom move
Muscle group: Shoulders
- overhead thing
`;
    expect(parseExerciseCatalogMarkdown(text)).toEqual([
      { name: 'Custom move', muscleGroup: 'Shoulders', aliases: ['overhead thing'] },
    ]);
  });

  test('ignores intro lines before first heading', () => {
    const text = `# Exercise catalog

Intro paragraph.

## Squat
- leg exercise
`;
    expect(parseExerciseCatalogMarkdown(text)).toEqual([
      { name: 'Squat', aliases: ['leg exercise'] },
    ]);
  });
});

describe('serializeExerciseCatalogMarkdown', () => {
  test('writes Muscle group line when set', () => {
    const text = serializeExerciseCatalogMarkdown([
      { name: 'Custom move', muscleGroup: 'Shoulders', aliases: ['phrase'] },
    ]);
    expect(text).toContain('## Custom move\n');
    expect(text).toContain('Muscle group: Shoulders\n');
    expect(text).toContain('- phrase');
  });

  test('round-trips default seed entries', () => {
    const text = serializeExerciseCatalogMarkdown(DEFAULT_EXERCISE_CATALOG_ENTRIES);
    const parsed = catalogEntriesFromMarkdown(text);
    expect(parsed.map((e) => e.name)).toEqual(
      DEFAULT_EXERCISE_CATALOG_ENTRIES.map((e) => e.name)
    );
    expect(parsed[0]?.aliases).toEqual(DEFAULT_EXERCISE_CATALOG_ENTRIES[0]?.aliases);
    expect(parsed[0]?.muscleGroup).toBe('Chest');
  });
});
