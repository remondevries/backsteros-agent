import { describe, expect, test } from "bun:test";
import {
  formatGroceryItemLabel,
  heuristicGroceryItemsExtract,
  parseGroceryItemsOutput,
} from "./grocery-items.ts";

describe("grocery-items extract", () => {
  test("handles conversational corrections and filler", () => {
    const message = "Milk apples and thats it oh wait i want two milks instead of 1";
    expect(heuristicGroceryItemsExtract(message)).toEqual({
      items: [
        { name: "Milk", quantity: "2" },
        { name: "Apples" },
      ],
    });
  });

  test("formats checkbox labels with count prefix", () => {
    expect(formatGroceryItemLabel({ name: "Milk", quantity: "2" })).toBe("2x Milk");
    expect(formatGroceryItemLabel({ name: "Apples" })).toBe("Apples");
    expect(formatGroceryItemLabel({ name: "Oat Milk", quantity: "2 gallons" })).toBe(
      "Oat Milk (2 gallons)",
    );
  });

  test("parseGroceryItemsOutput dedupes and title-cases", () => {
    expect(
      parseGroceryItemsOutput({
        items: [
          { name: "milk", quantity: "1" },
          { name: "Milk", quantity: "2" },
          { name: "apples" },
          { name: "thats it oh wait", quantity: "" },
        ],
      }),
    ).toEqual({
      items: [
        { name: "Milk", quantity: "2" },
        { name: "Apples" },
      ],
    });
  });

  test("heuristic grocery extract still splits simple lists", () => {
    expect(heuristicGroceryItemsExtract("milk, eggs and bread")).toEqual({
      items: [{ name: "Milk" }, { name: "Eggs" }, { name: "Bread" }],
    });
  });
});
