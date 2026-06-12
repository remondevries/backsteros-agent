import { readVaultDocument } from "../vault/vault-document.ts";
import { fetchLinearIssueDetail } from "../linear/issue-detail.ts";
import { truncateContextSection } from "./limits.ts";

export type FocusContextInput =
  | {
      kind: "linear_issue";
      issueId: string;
      identifier?: string;
      title?: string;
      description?: string | null;
    }
  | {
      kind: "vault_document";
      path: string;
      title?: string;
      body?: string;
    };

export async function buildFocusContextSection(
  input: FocusContextInput,
  notesPath: string,
): Promise<string | null> {
  if (input.kind === "linear_issue") {
    const issue =
      input.description !== undefined
        ? {
            id: input.issueId,
            identifier: input.identifier ?? input.issueId,
            title: input.title ?? "Untitled",
            description: input.description,
          }
        : await fetchLinearIssueDetail(input.issueId);

    if (!issue) return null;

    const lines = [
      "The user is viewing this Linear issue in BacksterOS. Treat it as the active workspace focus.",
      `Issue: ${issue.identifier} — ${issue.title}`,
      `Issue ID: ${issue.id}`,
    ];

    const description = (issue.description ?? "").trim();
    if (description) {
      lines.push("", "Issue description:", description);
    } else {
      lines.push("", "Issue description: (empty)");
    }

    return truncateContextSection(lines.join("\n"));
  }

  const document =
    input.body !== undefined
      ? {
          path: input.path,
          title: input.title ?? "Untitled",
          body: input.body,
        }
      : readVaultDocument(notesPath, input.path);

  const lines = [
    "The user is viewing this vault document in BacksterOS. Treat it as the active workspace focus.",
    `Document: ${document.title}`,
    `Path: ${document.path}`,
  ];

  const body = document.body.trim();
  if (body) {
    lines.push("", "Document body:", body);
  } else {
    lines.push("", "Document body: (empty)");
  }

  return truncateContextSection(lines.join("\n"));
}
