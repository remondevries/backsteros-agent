import type { ModelSelection } from "@cursor/sdk";
import { PDFParse } from "pdf-parse";
import { createEphemeralAgent, disposeEphemeralAgent, sendPolishPrompt } from "./agent.ts";
import { isTestExecutionMode } from "./execution-mode.ts";
import {
  fileLetterInVault,
  isPdfAttachment,
  readPdfBufferFromVault,
  resolveLetterStatus,
  type LetterFilingMetadata,
  type LetterFilingResult,
} from "./letter-filing.ts";
import { accumulateAssistantText } from "./good-morning-feel.ts";
import type { AttachmentInput, MessageAttachmentMeta } from "./types.ts";

export const LETTER_ACTION_ID = "letter";

export const LETTER_CONFIRM_ACTION_ID = "letter-confirm";

export const LETTER_MESSAGE = "File this letter";

export const LETTER_ASK_AGENT_PROMPT = `[Letter intake — confirmation setup]
You analyzed a PDF letter and shared what you found. The user will confirm or correct the metadata.

Do NOT file anything yet. Wait for their confirmation message.`;

export interface LetterAnalysis {
  creator: string;
  organization: string;
  receivedDate: string;
  subject: string;
  summary: string;
}

export interface PendingLetter {
  stagedPdfPath: string;
  originalName: string;
  analysis: LetterAnalysis;
}

const pendingLetterBySession = new Map<string, PendingLetter>();

export function setPendingLetter(sessionId: string, pending: PendingLetter): void {
  pendingLetterBySession.set(sessionId, pending);
}

export function takePendingLetter(sessionId: string): PendingLetter | null {
  const pending = pendingLetterBySession.get(sessionId) ?? null;
  pendingLetterBySession.delete(sessionId);
  return pending;
}

export function peekPendingLetter(sessionId: string): PendingLetter | null {
  return pendingLetterBySession.get(sessionId) ?? null;
}

export function isLetterQuickAction(quickActionId?: string): boolean {
  return quickActionId === LETTER_ACTION_ID;
}

export function isLetterConfirmQuickAction(quickActionId?: string): boolean {
  return quickActionId === LETTER_CONFIRM_ACTION_ID;
}

export function findPdfAttachmentMeta(
  attachmentMeta: MessageAttachmentMeta[],
  attachments: AttachmentInput[],
): { vaultPath: string; name: string } | null {
  for (let index = 0; index < attachmentMeta.length; index += 1) {
    const meta = attachmentMeta[index];
    const input = attachments[index];
    const name = meta.name || input?.name || "letter.pdf";
    const mimeType = meta.mimeType || input?.mimeType || "application/octet-stream";
    if (!isPdfAttachment(name, mimeType)) continue;
    if (meta.vaultPath) {
      return { vaultPath: meta.vaultPath, name };
    }
  }

  for (const meta of attachmentMeta) {
    if (meta.vaultPath && isPdfAttachment(meta.name, meta.mimeType)) {
      return { vaultPath: meta.vaultPath, name: meta.name };
    }
  }

  return null;
}

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text.trim();
  } finally {
    await parser.destroy();
  }
}

function stripJsonFence(text: string): string {
  let value = text.trim();
  value = value.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  return value;
}

function parseLetterAnalysisJson(text: string): LetterAnalysis {
  const parsed = JSON.parse(stripJsonFence(text)) as Partial<LetterAnalysis>;
  return {
    creator: typeof parsed.creator === "string" ? parsed.creator.trim() : "",
    organization: typeof parsed.organization === "string" ? parsed.organization.trim() : "",
    receivedDate:
      typeof parsed.receivedDate === "string" ? parsed.receivedDate.trim() : "",
    subject: typeof parsed.subject === "string" ? parsed.subject.trim() : "",
    summary: typeof parsed.summary === "string" ? parsed.summary.trim() : "",
  };
}

function parseLetterFilingJson(text: string): LetterFilingMetadata {
  const parsed = JSON.parse(stripJsonFence(text)) as Partial<LetterFilingMetadata>;
  return {
    creator: typeof parsed.creator === "string" ? parsed.creator.trim() : "",
    organization: typeof parsed.organization === "string" ? parsed.organization.trim() : "",
    date: typeof parsed.date === "string" ? parsed.date.trim() : "",
    status: resolveLetterStatus(typeof parsed.status === "string" ? parsed.status : undefined),
    project: typeof parsed.project === "string" ? parsed.project.trim() : "",
    note: typeof parsed.note === "string" ? parsed.note.trim() : "",
  };
}

const ANALYZE_LETTER_PROMPT = `[Letter analysis]
Read the PDF letter text below and extract metadata for filing in an Obsidian vault.

Return ONLY valid JSON:
{
  "creator": "sender person name or empty string",
  "organization": "sender organization or empty string",
  "receivedDate": "YYYY-MM-DD when the letter was received/postmarked, or empty string",
  "subject": "short subject line for filing or empty string",
  "summary": "one plain sentence describing what this letter is about"
}

Use empty strings when uncertain. Prefer dates found on the letter; do not invent details.`;

const CONFIRM_LETTER_PROMPT = `[Letter filing confirmation]
Merge the user's confirmation message with the draft letter analysis.

Return ONLY valid JSON:
{
  "creator": "sender person name",
  "organization": "sender organization",
  "date": "YYYY-MM-DD received date",
  "status": "Inbox | In Progress | On Hold | Archived",
  "project": "optional linked project or empty string",
  "note": "optional short note for the letter record or empty string"
}

Prefer explicit corrections from the user over the draft when they conflict.
Default status to Inbox when the user does not specify one.`;

export function buildLetterAnalysisResponse(analysis: LetterAnalysis): string {
  const lines = [
    "Here's what I found in the letter:",
    "",
    `- **From:** ${analysis.creator || "Unknown sender"}`,
    `- **Organization:** ${analysis.organization || "Unknown organization"}`,
    `- **Received:** ${analysis.receivedDate || "Unknown date"}`,
  ];

  if (analysis.subject) {
    lines.push(`- **Subject:** ${analysis.subject}`);
  }
  if (analysis.summary) {
    lines.push("", analysis.summary);
  }

  lines.push(
    "",
    "How would you like to file this? Reply with any corrections — for example: \"This is from Acme Corp, received on 2026-03-01, status Inbox.\"",
  );

  return lines.join("\n");
}

export function buildLetterFiledResponse(result: LetterFilingResult, metadata: LetterFilingMetadata): string {
  const parts = [
    `Filed the letter in your vault.`,
    "",
    `- PDF: \`${result.pdfPath}\``,
    `- Note: \`${result.wrapperPath}\``,
    `- From: ${metadata.creator || "Unknown"}`,
    `- Organization: ${metadata.organization || "Unknown"}`,
    `- Received: ${metadata.date || "Unknown"}`,
    `- Status: ${resolveLetterStatus(metadata.status)}`,
  ];

  if (metadata.project) {
    parts.push(`- Project: ${metadata.project}`);
  }

  return parts.join("\n");
}

function heuristicLetterAnalysis(text: string): LetterAnalysis {
  const dateMatch = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  const receivedDate = dateMatch?.[1] ?? "";
  const firstLines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8);
  const creator = firstLines[0] ?? "";
  const organization = firstLines.find((line) => /(B\.?V\.?|B\.?V|GmbH|Inc\.|Ltd\.|N\.?V\.?)/i.test(line)) ?? "";

  return {
    creator,
    organization,
    receivedDate,
    subject: "",
    summary: firstLines.slice(0, 3).join(" ").slice(0, 240),
  };
}

function heuristicLetterFiling(userText: string, analysis: LetterAnalysis): LetterFilingMetadata {
  const dateMatch = userText.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  const statusMatch = userText.match(/\bstatus(?: should be|:)?\s+([^,.]+)/i);
  const fromMatch = userText.match(/\bfrom\s+([^,.]+)/i);
  const receivedMatch = userText.match(/\breceived(?: on|:)?\s+([^,.]+)/i);

  return {
    creator: fromMatch?.[1]?.trim() || analysis.creator,
    organization: analysis.organization,
    date:
      dateMatch?.[1] ??
      ((receivedMatch?.[1]?.trim().match(/\b20\d{2}-\d{2}-\d{2}\b/)?.[0] ?? "") ||
        analysis.receivedDate),
    status: resolveLetterStatus(statusMatch?.[1]),
    project: "",
    note: "",
  };
}

async function analyzeLetterWithAgent(
  notesPath: string,
  pdfText: string,
  model: ModelSelection,
): Promise<LetterAnalysis> {
  const prompt = `${ANALYZE_LETTER_PROMPT}\n\nPDF text:\n${pdfText.slice(0, 120_000)}`;
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
    const raw = accumulated.trim() || result.result?.trim() || "";
    if (!raw) {
      throw new Error("Letter analysis returned empty text");
    }

    return parseLetterAnalysisJson(raw);
  } finally {
    await disposeEphemeralAgent(agent);
  }
}

async function parseLetterConfirmationWithAgent(
  notesPath: string,
  userText: string,
  analysis: LetterAnalysis,
  model: ModelSelection,
): Promise<LetterFilingMetadata> {
  const prompt = `${CONFIRM_LETTER_PROMPT}

Draft analysis:
${JSON.stringify(analysis, null, 2)}

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
    const raw = accumulated.trim() || result.result?.trim() || "";
    if (!raw) {
      throw new Error("Letter confirmation parsing returned empty text");
    }

    return parseLetterFilingJson(raw);
  } finally {
    await disposeEphemeralAgent(agent);
  }
}

export interface LetterInitialFlowResult {
  analysis: LetterAnalysis;
  response: string;
  pending: PendingLetter;
}

export async function runLetterInitialFlow(
  notesPath: string,
  sessionId: string,
  pdf: { vaultPath: string; name: string },
  options: { model?: ModelSelection } = {},
): Promise<LetterInitialFlowResult> {
  const buffer = readPdfBufferFromVault(notesPath, pdf.vaultPath);
  const pdfText = await extractPdfText(buffer);

  if (!pdfText) {
    throw new Error(
      "Could not extract text from the PDF. If this is a scanned image, tell me who it's from, the organization, and the received date.",
    );
  }

  let analysis: LetterAnalysis;
  if (isTestExecutionMode()) {
    analysis = heuristicLetterAnalysis(pdfText);
  } else if (!options.model) {
    throw new Error("Letter analysis requires a model outside test execution mode");
  } else {
    try {
      analysis = await analyzeLetterWithAgent(notesPath, pdfText, options.model);
    } catch {
      analysis = heuristicLetterAnalysis(pdfText);
    }
  }

  const pending: PendingLetter = {
    stagedPdfPath: pdf.vaultPath,
    originalName: pdf.name,
    analysis,
  };
  setPendingLetter(sessionId, pending);

  return {
    analysis,
    pending,
    response: buildLetterAnalysisResponse(analysis),
  };
}

export interface LetterConfirmFlowResult {
  filing: LetterFilingResult;
  metadata: LetterFilingMetadata;
  response: string;
}

export async function runLetterConfirmFlow(
  notesPath: string,
  sessionId: string,
  userText: string,
  options: { model?: ModelSelection } = {},
): Promise<LetterConfirmFlowResult> {
  const pending = takePendingLetter(sessionId);
  if (!pending) {
    throw new Error("No pending letter to file. Attach a PDF and run /letter first.");
  }

  if (!userText.trim()) {
    throw new Error("Tell me how to file the letter before saving it.");
  }

  let metadata: LetterFilingMetadata;
  if (isTestExecutionMode()) {
    metadata = heuristicLetterFiling(userText, pending.analysis);
  } else if (!options.model) {
    throw new Error("Letter filing requires a model outside test execution mode");
  } else {
    try {
      metadata = await parseLetterConfirmationWithAgent(
        notesPath,
        userText,
        pending.analysis,
        options.model,
      );
    } catch {
      metadata = heuristicLetterFiling(userText, pending.analysis);
    }
  }

  if (!metadata.date) {
    metadata.date = pending.analysis.receivedDate;
  }
  if (!metadata.creator) {
    metadata.creator = pending.analysis.creator;
  }
  if (!metadata.organization) {
    metadata.organization = pending.analysis.organization;
  }

  const filing = fileLetterInVault(
    notesPath,
    pending.stagedPdfPath,
    pending.originalName,
    metadata,
  );

  return {
    filing,
    metadata,
    response: buildLetterFiledResponse(filing, metadata),
  };
}
