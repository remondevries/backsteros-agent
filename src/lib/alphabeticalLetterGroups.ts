export type LetterGroup<T> = {
  key: string;
  label: string;
  items: T[];
};

export function letterGroupKey(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "#";
  const first = trimmed[0]!.toUpperCase();
  if (first >= "A" && first <= "Z") return first;
  if (first >= "0" && first <= "9") return "0-9";
  return "#";
}

export function compareLetterGroupKeys(left: string, right: string): number {
  if (left === right) return 0;
  if (left === "#") return 1;
  if (right === "#") return -1;
  if (left === "0-9") return right === "#" ? -1 : 1;
  if (right === "0-9") return left === "#" ? 1 : -1;
  return left.localeCompare(right);
}

export function groupByLetter<T>(items: T[], getName: (item: T) => string): LetterGroup<T>[] {
  const byKey = new Map<string, T[]>();

  for (const item of items) {
    const key = letterGroupKey(getName(item));
    const bucket = byKey.get(key);
    if (bucket) {
      bucket.push(item);
    } else {
      byKey.set(key, [item]);
    }
  }

  return [...byKey.entries()]
    .sort(([left], [right]) => compareLetterGroupKeys(left, right))
    .map(([key, groupedItems]) => ({
      key,
      label: key,
      items: groupedItems.sort((left, right) =>
        getName(left).localeCompare(getName(right), undefined, { sensitivity: "base" }),
      ),
    }));
}
