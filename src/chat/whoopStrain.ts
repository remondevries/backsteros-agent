import type { WhoopHrZoneDurations, WhoopSnapshotEntity, WhoopWorkoutEntity } from "./types";
import { WHOOP_STEPS_TARGET } from "./whoopMetrics";

export function formatWhoopDurationMs(ms: number | null | undefined): string | undefined {
  if (ms == null || ms <= 0) return undefined;
  const totalMinutes = Math.round(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}m`;
  if (minutes <= 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function formatWhoopSportName(name: string, sportId?: number | null): string {
  if (sportId === -1 || name.trim().toLowerCase() === "activity") {
    return "General activity";
  }

  return name
    .toLowerCase()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatWhoopClockTime(iso: string | null | undefined): string | undefined {
  if (!iso) return undefined;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatStrainValue(value: number | null | undefined): string | undefined {
  if (value == null || Number.isNaN(value)) return undefined;
  return value.toFixed(1);
}

function formatStrainTargetContext(
  target: WhoopSnapshotEntity["strainTarget"],
): string | undefined {
  if (!target) return undefined;

  const parts: string[] = [];
  const value = formatStrainValue(target.value);
  const lower = formatStrainValue(target.optimalLower);
  const upper = formatStrainValue(target.optimalUpper);

  if (value) {
    parts.push(`target of ${value}`);
  }
  if (lower && upper) {
    parts.push(`optimal range of ${lower}–${upper}`);
  } else if (lower) {
    parts.push(`optimal range from ${lower}`);
  } else if (upper) {
    parts.push(`optimal range up to ${upper}`);
  }

  if (parts.length === 0) return undefined;
  if (parts.length === 1) return parts[0];
  return `${parts[0]} and ${parts[1]}`;
}

export function buildStrainZoneRows(zones: WhoopHrZoneDurations | undefined): Array<{
  label: string;
  value?: string;
}> {
  if (!zones) return [];

  const rows: Array<{ label: string; value?: string }> = [];

  const zone13 = zones.zone1Ms;
  if (zone13 != null && zone13 > 0) {
    rows.push({ label: "HR zones 1–3", value: formatWhoopDurationMs(zone13) });
  }

  const zone45 = zones.zone4Ms;
  if (zone45 != null && zone45 > 0) {
    rows.push({ label: "HR zones 4–5", value: formatWhoopDurationMs(zone45) });
  }

  for (const [label, ms] of [
    ["Zone 0", zones.zone0Ms],
    ["Zone 2", zones.zone2Ms],
    ["Zone 3", zones.zone3Ms],
    ["Zone 5", zones.zone5Ms],
  ] as const) {
    if (ms != null && ms > 0) {
      rows.push({ label, value: formatWhoopDurationMs(ms) });
    }
  }

  return rows;
}

export function hasWhoopStrainDetails(item: WhoopSnapshotEntity): boolean {
  const target = item.strainTarget;
  const hasTarget =
    target != null &&
    (target.value != null || target.optimalLower != null || target.optimalUpper != null);

  return Boolean(
    hasTarget ||
      (item.steps != null && item.steps > 0) ||
      item.strengthActivityTime ||
      (item.strainCalories != null && item.strainCalories > 0) ||
      item.strainAvgHrBpm != null ||
      item.strainMaxHrBpm != null ||
      buildStrainZoneRows(item.strainZoneDurations).length > 0 ||
      (item.workouts && item.workouts.length > 0),
  );
}

export function countWhoopWorkouts(item: WhoopSnapshotEntity): number {
  if (item.workouts && item.workouts.length > 0) {
    return item.workouts.length;
  }
  return item.workoutsCount ?? 0;
}

export function formatWorkoutMeta(workout: WhoopWorkoutEntity): string {
  const parts: string[] = [];
  const start = formatWhoopClockTime(workout.start);
  if (start) parts.push(start);
  if (workout.duration) parts.push(workout.duration);
  if (workout.strain != null) parts.push(`${workout.strain.toFixed(1)} strain`);
  if (workout.calories != null) parts.push(`${workout.calories} cal`);
  if (workout.avgHrBpm != null) parts.push(`${Math.round(workout.avgHrBpm)} avg HR`);
  return parts.join(" · ");
}

function appendStepsToStrainInsight(sentence: string, steps: number | null | undefined): string {
  if (steps == null) {
    return sentence;
  }

  return `${sentence.replace(/\.$/, "")}, with ${steps.toLocaleString()} of your ${WHOOP_STEPS_TARGET.toLocaleString()}-step target.`;
}

export function formatStrainInsight(item: WhoopSnapshotEntity): string {
  const score = item.strainScore;
  const target = item.strainTarget;

  if (score == null) {
    return "Strain data is not available yet.";
  }

  const strain = score.toFixed(1);
  const targetContext = formatStrainTargetContext(target);
  const optimalLower = target?.optimalLower;
  const optimalUpper = target?.optimalUpper;

  if (optimalLower != null && optimalUpper != null) {
    if (score < optimalLower) {
      if (targetContext) {
        return appendStepsToStrainInsight(
          `Today's strain is ${strain}, below your ${targetContext}.`,
          item.steps,
        );
      }
      return appendStepsToStrainInsight(
        `Today's strain is ${strain}, below your optimal range of ${optimalLower.toFixed(1)}–${optimalUpper.toFixed(1)}.`,
        item.steps,
      );
    }
    if (score > optimalUpper) {
      if (targetContext) {
        return appendStepsToStrainInsight(
          `Today's strain is ${strain}, above your ${targetContext}.`,
          item.steps,
        );
      }
      return appendStepsToStrainInsight(
        `Today's strain is ${strain}, above your optimal range of ${optimalLower.toFixed(1)}–${optimalUpper.toFixed(1)}.`,
        item.steps,
      );
    }
    if (targetContext) {
      return appendStepsToStrainInsight(
        `Today's strain is ${strain}, within your ${targetContext}.`,
        item.steps,
      );
    }
    return appendStepsToStrainInsight(
      `Today's strain is ${strain}, within your optimal range of ${optimalLower.toFixed(1)}–${optimalUpper.toFixed(1)}.`,
      item.steps,
    );
  }

  if (targetContext) {
    return appendStepsToStrainInsight(
      `Today's strain is ${strain}, with your ${targetContext}.`,
      item.steps,
    );
  }

  if (item.workoutsCount != null && countWhoopWorkouts(item) > 0) {
    const count = countWhoopWorkouts(item);
    const workoutLabel = count === 1 ? "workout" : "workouts";
    return appendStepsToStrainInsight(
      `Today's strain is ${strain} across ${count} ${workoutLabel}.`,
      item.steps,
    );
  }

  return appendStepsToStrainInsight(`Today's strain is ${strain}.`, item.steps);
}
