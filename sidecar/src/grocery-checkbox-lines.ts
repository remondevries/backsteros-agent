import {
  formatGroceryItemLabel,
  type GroceryItemExtract,
} from "./llm-extract/tasks/grocery-items.ts";

export type GroceryCheckboxEntry = {
  lineIndex: number;
  checked: boolean;
  name: string;
  count: number;
  sizeNote?: string;
};

function parseCount(value?: string): number {
  if (!value) return 1;
  if (!/^\d+$/.test(value.trim())) return 1;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function countToQuantity(count: number): string | undefined {
  if (count <= 1) return undefined;
  return String(count);
}

function isCountQuantity(quantity?: string): boolean {
  return !quantity || /^\d+$/.test(quantity.trim());
}

export function parseGroceryCheckboxLabel(label: string): {
  name: string;
  count: number;
  sizeNote?: string;
} {
  const trimmed = label.trim();
  const countPrefix = trimmed.match(/^(\d+)x\s+(.+)$/i);
  const body = countPrefix ? countPrefix[2] : trimmed;
  const count = countPrefix ? parseCount(countPrefix[1]) : 1;

  const sizeMatch = body.match(/^(.+?)\s+\((.+)\)$/);
  if (sizeMatch) {
    return {
      name: sizeMatch[1].trim(),
      count,
      sizeNote: sizeMatch[2].trim(),
    };
  }

  return { name: body.trim(), count };
}

export function parseGroceryCheckboxLine(line: string): {
  checked: boolean;
  name: string;
  count: number;
  sizeNote?: string;
} | null {
  const match = line.trim().match(/^- \[([ xX])\]\s+(.+)$/);
  if (!match) return null;

  const parsed = parseGroceryCheckboxLabel(match[2]);
  return {
    checked: match[1].toLowerCase() === "x",
    ...parsed,
  };
}

export function parseGroceryDescription(description: string): {
  lines: string[];
  entries: Map<string, GroceryCheckboxEntry>;
} {
  const lines = description.length > 0 ? description.split("\n") : [];
  const entries = new Map<string, GroceryCheckboxEntry>();

  lines.forEach((line, lineIndex) => {
    const parsed = parseGroceryCheckboxLine(line);
    if (!parsed) return;

    entries.set(parsed.name.toLowerCase(), {
      lineIndex,
      checked: parsed.checked,
      name: parsed.name,
      count: parsed.count,
      sizeNote: parsed.sizeNote,
    });
  });

  return { lines, entries };
}

export function formatGroceryCheckboxLine(
  item: Pick<GroceryItemExtract, "name" | "quantity" | "note">,
  options: { checked?: boolean } = {},
): string {
  const checked = options.checked ?? false;
  const marker = checked ? "x" : " ";
  return `- [${marker}] ${formatGroceryItemLabel(item)}`;
}

export function mergeGroceryItemsIntoDescription(
  description: string,
  items: GroceryItemExtract[],
): {
  description: string;
  added: GroceryItemExtract[];
  changed: boolean;
} {
  const { lines, entries } = parseGroceryDescription(description);
  const nextLines = [...lines];
  const added: GroceryItemExtract[] = [];
  let changed = false;

  for (const item of items) {
    const key = item.name.toLowerCase();
    const incomingCount = parseCount(item.quantity);
    const existing = entries.get(key);

    if (existing && !existing.sizeNote && isCountQuantity(item.quantity)) {
      const newCount = existing.count + incomingCount;
      const updatedItem: GroceryItemExtract = {
        name: existing.name,
        quantity: countToQuantity(newCount),
        note: item.note,
      };
      nextLines[existing.lineIndex] = formatGroceryCheckboxLine(updatedItem, {
        checked: existing.checked,
      });
      existing.count = newCount;
      added.push(updatedItem);
      changed = true;
      continue;
    }

    if (existing) {
      continue;
    }

    const line = formatGroceryCheckboxLine(item);
    const lineIndex = nextLines.length;
    nextLines.push(line);
    entries.set(key, {
      lineIndex,
      checked: false,
      name: item.name,
      count: incomingCount,
      sizeNote: isCountQuantity(item.quantity) ? undefined : item.quantity,
    });
    added.push(item);
    changed = true;
  }

  const trimmedLines = nextLines.join("\n").trimEnd();
  return {
    description: trimmedLines,
    added,
    changed,
  };
}
