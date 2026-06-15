import { describe, expect, test } from 'bun:test';
import { formatVaultWorkoutDocumentLabel, formatWorkoutDayLabel } from './workoutsBreadcrumb';

describe('formatWorkoutDayLabel', () => {
  test('formats valid date keys', () => {
    expect(formatWorkoutDayLabel('2026-05-24')).toBe('May 24');
  });

  test('returns raw key when unparseable', () => {
    expect(formatWorkoutDayLabel('invalid')).toBe('invalid');
  });
});

describe('formatVaultWorkoutDocumentLabel', () => {
  test('formats workout session csv paths as human-readable dates', () => {
    expect(
      formatVaultWorkoutDocumentLabel('Workouts/2026-05-24.csv', '2026-05-24.csv'),
    ).toBe('May 24');
  });

  test('falls back to title for non-session paths', () => {
    expect(formatVaultWorkoutDocumentLabel('Workouts/personal-records.csv', 'personal-records.csv')).toBe(
      'personal-records.csv',
    );
  });
});
