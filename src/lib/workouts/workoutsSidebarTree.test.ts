import { describe, expect, test } from 'bun:test';
import {
  latestWorkoutDayInSidebarTree,
  mergeActiveWorkoutSessionIntoSidebarTree,
  type WorkoutsSidebarYearNode,
} from './workoutsSidebarTree';

function day(dateKey: string) {
  return {
    dateKey,
    path: `Workouts/${dateKey}.csv`,
    label: dateKey,
    monthKey: dateKey.slice(0, 7),
    weekKey: '2026-W20',
    volume: 100,
    exercises: 1,
    exerciseNames: ['Bench'],
  };
}

describe('latestWorkoutDayInSidebarTree', () => {
  test('returns the newest date key across the tree', () => {
    const tree: WorkoutsSidebarYearNode[] = [
      {
        year: 2026,
        volume: 0,
        exercises: 0,
        months: [
          {
            monthKey: '2026-05',
            label: 'May',
            volume: 0,
            exercises: 0,
            weeks: [
              {
                weekKey: '2026-W20',
                label: 'May',
                volume: 0,
                exercises: 0,
                days: [day('2026-05-20'), day('2026-05-24')],
              },
            ],
          },
        ],
      },
      {
        year: 2025,
        volume: 0,
        exercises: 0,
        months: [
          {
            monthKey: '2025-12',
            label: 'Dec',
            volume: 0,
            exercises: 0,
            weeks: [
              {
                weekKey: '2025-W52',
                label: 'Dec',
                volume: 0,
                exercises: 0,
                days: [day('2025-12-31')],
              },
            ],
          },
        ],
      },
    ];

    expect(latestWorkoutDayInSidebarTree(tree)?.dateKey).toBe('2026-05-24');
  });
});

describe('mergeActiveWorkoutSessionIntoSidebarTree', () => {
  test('adds an in-progress day when the session CSV does not exist yet', () => {
    const merged = mergeActiveWorkoutSessionIntoSidebarTree([], '2026-06-04');
    expect(latestWorkoutDayInSidebarTree(merged)?.dateKey).toBe('2026-06-04');
    expect(latestWorkoutDayInSidebarTree(merged)?.inProgress).toBe(true);
  });

  test('marks an existing day as in progress', () => {
    const tree: WorkoutsSidebarYearNode[] = [
      {
        year: 2026,
        volume: 100,
        exercises: 1,
        months: [
          {
            monthKey: '2026-06',
            label: 'Jun',
            volume: 100,
            exercises: 1,
            weeks: [
              {
                weekKey: '2026-W23',
                label: 'Jun',
                volume: 100,
                exercises: 1,
                days: [day('2026-06-04')],
              },
            ],
          },
        ],
      },
    ];

    const merged = mergeActiveWorkoutSessionIntoSidebarTree(tree, '2026-06-04');
    expect(latestWorkoutDayInSidebarTree(merged)?.inProgress).toBe(true);
    expect(latestWorkoutDayInSidebarTree(merged)?.volume).toBe(100);
  });
});
