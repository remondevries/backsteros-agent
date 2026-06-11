import { describe, expect, test } from "bun:test";
import {
  formatGroceryCheckboxLine,
  mergeGroceryItemsIntoDescription,
  parseGroceryCheckboxLabel,
  parseGroceryCheckboxLine,
  parseGroceryDescription,
} from "./grocery-checkbox-lines.ts";

describe("parseGroceryCheckboxLabel", () => {
  test("parses plain item as count 1", () => {
    expect(parseGroceryCheckboxLabel("Milk")).toEqual({ name: "Milk", count: 1 });
  });

  test("parses quantity prefix", () => {
    expect(parseGroceryCheckboxLabel("2x Milk")).toEqual({ name: "Milk", count: 2 });
  });

  test("parses quantity prefix with size note", () => {
    expect(parseGroceryCheckboxLabel("2x Oat Milk (2 gallons)")).toEqual({
      name: "Oat Milk",
      count: 2,
      sizeNote: "2 gallons",
    });
  });
});

describe("parseGroceryCheckboxLine", () => {
  test("parses unchecked checkbox line", () => {
    expect(parseGroceryCheckboxLine("- [ ] 2x Milk")).toEqual({
      checked: false,
      name: "Milk",
      count: 2,
    });
  });

  test("parses checked checkbox line", () => {
    expect(parseGroceryCheckboxLine("- [x] Apples")).toEqual({
      checked: true,
      name: "Apples",
      count: 1,
    });
  });
});

describe("mergeGroceryItemsIntoDescription", () => {
  test("appends new items to empty description", () => {
    const result = mergeGroceryItemsIntoDescription("", [{ name: "Milk" }, { name: "Apples" }]);

    expect(result.changed).toBe(true);
    expect(result.added).toHaveLength(2);
    expect(result.description).toBe("- [ ] Milk\n- [ ] Apples");
  });

  test("increments existing plain item to 2x", () => {
    const existing = "- [ ] Milk\n- [ ] Apples";
    const result = mergeGroceryItemsIntoDescription(existing, [{ name: "Milk" }]);

    expect(result.changed).toBe(true);
    expect(result.added).toEqual([{ name: "Milk", quantity: "2" }]);
    expect(result.description).toBe("- [ ] 2x Milk\n- [ ] Apples");
  });

  test("increments existing 2x item to 3x", () => {
    const existing = "- [ ] 2x Milk";
    const result = mergeGroceryItemsIntoDescription(existing, [{ name: "Milk" }]);

    expect(result.changed).toBe(true);
    expect(result.added).toEqual([{ name: "Milk", quantity: "3" }]);
    expect(result.description).toBe("- [ ] 3x Milk");
  });

  test("adds incoming quantity to existing count", () => {
    const existing = "- [ ] 2x Milk";
    const result = mergeGroceryItemsIntoDescription(existing, [{ name: "Milk", quantity: "2" }]);

    expect(result.changed).toBe(true);
    expect(result.added).toEqual([{ name: "Milk", quantity: "4" }]);
    expect(result.description).toBe("- [ ] 4x Milk");
  });

  test("preserves checked state when incrementing", () => {
    const existing = "- [x] Milk";
    const result = mergeGroceryItemsIntoDescription(existing, [{ name: "Milk" }]);

    expect(result.description).toBe("- [x] 2x Milk");
  });

  test("skips duplicate when existing has non-count size note", () => {
    const existing = "- [ ] Oat Milk (2 gallons)";
    const result = mergeGroceryItemsIntoDescription(existing, [{ name: "Oat Milk" }]);

    expect(result.changed).toBe(false);
    expect(result.added).toHaveLength(0);
    expect(result.description).toBe(existing);
  });

  test("increments multiple existing items in one pass", () => {
    const existing = "- [ ] Milk\n- [ ] Apples";
    const result = mergeGroceryItemsIntoDescription(existing, [{ name: "Milk" }, { name: "Apples" }]);

    expect(result.changed).toBe(true);
    expect(result.added).toHaveLength(2);
    expect(result.description).toBe("- [ ] 2x Milk\n- [ ] 2x Apples");
  });

  test("preserves non-checkbox lines", () => {
    const existing = "Shopping list\n- [ ] Milk";
    const result = mergeGroceryItemsIntoDescription(existing, [{ name: "Bread" }]);

    expect(result.description).toBe("Shopping list\n- [ ] Milk\n- [ ] Bread");
  });
});

describe("formatGroceryCheckboxLine", () => {
  test("formats quantity line", () => {
    expect(formatGroceryCheckboxLine({ name: "Milk", quantity: "2" })).toBe("- [ ] 2x Milk");
  });
});

describe("parseGroceryDescription", () => {
  test("indexes entries by lowercase name", () => {
    const { entries } = parseGroceryDescription("- [ ] 2x Milk\n- [ ] Apples");
    expect(entries.get("milk")).toMatchObject({ name: "Milk", count: 2, lineIndex: 0 });
    expect(entries.get("apples")).toMatchObject({ name: "Apples", count: 1, lineIndex: 1 });
  });
});
