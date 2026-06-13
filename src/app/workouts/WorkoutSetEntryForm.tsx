import { useState, type FormEvent } from "react";
import { catalogExerciseNames } from "../../lib/workouts/exerciseCatalog";
import { formatLoggedAt } from "../../lib/workouts/setsCsv";
import { todayIso } from "../../lib/dateFormat";

export function WorkoutSetEntryForm({
  defaultDate,
  onSubmit,
}: {
  defaultDate?: string;
  onSubmit: (set: {
    date: string;
    exercise: string;
    reps: number;
    weight: number;
    detail: string;
    isBodyweight: boolean;
    loggedAt: string;
  }) => Promise<void>;
}) {
  const [date, setDate] = useState(defaultDate ?? todayIso());
  const [exercise, setExercise] = useState(catalogExerciseNames()[0] ?? "");
  const [reps, setReps] = useState("8");
  const [weight, setWeight] = useState("40");
  const [detail, setDetail] = useState("");
  const [isBodyweight, setIsBodyweight] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const parsedReps = Number(reps);
      const parsedWeight = isBodyweight ? 0 : Number(weight);
      if (!exercise.trim() || !Number.isFinite(parsedReps) || parsedReps <= 0) {
        throw new Error("Exercise and reps are required");
      }
      await onSubmit({
        date,
        exercise: exercise.trim(),
        reps: parsedReps,
        weight: Number.isFinite(parsedWeight) ? parsedWeight : 0,
        detail: detail.trim(),
        isBodyweight,
        loggedAt: formatLoggedAt(),
      });
      setReps("8");
      setWeight("40");
      setDetail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save set");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="workout-set-entry-form" onSubmit={(event) => void handleSubmit(event)}>
      <h3 className="workout-set-entry-title">Log set</h3>
      <div className="workout-set-entry-grid">
        <label>
          Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label>
          Exercise
          <select value={exercise} onChange={(e) => setExercise(e.target.value)}>
            {catalogExerciseNames().map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Reps
          <input value={reps} onChange={(e) => setReps(e.target.value)} inputMode="numeric" />
        </label>
        <label>
          Weight (kg)
          <input
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            inputMode="decimal"
            disabled={isBodyweight}
          />
        </label>
        <label className="workout-set-entry-checkbox">
          <input
            type="checkbox"
            checked={isBodyweight}
            onChange={(e) => setIsBodyweight(e.target.checked)}
          />
          Bodyweight
        </label>
        <label>
          Detail
          <input value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Optional" />
        </label>
      </div>
      {error ? <p className="workout-set-entry-error">{error}</p> : null}
      <button type="submit" className="workout-set-entry-submit" disabled={saving}>
        {saving ? "Saving…" : "Add set"}
      </button>
    </form>
  );
}
