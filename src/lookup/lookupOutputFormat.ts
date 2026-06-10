export type LookupOutputFormat = "default" | "bullets" | "action-items" | "outline";

const STORAGE_KEY = "backster-lookup-output-format";
const listeners = new Set<() => void>();

export function readLookupOutputFormat(): LookupOutputFormat {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === "bullets" || value === "action-items" || value === "outline") {
      return value;
    }
    return "default";
  } catch {
    return "default";
  }
}

export function writeLookupOutputFormat(format: LookupOutputFormat): void {
  try {
    localStorage.setItem(STORAGE_KEY, format);
  } catch {
    // Ignore storage failures in restricted environments.
  }
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeLookupOutputFormat(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const LOOKUP_OUTPUT_FORMAT_OPTIONS: Array<{
  value: LookupOutputFormat;
  label: string;
}> = [
  { value: "default", label: "Default" },
  { value: "bullets", label: "Bullets" },
  { value: "action-items", label: "Action items" },
  { value: "outline", label: "Outline" },
];

export function lookupOutputFormatLabel(format: LookupOutputFormat): string {
  return LOOKUP_OUTPUT_FORMAT_OPTIONS.find((option) => option.value === format)?.label ?? "Default";
}
