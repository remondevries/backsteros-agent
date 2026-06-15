import { createTeamDocument, type ProjectDocumentRecord } from "../vault/project-documents.ts";
import { updateLinearIssueDetail, type LinearIssueDetailUpdateInput } from "./issue-detail.ts";
import { createLinearIssueAttachment } from "./issue-attachment.ts";
import { fetchLinearApiDocumentById } from "./project-documents-api.ts";
import { createLinearTeamIssue, type LinearProjectIssue } from "./project-issues.ts";
import { uploadFileBufferToLinear } from "./file-upload.ts";
import {
  buildLetterDocumentLeadingLine,
  displayTitleFromUploadFilename,
} from "./linked-document-title.ts";

export type LinearLetterUploadResult = {
  issue: LinearProjectIssue;
  document: ProjectDocumentRecord;
  assetUrl: string;
  content: string;
};

async function attachDocumentToIssue(
  issueId: string,
  documentId: string,
  title: string,
): Promise<void> {
  const linearDocument = await fetchLinearApiDocumentById(documentId);
  const documentUrl = linearDocument?.url?.trim();
  if (!documentUrl) return;

  await createLinearIssueAttachment({
    issueId,
    title,
    url: documentUrl,
    subtitle: "Letter document",
  });
}

export async function createLinearLetterFromUpload(
  teamId: string,
  file: { filename: string; contentType: string; data: ArrayBuffer },
  options?: {
    displayTitle?: string;
    issueUpdates?: LinearIssueDetailUpdateInput;
  },
): Promise<LinearLetterUploadResult> {
  const id = teamId.trim();
  if (!id) {
    throw new Error("teamId is required");
  }

  const filename = file.filename.trim() || "attachment";
  const displayTitle =
    options?.displayTitle?.trim() ||
    options?.issueUpdates?.title?.trim() ||
    displayTitleFromUploadFilename(filename);
  const issue = await createLinearTeamIssue(id, { title: displayTitle });
  const assetUrl = await uploadFileBufferToLinear({
    filename,
    contentType: file.contentType,
    data: file.data,
  });
  const content = buildLetterDocumentLeadingLine(filename, assetUrl);
  const document = await createTeamDocument(id, {
    title: displayTitle,
    content,
    issueId: issue.id,
  });

  try {
    await attachDocumentToIssue(issue.id, document.linearDocumentId, displayTitle);
  } catch {
    // Document is already linked via issueId on documentCreate; attachment is best-effort.
  }

  if (options?.issueUpdates && Object.keys(options.issueUpdates).length > 0) {
    const updated = await updateLinearIssueDetail(issue.id, options.issueUpdates);
    if (updated) {
      return {
        issue: {
          ...issue,
          title: updated.title,
          status: updated.status,
          stateId: updated.stateId,
          stateType: updated.stateType,
          statusColor: updated.statusColor,
          priority: updated.priority,
          priorityLabel: updated.priorityLabel,
          assigneeName: updated.assigneeName,
          assigneeAvatarUrl: updated.assigneeAvatarUrl,
          dueDate: updated.dueDate,
          estimate: updated.estimate,
          labels: updated.labels.map((label) => ({ name: label.name, color: label.color })),
        },
        document,
        assetUrl,
        content,
      };
    }
  }

  return { issue, document, assetUrl, content };
}
