import type { WorkoutGroupSetEntity, WorkoutRepEntity } from "../api";
import { WORKOUT_REP_WEIGHT_PLACEHOLDER } from "./linearWorkoutTypes";

export function formatRepWeightDisplay(title: string): string {
  if (title === WORKOUT_REP_WEIGHT_PLACEHOLDER || title.startsWith("Set ")) {
    return "";
  }
  return title;
}

export function parseRepWeightKg(title: string): number | null {
  const display = formatRepWeightDisplay(title);
  if (!display) {
    return null;
  }
  const parsed = Number.parseFloat(display);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

export function normalizeIntegerInput(raw: string): string {
  return raw.replace(/\D/g, "");
}

export function normalizeNumericInput(raw: string): string {
  let result = "";
  let hasDecimal = false;

  for (const char of raw) {
    if (char >= "0" && char <= "9") {
      result += char;
      continue;
    }
    if (char === "." && !hasDecimal) {
      hasDecimal = true;
      result += char;
    }
  }

  return result;
}

export function formatRepCountDisplay(rep: WorkoutRepEntity): string {
  if (rep.reps != null && Number.isFinite(rep.reps)) {
    return String(rep.reps);
  }
  const fromDescription = normalizeIntegerInput(rep.description ?? "");
  return fromDescription;
}

export function parseRepCount(rep: WorkoutRepEntity): number | null {
  if (rep.reps != null && Number.isFinite(rep.reps) && rep.reps > 0) {
    return rep.reps;
  }
  const fromDescription = Number.parseInt(normalizeIntegerInput(rep.description ?? ""), 10);
  if (!Number.isFinite(fromDescription) || fromDescription <= 0) {
    return null;
  }
  return fromDescription;
}

export function repVolumeKg(rep: WorkoutRepEntity): number {
  const weight = parseRepWeightKg(rep.title);
  const count = parseRepCount(rep);
  if (weight == null || count == null) {
    return 0;
  }
  return weight * count;
}

export function repVolumeProgressPercent(reps: WorkoutRepEntity[], rep: WorkoutRepEntity): number {
  const maxVolume = reps.reduce((max, entry) => Math.max(max, repVolumeKg(entry)), 0);
  if (maxVolume <= 0) {
    return 0;
  }
  const current = repVolumeKg(rep);
  if (current <= 0) {
    return 0;
  }
  return Math.min(100, Math.round((current / maxVolume) * 100));
}

export function sumGroupSetWeightKg(reps: WorkoutRepEntity[]): number {
  let total = 0;
  for (const rep of reps) {
    const weight = parseRepWeightKg(rep.title);
    if (weight != null) {
      total += weight;
    }
  }
  return total;
}

export function sumGroupSetRepCount(reps: WorkoutRepEntity[]): number {
  let total = 0;
  for (const rep of reps) {
    const count = parseRepCount(rep);
    if (count != null) {
      total += count;
    }
  }
  return total;
}

export function sumSessionGroupSetWeightKg(groupSets: WorkoutGroupSetEntity[]): number {
  return groupSets.reduce((total, groupSet) => total + sumGroupSetWeightKg(groupSet.reps), 0);
}

export function formatGroupSetTotalWeightKg(total: number): string {
  if (total <= 0) {
    return "0 kg";
  }
  if (Number.isInteger(total)) {
    return `${total} kg`;
  }
  return `${parseFloat(total.toFixed(2))} kg`;
}
