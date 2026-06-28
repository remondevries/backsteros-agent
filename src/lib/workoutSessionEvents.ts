type WorkoutSessionChangedListener = () => void;

const listeners = new Set<WorkoutSessionChangedListener>();

export function onWorkoutSessionChanged(listener: WorkoutSessionChangedListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyWorkoutSessionChanged(): void {
  for (const listener of listeners) {
    listener();
  }
}
