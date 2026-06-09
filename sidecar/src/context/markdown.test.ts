import { describe, expect, test } from "bun:test";
import { compileMarkdownContext, filterMarkdownContextLines } from "./markdown.ts";

describe("compileMarkdownContext", () => {
  test("strips heading and boilerplate lines", () => {
    const content = `# Agent

BacksterOS Agent reads this file on every turn.
Edit the fields below to shape how Backster responds.

- Name: Backster
`;
    expect(filterMarkdownContextLines(content)).toEqual(["- Name: Backster"]);
    expect(compileMarkdownContext(content, { header: "[Agent]" })).toBe(
      "[Agent]\n- Name: Backster",
    );
  });
});
