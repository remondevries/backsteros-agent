type WorkoutSetsChangedListener = () => void;

const listeners = new Set<WorkoutSetsChangedListener>();

export function onWorkoutSetsChanged(listener: WorkoutSetsChangedListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyWorkoutSetsChanged(): void {
  for (const listener of listeners) {
    listener();
  }
}
