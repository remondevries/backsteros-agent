import { describe, expect, test } from "bun:test";
import {
  applyLetterConfirmUserText,
  buildHeuristicProposal,
  buildLetterProjectConfusionResponse,
  buildLetterReviewResponse,
  finalizeProposal,
  parseLetterConfirmUserText,
  resolveLetterConfirmFromUserText,
} from "./letter-intake.ts";
import type { LetterMatchCatalog } from "./letter-match-catalog.ts";

const emptyCatalog: LetterMatchCatalog = {
  contacts: [{ name: "Remon de Vries", path: "Contacts/Remon de Vries.md", aliases: ["RNA DE VRIES"] }],
  organizations: [],
  projects: [],
  linearTeams: [{ id: "team-1", name: "Backster", key: "BOS" }],
  linearProjects: [],
};

const lemoCatalog: LetterMatchCatalog = {
  contacts: [{ name: "Remon de Vries", path: "Contacts/Remon de Vries.md", aliases: [] }],
  organizations: [],
  projects: [],
  linearTeams: [{ id: "team-lemo", name: "Lemo-Design", key: "LD" }],
  linearProjects: [{ id: "proj-lemo", name: "lemo-design.com" }],
};

describe("parseLetterConfirmUserText", () => {
  test("parses conversational assign, team, and project reply", () => {
    const userText =
      "Lets assign it to Remon and add it to team Lemo-Design and the project lemo-design.com";
    const corrections = parseLetterConfirmUserText(userText, lemoCatalog);

    expect(corrections.assigned).toBe("Remon de Vries");
    expect(corrections.organization).toBe("Lemo-Design");
    expect(corrections.project).toBe("lemo-design.com");
  });

  test("files when required fields are resolved from user reply", () => {
    const proposal = buildHeuristicProposal({
      ocrText: "Belastingdienst\nRNA DE VRIES",
      filenameHints: {
        receivedDate: "2025-06-21",
        organization: "Belastingdienst",
        subject: "Dwangbevel",
      },
      catalog: lemoCatalog,
    });

    const merged = applyLetterConfirmUserText(
      "Lets assign it to Remon and add it to team Lemo-Design and the project lemo-design.com",
      proposal,
      lemoCatalog,
    );

    expect(merged.missing).toEqual([]);
    expect(merged.assigned).toBe("Remon de Vries");
    expect(merged.organization).toBe("Lemo-Design");
    expect(merged.project).toBe("lemo-design.com");
  });

  test("parses bare project reply when only project is missing", () => {
    const priorProposal = finalizeProposal(
      {
        assigned: "Remon de Vries",
        received: "2025-06-21",
        organization: "Lemo-Design",
        organizationTeamId: "team-lemo",
        note: "Dwangbevel",
      },
      lemoCatalog,
      { sender: "Belastingdienst" },
    );

    const result = resolveLetterConfirmFromUserText("lemo-design.com", priorProposal, lemoCatalog);

    expect(result.action).toBe("file");
    expect(result.proposal?.project).toBe("lemo-design.com");
  });

  test("explains confusion for unrecognized bare project reply", () => {
    const priorProposal = finalizeProposal(
      {
        assigned: "Remon de Vries",
        received: "2025-06-21",
        organization: "Lemo-Design",
        organizationTeamId: "team-lemo",
        note: "Dwangbevel",
      },
      lemoCatalog,
      { sender: "Belastingdienst" },
    );

    const result = resolveLetterConfirmFromUserText("unknown-project", priorProposal, lemoCatalog);

    expect(result.action).toBe("clarify");
    expect(result.response).toContain("didn't recognize **unknown-project**");
    expect(result.response).toContain("lemo-design.com");
  });

  test("allows explicit confirm without project", () => {
    const priorProposal = finalizeProposal(
      {
        assigned: "Remon de Vries",
        received: "2025-06-21",
        organization: "Lemo-Design",
        organizationTeamId: "team-lemo",
        note: "Dwangbevel",
      },
      lemoCatalog,
      { sender: "Belastingdienst" },
    );

    const result = resolveLetterConfirmFromUserText("yes", priorProposal, lemoCatalog);

    expect(result.action).toBe("file");
    expect(result.proposal?.project).toBe("");
  });
});

describe("buildHeuristicProposal", () => {
  test("prefers filename date over OCR dates", () => {
    const proposal = buildHeuristicProposal({
      ocrText: "Dagtekening 11-10-2025\nBelastingdienst\nRNA DE VRIES",
      filenameHints: {
        receivedDate: "2025-06-21",
        organization: "Belastingdienst",
        subject: "Dwangbevel",
      },
      catalog: emptyCatalog,
    });

    expect(proposal.received).toBe("2025-06-21");
    expect(proposal.note).toBe("Dwangbevel");
    expect(proposal.organization).toBe("");
    expect(proposal.missing).toContain("organization");
  });

  test("matches organization only to Linear teams", () => {
    const proposal = buildHeuristicProposal({
      ocrText: "Backster\nRNA DE VRIES",
      filenameHints: { receivedDate: "2025-06-21", organization: "Backster" },
      catalog: emptyCatalog,
    });

    expect(proposal.organization).toBe("Backster");
    expect(proposal.organizationTeamId).toBe("team-1");
  });

  test("matches assigned contact via alias", () => {
    const proposal = finalizeProposal(
      { assigned: "", received: "2025-06-21", organization: "", note: "Test" },
      emptyCatalog,
      { addressee: "RNA DE VRIES", sender: "Belastingdienst" },
    );

    expect(proposal.assigned).toBe("Remon de Vries");
  });
});

describe("buildLetterReviewResponse", () => {
  test("omits missing fields and asks for clarification", () => {
    const response = buildLetterReviewResponse({
      assigned: "",
      received: "2025-06-21",
      organization: "",
      project: "",
      note: "Tax notice",
      missing: ["assigned", "organization"],
      raw: { sender: "Belastingdienst" },
    });

    expect(response).toContain("| Received | 2025-06-21 |");
    expect(response).not.toContain("| Organization |");
    expect(response).not.toContain("| Assigned |");
    expect(response).toContain("couldn't determine **Assigned**");
    expect(response).toContain("doesn't match any Linear team");
    expect(response).toContain("Which **Project**");
  });
});
