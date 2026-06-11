import { describe, expect, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getLetterFilingOptions } from "./letter-options.ts";

describe("getLetterFilingOptions", () => {
  test("lists contacts, organizations, and projects from the vault", () => {
    const notesPath = join(import.meta.dir, ".tmp-letter-options");
    mkdirSync(join(notesPath, "Contacts"), { recursive: true });
    mkdirSync(join(notesPath, "Organizations"), { recursive: true });
    mkdirSync(join(notesPath, "Projects", "Taxes"), { recursive: true });

    writeFileSync(join(notesPath, "Contacts", "Jane Doe.md"), "# Jane\n");
    writeFileSync(join(notesPath, "Contacts", "_index.md"), "# Index\n");
    writeFileSync(join(notesPath, "Organizations", "Acme Corp.md"), "# Acme\n");
    writeFileSync(join(notesPath, "Projects", "BacksterOS Agent.md"), "# Project\n");

    const options = getLetterFilingOptions(notesPath);

    expect(options.contacts).toEqual(["Jane Doe"]);
    expect(options.organizations).toEqual(["Acme Corp"]);
    expect(options.projects).toEqual(["Taxes"]);
    expect(options.statuses).toContain("Archive");
  });
});
