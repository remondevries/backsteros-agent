import { describe, expect, test } from 'bun:test';
import { formatWorkoutDayLabel } from './workoutsBreadcrumb';

describe('formatWorkoutDayLabel', () => {
  test('formats valid date keys', () => {
    expect(formatWorkoutDayLabel('2026-05-24')).toBe('May 24');
  });

  test('returns raw key when unparseable', () => {
    expect(formatWorkoutDayLabel('invalid')).toBe('invalid');
  });
});
