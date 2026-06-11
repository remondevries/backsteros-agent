import type { ModelSelection } from "@cursor/sdk";
import { join } from "node:path";
import { isTestExecutionMode } from "./execution-mode.ts";
import {
  fileLetterInVault,
  isPdfAttachment,
  readPdfBufferFromVault,
  resolveLetterStatus,
  type LetterFilingMetadata,
  type LetterFilingResult,
} from "./letter-filing.ts";
import {
  buildLetterReviewResponse,
  finalizeProposal,
  proposalToMatchSources,
  proposalToMetadata,
  resolveLetterConfirm,
  resolveLetterProposal,
  type LetterFilingProposal,
} from "./letter-intake.ts";
import { buildLetterMatchCatalog, matchOrganizationToLinearTeam, type LetterMatchCatalog } from "./letter-match-catalog.ts";
import { extractPdfText } from "./lookup-pdf-text.ts";
import type { AttachmentInput, MessageAttachmentMeta } from "./types.ts";
import { buildUpdateConfirmationToken } from "./update-confirmation.ts";
import { buildVaultNoteLinkToken } from "./inline-link-tokens.ts";
import { recordLearnedAliases, type LetterMatchSources } from "./vault-aliases.ts";

export const LETTER_ACTION_ID = "letter";

export const LETTER_CONFIRM_ACTION_ID = "letter-confirm";

export const LETTER_MESSAGE = "File this letter";

export const LETTER_FILED_CONFIRMATION_MESSAGE = "Okay, I added it to your letters.";

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
  ocrText: string;
  proposal: LetterFilingProposal;
  catalog: LetterMatchCatalog;
  matchSources: LetterMatchSources;
}

const pendingLetterBySession = new Map<string, PendingLetter>();

export function setPendingLetter(sessionId: string, pending: PendingLetter): void {
  pendingLetterBySession.set(sessionId, pending);
}

export function clearPendingLetter(sessionId: string): void {
  pendingLetterBySession.delete(sessionId);
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

export function parseLetterFilenameHints(name: string): {
  receivedDate?: string;
  organization?: string;
  subject?: string;
} {
  const base = name.replace(/\.pdf$/i, "").trim();
  const threePart = base.match(/^(\d{4}-\d{2}-\d{2})\s*-\s*(.+?)\s*-\s*(.+)$/);
  if (threePart) {
    return {
      receivedDate: threePart[1],
      organization: threePart[2].trim(),
      subject: threePart[3].trim(),
    };
  }

  const twoPart = base.match(/^(\d{4}-\d{2}-\d{2})\s*-\s*(.+)$/);
  if (twoPart) {
    return {
      receivedDate: twoPart[1],
      organization: twoPart[2].trim(),
    };
  }

  return {};
}

export const LETTER_FILING_PAYLOAD_KIND = "letter_filing";

export interface LetterFilingPayload {
  kind: typeof LETTER_FILING_PAYLOAD_KIND;
  assigned: string;
  status: string;
  received: string;
  organization: string;
  project: string;
  note: string;
}

export function serializeLetterFilingPayload(payload: LetterFilingPayload): string {
  return JSON.stringify(payload);
}

export function parseLetterFilingPayload(text: string): LetterFilingPayload | null {
  try {
    const parsed = JSON.parse(text.trim()) as Partial<LetterFilingPayload>;
    if (parsed.kind !== LETTER_FILING_PAYLOAD_KIND) return null;
    return {
      kind: LETTER_FILING_PAYLOAD_KIND,
      assigned: typeof parsed.assigned === "string" ? parsed.assigned.trim() : "",
      status: typeof parsed.status === "string" ? parsed.status.trim() : "Inbox",
      received: typeof parsed.received === "string" ? parsed.received.trim() : "",
      organization: typeof parsed.organization === "string" ? parsed.organization.trim() : "",
      project: typeof parsed.project === "string" ? parsed.project.trim() : "",
      note: typeof parsed.note === "string" ? parsed.note.trim() : "",
    };
  } catch {
    return null;
  }
}

export function letterFilingPayloadToMetadata(
  payload: LetterFilingPayload,
  proposal: LetterFilingProposal,
): LetterFilingMetadata {
  return {
    assigned: payload.assigned,
    creator: proposal.raw.sender ?? "",
    organization: payload.organization || proposal.organization,
    date: payload.received || proposal.received,
    status: resolveLetterStatus(payload.status),
    project: payload.project,
    note: payload.note || proposal.note,
  };
}

export function buildLetterAnalysisResponse(proposal: LetterFilingProposal): string {
  return buildLetterReviewResponse(proposal);
}

export function buildLetterFiledResponse(
  result: LetterFilingResult,
  _metadata: LetterFilingMetadata,
): string {
  const linkToken = buildVaultNoteLinkToken("view letter note", result.wrapperPath);
  const message = linkToken
    ? `${LETTER_FILED_CONFIRMATION_MESSAGE}\n${linkToken}`
    : LETTER_FILED_CONFIRMATION_MESSAGE;

  return buildUpdateConfirmationToken("letter", "Letters", message);
}

export function ensureLetterConfirmResponse(
  response: string | undefined,
  proposal: LetterFilingProposal,
): string {
  const trimmed = response?.trim();
  if (trimmed) return trimmed;
  return buildLetterReviewResponse(proposal);
}

function proposalFromLegacyAnalysis(analysis: LetterAnalysis): LetterFilingProposal {
  return {
    assigned: analysis.creator,
    received: analysis.receivedDate,
    organization: analysis.organization,
    project: "",
    note: analysis.summary || analysis.subject,
    missing: [],
    raw: {
      addressee: analysis.creator,
      sender: analysis.organization,
    },
  };
}

export interface LetterInitialFlowResult {
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
  const pdfFilePath = join(notesPath, pdf.vaultPath);
  const ocrText = await extractPdfText(buffer, { filePath: pdfFilePath });

  if (!ocrText) {
    throw new Error(
      "Could not extract text from the PDF. If this is a scanned image, tell me who it's from, the organization, and the received date.",
    );
  }

  const catalog = await buildLetterMatchCatalog(notesPath);
  const filenameHints = parseLetterFilenameHints(pdf.name);
  const proposal = await resolveLetterProposal(
    notesPath,
    { ocrText, filenameHints, catalog },
    options,
  );

  const pending: PendingLetter = {
    stagedPdfPath: pdf.vaultPath,
    originalName: pdf.name,
    ocrText,
    proposal,
    catalog,
    matchSources: proposalToMatchSources(proposal),
  };
  setPendingLetter(sessionId, pending);

  return {
    pending,
    response: buildLetterReviewResponse(proposal),
  };
}

export type LetterConfirmFlowResult =
  | {
      action: "file";
      filing: LetterFilingResult;
      metadata: LetterFilingMetadata;
      response: string;
    }
  | {
      action: "clarify";
      response: string;
      pending: PendingLetter;
    };

export async function runLetterConfirmFlow(
  notesPath: string,
  sessionId: string,
  userText: string,
  options: { model?: ModelSelection } = {},
): Promise<LetterConfirmFlowResult> {
  const pending = peekPendingLetter(sessionId);
  if (!pending) {
    throw new Error("No pending letter to file. Attach a PDF and run /letter first.");
  }

  const structuredPayload = parseLetterFilingPayload(userText);
  if (structuredPayload) {
    const metadata = letterFilingPayloadToMetadata(structuredPayload, pending.proposal);
    const filing = fileLetterInVault(
      notesPath,
      pending.stagedPdfPath,
      pending.originalName,
      metadata,
    );
    recordLearnedAliases({
      notesPath,
      metadata,
      matchSources: pending.matchSources,
    });
    takePendingLetter(sessionId);

    return {
      action: "file",
      filing,
      metadata,
      response: buildLetterFiledResponse(filing, metadata),
    };
  }

  if (!userText.trim()) {
    throw new Error("Tell me how to file the letter before saving it.");
  }

  const confirmResult = await resolveLetterConfirm(
    notesPath,
    userText,
    pending.proposal,
    pending.catalog,
    options,
  );

  if (confirmResult.action === "clarify") {
    const updatedProposal = confirmResult.proposal ?? pending.proposal;
    const updatedPending: PendingLetter = {
      ...pending,
      proposal: updatedProposal,
      matchSources: {
        ...pending.matchSources,
        ...proposalToMatchSources(updatedProposal),
      },
    };
    setPendingLetter(sessionId, updatedPending);

    return {
      action: "clarify",
      response: ensureLetterConfirmResponse(
        confirmResult.response ?? buildLetterReviewResponse(updatedProposal),
        updatedProposal,
      ),
      pending: updatedPending,
    };
  }

  const metadata =
    confirmResult.metadata ??
    proposalToMetadata(confirmResult.proposal ?? pending.proposal);

  if (!metadata.date) metadata.date = pending.proposal.received;
  if (!metadata.note) metadata.note = pending.proposal.note;
  if (!metadata.organization) metadata.organization = pending.proposal.organization;
  if (!metadata.assigned) metadata.assigned = pending.proposal.assigned;

  const orgTeam = metadata.organization
    ? matchOrganizationToLinearTeam(metadata.organization, pending.catalog)
    : null;
  if (!orgTeam) {
    const updatedProposal = finalizeProposal(
      {
        assigned: metadata.assigned,
        received: metadata.date,
        organization: "",
        project: metadata.project,
        note: metadata.note,
      },
      pending.catalog,
      pending.proposal.raw,
    );
    return {
      action: "clarify",
      response: buildLetterReviewResponse(updatedProposal),
      pending: {
        ...pending,
        proposal: updatedProposal,
      },
    };
  }
  metadata.organization = orgTeam.name;

  const filing = fileLetterInVault(
    notesPath,
    pending.stagedPdfPath,
    pending.originalName,
    metadata,
  );
  recordLearnedAliases({
    notesPath,
    metadata,
    matchSources: pending.matchSources,
  });
  takePendingLetter(sessionId);

  return {
    action: "file",
    filing,
    metadata,
    response: buildLetterFiledResponse(filing, metadata),
  };
}

// Legacy export for tests that still reference analysis-shaped payloads.
export function letterAnalysisFromProposal(proposal: LetterFilingProposal): LetterAnalysis {
  return {
    creator: proposal.assigned,
    organization: proposal.organization,
    receivedDate: proposal.received,
    subject: proposal.note,
    summary: proposal.note,
  };
}

export { proposalFromLegacyAnalysis };
