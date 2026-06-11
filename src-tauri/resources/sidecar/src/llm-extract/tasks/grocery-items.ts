import type { LlmExtractTaskDefinition } from "../types.ts";

export type GroceryItemExtract = {
  name: string;
  quantity?: string;
  note?: string;
};

export type GroceryItemsExtractOutput = {
  items: GroceryItemExtract[];
};

const GROCERY_EXTRACT_SYSTEM = `[Structured extraction]
You extract the FINAL grocery list from casual, spoken-style messages.

Read the entire message before answering. Output only what the user ultimately wants to buy.

Rules:
- Return ONLY valid JSON matching the schema.
- Later corrections override earlier mentions. Example: "milk ... oh wait i want two milks instead of 1" → one Milk item with quantity "2", not quantity "1".
- Ignore filler and meta talk: "that's it", "thats it", "oh wait", "never mind", "actually", "instead of 1", and similar chatter are NOT grocery items.
- When the message lists multiple products, split them into separate items. "Milk apples" means Milk and Apples (two items), not one item named "Milk apples".
- Use short product names in Title Case: "Milk", "Apples", "Oat Milk".
- Put item counts in quantity as a plain number string: "2", not "2x". Map number words: two → "2", three → "3".
- Use descriptive quantities only for sizes or units: "2 gallons", "1 loaf".
- Merge duplicate products into one row with the final quantity.
- Never output sentences, correction text, or phrases as item names.
- If the message has no grocery items, return {"items": []}.
- Do not invent items that are not implied by the message.`;

const GROCERY_FEW_SHOT = `Example:
Message: "Milk apples and thats it oh wait i want two milks instead of 1"
Output: {"items":[{"name":"Milk","quantity":"2"},{"name":"Apples"}]}`;

const GROCERY_JSON_SCHEMA = `{
  "items": [
    {
      "name": "short item name in Title Case",
      "quantity": "optional count or size, e.g. 2 or 2 gallons, or empty string",
      "note": "optional short note or empty string"
    }
  ]
}`;

const WORD_NUMBERS: Record<string, string> = {
  one: "1",
  a: "1",
  an: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  nine: "9",
  ten: "10",
};

const FILLER_NAME_RE =
  /\b(instead|wait|thats|that's|oh|actually|nevermind|never mind|want|instead of)\b/i;

function normalizeGroceryName(value: string): string {
  return value
    .trim()
    .replace(/^[-*•\d.]+\s*/, "")
    .replace(/^(?:get|buy|pick up|add|need|i want)\s+/i, "")
    .trim();
}

function titleCaseGroceryName(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function parseCountToken(token: string): string | undefined {
  const trimmed = token.trim().toLowerCase();
  if (WORD_NUMBERS[trimmed]) return WORD_NUMBERS[trimmed];
  if (/^\d+$/.test(trimmed)) return trimmed;
  return undefined;
}

function normalizeQuantity(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const count = parseCountToken(trimmed);
  if (count) return count;

  const countSuffix = trimmed.match(/^(\d+)\s*x$/i);
  if (countSuffix) return countSuffix[1];

  const prefixX = trimmed.match(/^x\s*(\d+)$/i);
  if (prefixX) return prefixX[1];

  return trimmed;
}

function isPlausibleGroceryName(name: string): boolean {
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 48) return false;
  if (FILLER_NAME_RE.test(trimmed)) return false;
  if (trimmed.split(/\s+/).length > 5) return false;
  return true;
}

function correctionProductName(raw: string): string {
  const cleaned = normalizeGroceryName(raw).replace(/\s+instead.*$/i, "").trim();
  const singular =
    /\bmilks\b/i.test(cleaned) ? cleaned.replace(/\bmilks\b/i, "milk") : cleaned;
  return titleCaseGroceryName(singular);
}

export function finalizeGroceryItems(items: GroceryItemExtract[]): GroceryItemsExtractOutput {
  const merged = new Map<string, GroceryItemExtract>();

  for (const item of items) {
    const name = titleCaseGroceryName(normalizeGroceryName(item.name));
    if (!isPlausibleGroceryName(name)) continue;

    const key = name.toLowerCase();
    const quantity = normalizeQuantity(item.quantity);
    const note = typeof item.note === "string" ? item.note.trim() || undefined : undefined;

    merged.set(key, {
      name,
      quantity,
      note,
    });
  }

  return { items: [...merged.values()] };
}

const COMPOUND_GROCERY_MODIFIERS = new Set([
  "oat",
  "almond",
  "soy",
  "coconut",
  "greek",
  "whole",
  "skim",
  "sour",
  "heavy",
  "brown",
  "white",
  "wheat",
  "paper",
  "frozen",
  "fresh",
  "dried",
  "organic",
  "unsweetened",
]);

function shouldSplitSpacedGroceryHead(words: string[]): boolean {
  if (words.length < 2 || words.length > 4) return false;
  if (!words.every((word) => word.length <= 16)) return false;

  if (words.length === 2) {
    const [first, second] = words;
    const firstLower = first.toLowerCase();
    const secondLower = second.toLowerCase();
    if (COMPOUND_GROCERY_MODIFIERS.has(firstLower)) return false;
    if (secondLower === "milk" && firstLower.length > 2) return false;
    if (secondLower === "yogurt" && firstLower.length > 2) return false;
  }

  return true;
}

function splitGroceryHead(text: string): string[] {
  const cleaned = normalizeGroceryName(text);
  if (!cleaned) return [];

  if (/[,;]|\band\b/i.test(cleaned)) {
    return cleaned
      .split(/\n+|,(?![^(]*\))|(?:\band\b)/i)
      .map((part) => normalizeGroceryName(part))
      .filter(Boolean);
  }

  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 1) return [cleaned];

  if (shouldSplitSpacedGroceryHead(words)) {
    return words.map((word) => normalizeGroceryName(word)).filter(Boolean);
  }

  return [cleaned];
}

function parseConversationalGroceryMessage(message: string): GroceryItemsExtractOutput | null {
  const items = new Map<string, GroceryItemExtract>();

  const insteadMatch = message.match(
    /\b(?:(?:i\s+)?want\s+)?(two|three|four|five|six|seven|eight|nine|ten|\d+)\s+([a-z][a-z\s]*?)\s+instead(?:\s+of\s+(?:one|a|an|\d+))?/i,
  );

  if (insteadMatch) {
    const quantity = parseCountToken(insteadMatch[1]);
    const name = correctionProductName(insteadMatch[2]);
    if (quantity && isPlausibleGroceryName(name)) {
      items.set(name.toLowerCase(), { name, quantity });
    }
  }

  const head = message.split(/\b(?:and\s+)?that'?s\s+it\b|\boh\s+wait\b/i)[0]?.trim();
  if (head) {
    for (const part of splitGroceryHead(head)) {
      const name = titleCaseGroceryName(part);
      if (!isPlausibleGroceryName(name)) continue;
      const key = name.toLowerCase();
      if (!items.has(key)) {
        items.set(key, { name });
      }
    }
  }

  if (items.size === 0) return null;
  return finalizeGroceryItems([...items.values()]);
}

function normalizeOptionalField(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

export function parseGroceryItemsOutput(raw: unknown): GroceryItemsExtractOutput {
  const record = raw as Partial<GroceryItemsExtractOutput>;
  const items = Array.isArray(record.items) ? record.items : [];

  const parsed = items
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const item = entry as Partial<GroceryItemExtract>;
      const name = typeof item.name === "string" ? normalizeGroceryName(item.name) : "";
      if (!name) return null;
      return {
        name,
        quantity: normalizeQuantity(item.quantity),
        note: normalizeOptionalField(item.note),
      } satisfies GroceryItemExtract;
    })
    .filter((item): item is GroceryItemExtract => item != null);

  return finalizeGroceryItems(parsed);
}

export function heuristicGroceryItemsExtract(message: string): GroceryItemsExtractOutput {
  const trimmed = message.trim();
  if (!trimmed) return { items: [] };

  const conversational = parseConversationalGroceryMessage(trimmed);
  if (conversational) {
    return conversational;
  }

  const parts = trimmed
    .split(/\n+|,(?![^(]*\))|(?:\band\b)/i)
    .map((part) => normalizeGroceryName(part))
    .filter(Boolean);

  return finalizeGroceryItems(parts.map((name) => ({ name })));
}

export function formatGroceryItemLabel(item: Pick<GroceryItemExtract, "name" | "quantity">): string {
  const count = item.quantity ? parseCountToken(item.quantity) : undefined;
  if (count) {
    return `${count}x ${item.name}`;
  }
  if (item.quantity) {
    return `${item.name} (${item.quantity})`;
  }
  return item.name;
}

export const GROCERY_ITEMS_EXTRACT_TASK: LlmExtractTaskDefinition<GroceryItemsExtractOutput> = {
  id: "grocery-items",
  description: "Extract grocery items from a natural-language message",
  systemInstruction: GROCERY_EXTRACT_SYSTEM,
  buildUserPrompt: (message) =>
    [
      "Extract the final grocery list from this message.",
      "",
      GROCERY_FEW_SHOT,
      "",
      `Schema:\n${GROCERY_JSON_SCHEMA}`,
      "",
      `Message:\n${message.trim()}`,
    ].join("\n"),
  parseOutput: parseGroceryItemsOutput,
  heuristicExtract: heuristicGroceryItemsExtract,
};
