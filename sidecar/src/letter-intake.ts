import type { ModelSelection } from "@cursor/sdk";
import { createEphemeralAgent, disposeEphemeralAgent, sendPolishPrompt } from "./agent.ts";
import { accumulateAssistantText } from "./good-morning-feel.ts";
import { isTestExecutionMode } from "./execution-mode.ts";
import type { LetterFilingMetadata } from "./letter-filing.ts";
import {
  formatCatalogForPrompt,
  matchCatalogEntityByNameOrAlias,
  matchLinearProjectByName,
  matchOrganizationToLinearTeam,
  normalizeMatchText,
  type CatalogEntity,
  type LetterMatchCatalog,
  type LinearCatalogEntity,
} from "./letter-match-catalog.ts";
import type { LetterMatchSources } from "./vault-aliases.ts";

export type LetterProposalField = "assigned" | "received" | "organization";

export interface LetterFilingProposal {
  assigned: string;
  received: string;
  organization: string;
  organizationTeamId?: string;
  project: string;
  projectId?: string;
  note: string;
  missing: LetterProposalField[];
  raw: {
    addressee?: string;
    sender?: string;
    datesFound?: string[];
  };
}

export interface LetterIntakeInput {
  ocrText: string;
  filenameHints: {
    receivedDate?: string;
    organization?: string;
    subject?: string;
  };
  catalog: LetterMatchCatalog;
}

function stripJsonFence(text: string): string {
  let value = text.trim();
  value = value.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  return value;
}

function isNoiseLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length < 3) return true;
  if (/^[^\p{L}\p{N}]+$/u.test(trimmed)) return true;
  if (/^[\d\s<>°AL\-/]+$/i.test(trimmed)) return true;
  if (/^AL\s+\d+/i.test(trimmed)) return true;
  return false;
}

function meaningfulLines(text: string, limit = 20): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => !isNoiseLine(line))
    .slice(0, limit);
}

function extractRawFields(ocrText: string): LetterFilingProposal["raw"] {
  const lines = meaningfulLines(ocrText, 30);
  const addressee =
    lines.find((line) =>
      /^(?:[A-Z]{2,3}\s+)?[A-Z][A-Za-z]+(?:\s+(?:de|van|der)\s+[A-Z][A-Za-z]+|[A-Z][A-Za-z]+)$/u.test(
        line,
      ),
    ) ?? lines.find((line) => /^[A-Z]{2,3}\s+[A-Z]/u.test(line));

  const sender =
    lines.find((line) => /^Belastingdienst$/i.test(line)) ??
    lines.find((line) => /Gemeente/i.test(line)) ??
    lines.find((line) =>
      /(Belastingdienst|Gemeente|B\.?V\.?|B\.?V|GmbH|Inc\.|Ltd\.|N\.?V\.?)/i.test(line),
    );

  const datesFound = [
    ...ocrText.matchAll(/\b20\d{2}-\d{2}-\d{2}\b/g),
    ...ocrText.matchAll(/\b\d{1,2}-\d{2}-20\d{2}\b/g),
    ...ocrText.matchAll(
      /\b\d{1,2}\s+(?:januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december)\s+20\d{2}\b/gi,
    ),
  ].map((match) => match[0]);

  return {
    addressee: addressee?.trim(),
    sender: sender?.trim(),
    datesFound: [...new Set(datesFound)],
  };
}

function buildNoteSummary(ocrText: string, subjectHint?: string): string {
  if (subjectHint?.trim()) {
    return subjectHint.trim();
  }

  const subjectLine = meaningfulLines(ocrText).find((line) =>
    /dwangbevel|aanmaning|brief|factuur|invoice|assessment|heffingen|belasting/i.test(line),
  );
  if (subjectLine) {
    return subjectLine.slice(0, 240);
  }

  const sentence = meaningfulLines(ocrText, 8)
    .filter((line) => line.length > 20)
    .slice(0, 2)
    .join(" ");
  return sentence.slice(0, 240);
}

export function finalizeProposal(
  partial: Partial<LetterFilingProposal>,
  catalog: LetterMatchCatalog,
  raw: LetterFilingProposal["raw"],
): LetterFilingProposal {
  let assigned = partial.assigned?.trim() ?? "";
  if (!assigned && raw.addressee) {
    const match = matchCatalogEntityByNameOrAlias(raw.addressee, catalog.contacts);
    assigned = match?.name ?? "";
  }

  let organization = partial.organization?.trim() ?? "";
  let organizationTeamId = partial.organizationTeamId;
  if (organization) {
    const team = matchOrganizationToLinearTeam(organization, catalog);
    if (team) {
      organization = team.name;
      organizationTeamId = team.id;
    } else {
      organization = "";
      organizationTeamId = undefined;
    }
  }

  if (!organization && raw.sender) {
    const team = matchOrganizationToLinearTeam(raw.sender, catalog);
    if (team) {
      organization = team.name;
      organizationTeamId = team.id;
    }
  }

  const received = partial.received?.trim() ?? "";
  const note = partial.note?.trim() ?? "";
  const missing: LetterProposalField[] = [];
  if (!assigned) missing.push("assigned");
  if (!received) missing.push("received");
  if (!organization) missing.push("organization");

  return {
    assigned,
    received,
    organization,
    organizationTeamId,
    project: partial.project?.trim() ?? "",
    projectId: partial.projectId,
    note,
    missing,
    raw,
  };
}

export function buildHeuristicProposal(input: LetterIntakeInput): LetterFilingProposal {
  const raw = extractRawFields(input.ocrText);
  const received = input.filenameHints.receivedDate?.trim() ?? "";

  let organization = "";
  let organizationTeamId: string | undefined;
  const filenameOrg = input.filenameHints.organization?.trim() ?? "";
  if (filenameOrg) {
    const team = matchOrganizationToLinearTeam(filenameOrg, input.catalog);
    if (team) {
      organization = team.name;
      organizationTeamId = team.id;
    }
  }

  return finalizeProposal(
    {
      assigned: "",
      received,
      organization,
      organizationTeamId,
      note: buildNoteSummary(input.ocrText, input.filenameHints.subject),
    },
    input.catalog,
    raw,
  );
}

const INTAKE_PROMPT = `[Letter intake]
Read the OCR text from a scanned letter and propose filing metadata.

Rules:
1. Assigned: pick the best vault contact for the addressee. Check aliases before fuzzy guessing.
2. Received: prefer the filename date when provided; otherwise use OCR dates.
3. Organization: pick a Linear team for the sender. Vault organization aliases may map OCR sender text to a team name, but the organization field must always be an exact Linear team from the catalog. Never use a sender name that is not a listed Linear team.
4. Note: one English sentence summarizing what the letter is about. Ignore barcode noise.
5. Never invent contacts or teams not listed in the catalog.
6. Return empty strings for uncertain fields, including organization when no Linear team matches.

Return ONLY valid JSON:
{
  "assigned": "contact name or empty string",
  "received": "YYYY-MM-DD or empty string",
  "organization": "Linear team name or empty string",
  "organizationTeamId": "Linear team id or empty string",
  "note": "English summary",
  "raw": {
    "addressee": "OCR addressee string or empty string",
    "sender": "OCR sender string or empty string",
    "datesFound": ["date strings found in OCR"]
  }
}`;

function parseIntakeJson(text: string): Partial<LetterFilingProposal> {
  const parsed = JSON.parse(stripJsonFence(text)) as Partial<LetterFilingProposal> & {
    raw?: LetterFilingProposal["raw"];
  };

  return {
    assigned: typeof parsed.assigned === "string" ? parsed.assigned.trim() : "",
    received: typeof parsed.received === "string" ? parsed.received.trim() : "",
    organization: typeof parsed.organization === "string" ? parsed.organization.trim() : "",
    organizationTeamId:
      typeof parsed.organizationTeamId === "string" ? parsed.organizationTeamId.trim() : undefined,
    note: typeof parsed.note === "string" ? parsed.note.trim() : "",
    raw: parsed.raw,
  };
}

export async function resolveLetterProposalWithAgent(
  notesPath: string,
  input: LetterIntakeInput,
  model: ModelSelection,
): Promise<LetterFilingProposal> {
  const rawFallback = extractRawFields(input.ocrText);
  const prompt = `${INTAKE_PROMPT}

Filename hints:
${JSON.stringify(input.filenameHints, null, 2)}

Catalog:
${formatCatalogForPrompt(input.catalog)}

OCR text:
${input.ocrText.slice(0, 120_000)}`;

  const agent = await createEphemeralAgent(notesPath, model);
  try {
    const run = await sendPolishPrompt(agent, prompt, model);
    let accumulated = "";
    for await (const message of run.stream()) {
      if (message.type !== "assistant") continue;
      const chunk = message.message.content
        .filter((block): block is { type: "text"; text: string } => block.type === "text")
        .map((block) => block.text)
        .join("");
      accumulated = accumulateAssistantText(accumulated, chunk);
    }

    const result = await run.wait();
    const rawText = accumulated.trim() || result.result?.trim() || "";
    if (!rawText) {
      throw new Error("Letter intake returned empty text");
    }

    const parsed = parseIntakeJson(rawText);
    const raw = {
      addressee: parsed.raw?.addressee?.trim() || rawFallback.addressee,
      sender: parsed.raw?.sender?.trim() || rawFallback.sender,
      datesFound: parsed.raw?.datesFound?.length ? parsed.raw.datesFound : rawFallback.datesFound,
    };

    if (!parsed.received && input.filenameHints.receivedDate) {
      parsed.received = input.filenameHints.receivedDate;
    }

    return finalizeProposal(parsed, input.catalog, raw);
  } finally {
    await disposeEphemeralAgent(agent);
  }
}

export async function resolveLetterProposal(
  notesPath: string,
  input: LetterIntakeInput,
  options: { model?: ModelSelection } = {},
): Promise<LetterFilingProposal> {
  if (isTestExecutionMode()) {
    return buildHeuristicProposal(input);
  }
  if (!options.model) {
    throw new Error("Letter intake requires a model outside test execution mode");
  }

  try {
    return await resolveLetterProposalWithAgent(notesPath, input, options.model);
  } catch {
    return buildHeuristicProposal(input);
  }
}

export function buildLetterReviewResponse(proposal: LetterFilingProposal): string {
  const rows: string[] = [];

  if (proposal.organization) {
    rows.push(`| Organization | ${proposal.organization} |`);
  }
  if (proposal.received) {
    rows.push(`| Received | ${proposal.received} |`);
  }
  if (proposal.assigned) {
    rows.push(`| Assigned | ${proposal.assigned} |`);
  }
  if (proposal.project) {
    rows.push(`| Project | ${proposal.project.replace(/\|/g, "\\|")} |`);
  }
  if (proposal.note) {
    rows.push(`| Note | ${proposal.note.replace(/\|/g, "\\|")} |`);
  }

  const lines = ["I reviewed the letter and found this:", ""];

  if (rows.length > 0) {
    lines.push("| Field | Value |", "| --- | --- |", ...rows, "");
  }

  const missingMessages: string[] = [];
  if (proposal.missing.includes("assigned")) {
    missingMessages.push("I couldn't determine **Assigned**. Please tell me who this letter is for.");
  }
  if (proposal.missing.includes("received")) {
    missingMessages.push("I couldn't determine **Received**. Please tell me the received date.");
  }
  if (proposal.missing.includes("organization")) {
    const detected = proposal.raw.sender?.trim();
    if (detected) {
      missingMessages.push(
        `I saw **${detected}** on the letter, but it doesn't match any Linear team. Which team should this belong to?`,
      );
    } else {
      missingMessages.push(
        "I couldn't determine **Organization**. Please tell me which Linear team this letter belongs to.",
      );
    }
  }

  if (!proposal.project?.trim()) {
    missingMessages.push(
      "Which **Project** should this letter go under? Name a Linear project, or reply none to skip.",
    );
  }

  if (missingMessages.length > 0) {
    lines.push(...missingMessages);
  } else {
    lines.push("Reply to confirm or correct anything before I file it away.");
  }

  return lines.join("\n");
}

function findBestContactMention(text: string, contacts: CatalogEntity[]): CatalogEntity | null {
  const normalizedText = normalizeMatchText(text);
  let best: { entity: CatalogEntity; score: number } | null = null;

  for (const entity of contacts) {
    for (const candidate of [entity.name, ...entity.aliases]) {
      const normalizedCandidate = normalizeMatchText(candidate);
      if (!normalizedCandidate) continue;

      if (normalizedText.includes(normalizedCandidate)) {
        if (!best || normalizedCandidate.length > best.score) {
          best = { entity, score: normalizedCandidate.length };
        }
        continue;
      }

      for (const word of normalizedCandidate.split(" ")) {
        if (word.length < 3 || !normalizedText.includes(word)) continue;
        if (!best || word.length > best.score) {
          best = { entity, score: word.length };
        }
      }
    }
  }

  return best?.entity ?? null;
}

function findBestLinearTeamMention(
  text: string,
  teams: LinearCatalogEntity[],
): LinearCatalogEntity | null {
  const normalizedText = normalizeMatchText(text);
  let best: { team: LinearCatalogEntity; score: number } | null = null;

  for (const team of teams) {
    for (const candidate of [team.name, team.key].filter(Boolean) as string[]) {
      const normalizedCandidate = normalizeMatchText(candidate);
      if (!normalizedCandidate || !normalizedText.includes(normalizedCandidate)) continue;
      if (!best || normalizedCandidate.length > best.score) {
        best = { team, score: normalizedCandidate.length };
      }
    }
  }

  return best?.team ?? null;
}

function findBestLinearProjectMention(
  text: string,
  projects: LinearCatalogEntity[],
): LinearCatalogEntity | null {
  const normalizedText = normalizeMatchText(text);
  let best: { project: LinearCatalogEntity; score: number } | null = null;

  for (const project of projects) {
    const normalizedCandidate = normalizeMatchText(project.name);
    if (!normalizedCandidate || !normalizedText.includes(normalizedCandidate)) continue;
    if (!best || normalizedCandidate.length > best.score) {
      best = { project, score: normalizedCandidate.length };
    }
  }

  return best?.project ?? null;
}

export interface LetterConfirmUserCorrections {
  assigned?: string;
  organization?: string;
  organizationTeamId?: string;
  project?: string;
  projectId?: string;
  received?: string;
  skipProject?: boolean;
  unmatchedProjectReply?: string;
}

function isProjectOnlyConfirmTurn(proposal?: LetterFilingProposal): boolean {
  if (!proposal) return false;
  return proposal.missing.length === 0 && !proposal.project?.trim();
}

function isExplicitLetterConfirm(userText: string): boolean {
  return /^(?:yes|yeah|yep|ok(?:ay)?|confirm|file(?:\s+it)?|looks good|go ahead)\.?$/i.test(
    userText.trim(),
  );
}

export function canFileLetterProposal(
  proposal: LetterFilingProposal,
  userText: string,
  corrections: LetterConfirmUserCorrections,
): boolean {
  if (proposal.missing.length > 0) return false;
  if (corrections.unmatchedProjectReply) return false;
  if (proposal.project?.trim()) return true;
  if (corrections.skipProject) return true;
  if (corrections.project) return true;
  if (isExplicitLetterConfirm(userText)) return true;
  return false;
}

export function buildLetterProjectConfusionResponse(
  unmatched: string,
  catalog: LetterMatchCatalog,
): string {
  const lines = [
    `I didn't recognize **${unmatched.replace(/\|/g, "\\|")}** as a Linear project.`,
    "Please reply with the exact project name from Linear, or say **none** to skip the project.",
  ];

  const options = catalog.linearProjects.map((project) => project.name).slice(0, 8);
  if (options.length > 0) {
    lines.push("", "Linear projects I know about:");
    for (const name of options) {
      lines.push(`- ${name}`);
    }
  }

  return lines.join("\n");
}

function extractConfirmPhrase(text: string, pattern: RegExp): string | undefined {
  const match = text.match(pattern);
  return match?.[1]?.trim().replace(/\s+and\s*$/i, "").trim() || undefined;
}

export function parseLetterConfirmUserText(
  userText: string,
  catalog: LetterMatchCatalog,
  priorProposal?: LetterFilingProposal,
): LetterConfirmUserCorrections {
  const text = userText.trim();
  const corrections: LetterConfirmUserCorrections = {};

  if (isProjectOnlyConfirmTurn(priorProposal)) {
    if (isExplicitLetterConfirm(text)) {
      corrections.skipProject = true;
      corrections.project = "";
      return corrections;
    }

    if (
      /\b(?:no|skip)\s+project\b/i.test(text) ||
      /\bproject(?:\s+is)?:?\s*none\b/i.test(text) ||
      /^none$/i.test(text)
    ) {
      corrections.skipProject = true;
      corrections.project = "";
      return corrections;
    }

    const project =
      matchLinearProjectByName(text, catalog.linearProjects) ??
      findBestLinearProjectMention(text, catalog.linearProjects);
    if (project) {
      corrections.project = project.name;
      corrections.projectId = project.id;
      return corrections;
    }

    if (text) {
      corrections.unmatchedProjectReply = text;
    }
    return corrections;
  }

  if (
    /\b(?:no|skip)\s+project\b/i.test(text) ||
    /\bproject(?:\s+is)?:?\s*none\b/i.test(text)
  ) {
    corrections.skipProject = true;
    corrections.project = "";
  }

  const dateMatch = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (dateMatch?.[1]) {
    corrections.received = dateMatch[1];
  }

  const assignedPhrase =
    extractConfirmPhrase(text, /\bassigned(?:\s+is|:)\s+([^,]+?)(?:\s+and\b|[,.]|$)/i) ??
    extractConfirmPhrase(text, /\bassign(?:ed|ing)?\s+(?:it\s+)?to\s+([^,]+?)(?:\s+and\b|[,.]|$)/i) ??
    extractConfirmPhrase(text, /\bfor\s+([A-Za-z][A-Za-z.'-]+(?:\s+[A-Za-z.'-]+)*)/i);

  if (assignedPhrase) {
    const match = matchCatalogEntityByNameOrAlias(assignedPhrase, catalog.contacts);
    if (match) corrections.assigned = match.name;
  }

  const teamPhrase =
    extractConfirmPhrase(text, /\bteam\s+([^,]+?)(?:\s+and\b|[,.]|$)/i) ??
    extractConfirmPhrase(text, /\borganization(?:\s+is|:)\s+([^,]+?)(?:\s+and\b|[,.]|$)/i);

  if (teamPhrase) {
    const team = matchOrganizationToLinearTeam(teamPhrase, catalog);
    if (team) {
      corrections.organization = team.name;
      corrections.organizationTeamId = team.id;
    }
  }

  const projectPhrase =
    extractConfirmPhrase(text, /\b(?:the\s+)?project\s+([^,]+?)(?:\s+and\b|[,.]|$)/i) ??
    extractConfirmPhrase(text, /\bproject(?:\s+is|:)\s+([^,]+?)(?:\s+and\b|[,.]|$)/i);

  if (projectPhrase && !corrections.skipProject) {
    const project = matchLinearProjectByName(projectPhrase, catalog.linearProjects);
    if (project) {
      corrections.project = project.name;
      corrections.projectId = project.id;
    }
  }

  if (!corrections.assigned) {
    const contact = findBestContactMention(text, catalog.contacts);
    if (contact) corrections.assigned = contact.name;
  }

  if (!corrections.organization) {
    const team = findBestLinearTeamMention(text, catalog.linearTeams);
    if (team) {
      corrections.organization = team.name;
      corrections.organizationTeamId = team.id;
    }
  }

  if (!corrections.project && !corrections.skipProject) {
    const project = findBestLinearProjectMention(text, catalog.linearProjects);
    if (project) {
      corrections.project = project.name;
      corrections.projectId = project.id;
    }
  }

  return corrections;
}

function mergeConfirmCorrections(
  proposal: LetterFilingProposal,
  corrections: LetterConfirmUserCorrections,
): Partial<LetterFilingProposal> {
  return {
    assigned: corrections.assigned ?? proposal.assigned,
    received: corrections.received ?? proposal.received,
    organization: corrections.organization ?? proposal.organization,
    organizationTeamId: corrections.organizationTeamId ?? proposal.organizationTeamId,
    project: corrections.skipProject ? "" : (corrections.project ?? proposal.project),
    projectId: corrections.skipProject ? undefined : (corrections.projectId ?? proposal.projectId),
    note: proposal.note,
  };
}

export function applyLetterConfirmUserText(
  userText: string,
  proposal: LetterFilingProposal,
  catalog: LetterMatchCatalog,
): LetterFilingProposal {
  const corrections = parseLetterConfirmUserText(userText, catalog, proposal);
  return finalizeProposal(mergeConfirmCorrections(proposal, corrections), catalog, proposal.raw);
}

export function resolveLetterConfirmFromUserText(
  userText: string,
  proposal: LetterFilingProposal,
  catalog: LetterMatchCatalog,
): LetterConfirmAgentResult {
  const corrections = parseLetterConfirmUserText(userText, catalog, proposal);

  if (corrections.unmatchedProjectReply) {
    const unchanged = finalizeProposal(proposal, catalog, proposal.raw);
    return {
      action: "clarify",
      proposal: unchanged,
      response: buildLetterProjectConfusionResponse(corrections.unmatchedProjectReply, catalog),
    };
  }

  const parsedProposal = finalizeProposal(
    mergeConfirmCorrections(proposal, corrections),
    catalog,
    proposal.raw,
  );

  if (canFileLetterProposal(parsedProposal, userText, corrections)) {
    return {
      action: "file",
      metadata: proposalToMetadata(parsedProposal),
      proposal: parsedProposal,
    };
  }

  return {
    action: "clarify",
    proposal: parsedProposal,
    response: buildLetterReviewResponse(parsedProposal),
  };
}

export function proposalToMatchSources(proposal: LetterFilingProposal): LetterMatchSources {
  return {
    assigned: proposal.raw.addressee,
    organization: proposal.raw.sender,
    project: undefined,
  };
}

export interface LetterConfirmAgentResult {
  action: "file" | "clarify";
  metadata?: LetterFilingMetadata;
  proposal?: LetterFilingProposal;
  response?: string;
}

const CONFIRM_PROMPT = `[Letter filing confirmation]
Merge the user's confirmation message with the current letter proposal.

Rules:
1. Match Assigned to a vault contact (check aliases).
2. Match Organization to a Linear team only. Vault organization aliases may help map OCR text to a team, but never file under a name that is not a listed Linear team.
3. Match Project when the user names one (Linear projects). Accept "none" or "skip" to leave project empty.
4. Prefer explicit user corrections over the current proposal.
5. Received date: prefer user corrections, otherwise keep the proposal date.
6. Status defaults to Inbox unless the user specifies otherwise.
7. If assigned, received, or organization is still missing after applying the user's message, return action "clarify" with an updated proposal and a short response asking for the missing items.
8. Only return action "file" when assigned, received, and organization are all resolved.

Return ONLY valid JSON:
{
  "action": "file" | "clarify",
  "response": "assistant message when action is clarify, otherwise empty string",
  "metadata": {
    "assigned": "contact name",
    "creator": "sender person if known else empty string",
    "organization": "Linear team name",
    "date": "YYYY-MM-DD",
    "status": "Inbox | In Progress | On Hold | Archived",
    "project": "optional project or empty string",
    "note": "summary note"
  },
  "proposal": {
    "assigned": "",
    "received": "",
    "organization": "",
    "organizationTeamId": "",
    "project": "",
    "note": "",
    "missing": ["assigned" | "received" | "organization"],
    "raw": {
      "addressee": "",
      "sender": "",
      "datesFound": []
    }
  }
}`;

function parseConfirmJson(text: string): LetterConfirmAgentResult {
  const parsed = JSON.parse(stripJsonFence(text)) as LetterConfirmAgentResult & {
    metadata?: Partial<LetterFilingMetadata>;
    proposal?: Partial<LetterFilingProposal>;
  };

  const action = parsed.action === "file" ? "file" : "clarify";
  const metadata = parsed.metadata
    ? {
        assigned: parsed.metadata.assigned?.trim() ?? "",
        creator: parsed.metadata.creator?.trim() ?? "",
        organization: parsed.metadata.organization?.trim() ?? "",
        date: parsed.metadata.date?.trim() ?? "",
        status: parsed.metadata.status?.trim() || "Inbox",
        project: parsed.metadata.project?.trim() ?? "",
        note: parsed.metadata.note?.trim() ?? "",
      }
    : undefined;

  const proposal = parsed.proposal
    ? finalizeProposal(
        {
          assigned: parsed.proposal.assigned,
          received: parsed.proposal.received,
          organization: parsed.proposal.organization,
          organizationTeamId: parsed.proposal.organizationTeamId,
          project: parsed.proposal.project,
          projectId: parsed.proposal.projectId,
          note: parsed.proposal.note,
        },
        { contacts: [], organizations: [], projects: [], linearTeams: [], linearProjects: [] },
        parsed.proposal.raw ?? {},
      )
    : undefined;

  return {
    action,
    metadata,
    proposal,
    response: typeof parsed.response === "string" ? parsed.response.trim() : "",
  };
}

function heuristicConfirm(
  userText: string,
  proposal: LetterFilingProposal,
  catalog: LetterMatchCatalog,
): LetterConfirmAgentResult {
  return resolveLetterConfirmFromUserText(userText, proposal, catalog);
}

export async function resolveLetterConfirmWithAgent(
  notesPath: string,
  userText: string,
  proposal: LetterFilingProposal,
  catalog: LetterMatchCatalog,
  model: ModelSelection,
): Promise<LetterConfirmAgentResult> {
  const prompt = `${CONFIRM_PROMPT}

Current proposal:
${JSON.stringify(proposal, null, 2)}

Catalog:
${formatCatalogForPrompt(catalog)}

User message:
${userText.trim()}`;

  const agent = await createEphemeralAgent(notesPath, model);
  try {
    const run = await sendPolishPrompt(agent, prompt, model);
    let accumulated = "";
    for await (const message of run.stream()) {
      if (message.type !== "assistant") continue;
      const chunk = message.message.content
        .filter((block): block is { type: "text"; text: string } => block.type === "text")
        .map((block) => block.text)
        .join("");
      accumulated = accumulateAssistantText(accumulated, chunk);
    }

    const result = await run.wait();
    const rawText = accumulated.trim() || result.result?.trim() || "";
    if (!rawText) {
      throw new Error("Letter confirmation returned empty text");
    }

    const parsed = parseConfirmJson(rawText);
    if (parsed.proposal) {
      parsed.proposal = finalizeProposal(parsed.proposal, catalog, parsed.proposal.raw);
    }

    if (parsed.action === "file" && parsed.metadata) {
      if (!parsed.metadata.date) parsed.metadata.date = proposal.received;
      if (!parsed.metadata.note) parsed.metadata.note = proposal.note;
      return parsed;
    }

    if (parsed.action === "clarify") {
      const updated = parsed.proposal ?? finalizeProposal(proposal, catalog, proposal.raw);
      return {
        action: "clarify",
        proposal: updated,
        response: parsed.response || buildLetterReviewResponse(updated),
      };
    }

    return parsed;
  } finally {
    await disposeEphemeralAgent(agent);
  }
}

export async function resolveLetterConfirm(
  notesPath: string,
  userText: string,
  proposal: LetterFilingProposal,
  catalog: LetterMatchCatalog,
  options: { model?: ModelSelection } = {},
): Promise<LetterConfirmAgentResult> {
  const deterministic = resolveLetterConfirmFromUserText(userText, proposal, catalog);
  if (deterministic.action === "file") {
    return deterministic;
  }

  const corrections = parseLetterConfirmUserText(userText, catalog, proposal);
  if (corrections.unmatchedProjectReply) {
    return deterministic;
  }

  if (isTestExecutionMode()) {
    return deterministic;
  }

  if (!options.model) {
    throw new Error("Letter confirmation requires a model outside test execution mode");
  }

  try {
    const agentResult = await resolveLetterConfirmWithAgent(
      notesPath,
      userText,
      deterministic.proposal ?? proposal,
      catalog,
      options.model,
    );

    if (agentResult.action === "file" && agentResult.metadata) {
      return agentResult;
    }

    const merged = resolveLetterConfirmFromUserText(
      userText,
      agentResult.proposal ?? deterministic.proposal ?? proposal,
      catalog,
    );
    if (merged.action === "file") {
      return merged;
    }

    const mergedCorrections = parseLetterConfirmUserText(
      userText,
      catalog,
      agentResult.proposal ?? deterministic.proposal ?? proposal,
    );
    if (mergedCorrections.unmatchedProjectReply) {
      return merged;
    }

    return {
      action: "clarify",
      proposal: merged.proposal ?? deterministic.proposal ?? proposal,
      response:
        agentResult.response?.trim() ||
        merged.response ||
        buildLetterReviewResponse(merged.proposal ?? proposal),
    };
  } catch {
    return deterministic;
  }
}

export function proposalToMetadata(proposal: LetterFilingProposal): LetterFilingMetadata {
  return {
    assigned: proposal.assigned,
    creator: proposal.raw.sender ?? "",
    organization: proposal.organization,
    date: proposal.received,
    status: "Inbox",
    project: proposal.project,
    note: proposal.note,
  };
}
