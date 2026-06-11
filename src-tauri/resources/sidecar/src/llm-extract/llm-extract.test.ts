import { describe, expect, test } from "bun:test";
import { listLlmExtractTasks, runLlmExtract } from "./index.ts";
import {
  heuristicGroceryItemsExtract,
  parseGroceryItemsOutput,
} from "./tasks/grocery-items.ts";
import { getLlmExtractTask } from "./registry.ts";

describe("llm-extract", () => {
  test("lists registered tasks", () => {
    const tasks = listLlmExtractTasks();
    expect(tasks.some((task) => task.id === "grocery-items")).toBe(true);
  });

  test("heuristic grocery extract splits combined phrases", () => {
    expect(heuristicGroceryItemsExtract("milk, eggs and bread")).toEqual({
      items: [{ name: "Milk" }, { name: "Eggs" }, { name: "Bread" }],
    });
    expect(heuristicGroceryItemsExtract("oat milk")).toEqual({
      items: [{ name: "Oat Milk" }],
    });
  });

  test("parseGroceryItemsOutput normalizes model output", () => {
    expect(
      parseGroceryItemsOutput({
        items: [
          { name: "  oat milk ", quantity: " 2 gallons ", note: "" },
          { name: "" },
        ],
      }),
    ).toEqual({
      items: [{ name: "Oat Milk", quantity: "2 gallons" }],
    });
  });

  test("runLlmExtract uses heuristic in test execution mode", async () => {
    const previous = process.env.BACKSTER_EXECUTION_MODE;
    process.env.BACKSTER_EXECUTION_MODE = "test";
    try {
      const result = await runLlmExtract("grocery-items", "bananas and apples");
      expect(result).toEqual({
        items: [{ name: "Bananas" }, { name: "Apples" }],
      });
    } finally {
      if (previous == null) {
        delete process.env.BACKSTER_EXECUTION_MODE;
      } else {
        process.env.BACKSTER_EXECUTION_MODE = previous;
      }
    }
  });

  test("getLlmExtractTask returns grocery task definition", () => {
    const task = getLlmExtractTask("grocery-items");
    expect(task?.id).toBe("grocery-items");
    expect(task?.heuristicExtract).toBeTypeOf("function");
  });
});
