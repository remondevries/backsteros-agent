import { readVaultDocument } from "../vault/vault-document.ts";
import { fetchLinearIssueDetail } from "../linear/issue-detail.ts";
import { fetchLinearApiDocumentById } from "../linear/project-documents-api.ts";
import { fetchLinearProjectOverview } from "../linear/project-overview.ts";
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
      kind: "linear_document";
      documentId: string;
      title?: string;
      content?: string;
      projectId?: string;
    }
  | {
      kind: "vault_document";
      path: string;
      title?: string;
      body?: string;
    }
  | {
      kind: "linear_workspace";
      workspaceKind: "team" | "project";
      workspaceId: string;
      name: string;
      view: string;
      summary?: string | null;
      description?: string | null;
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

  if (input.kind === "linear_document") {
    const document =
      input.content !== undefined
        ? {
            id: input.documentId,
            title: input.title ?? "Untitled",
            content: input.content,
            projectId: input.projectId,
          }
        : await fetchLinearApiDocumentById(input.documentId);

    if (!document) return null;

    const lines = [
      "The user is viewing this Linear document in BacksterOS. Treat it as the active workspace focus.",
      `Document: ${document.title}`,
      `Document ID: ${document.id}`,
    ];

    if (document.projectId ?? input.projectId) {
      lines.push(`Project ID: ${document.projectId ?? input.projectId}`);
    }

    const content = (document.content ?? "").trim();
    if (content) {
      lines.push("", "Document content:", content);
    } else {
      lines.push("", "Document content: (empty)");
    }

    return truncateContextSection(lines.join("\n"));
  }

  if (input.kind === "linear_workspace") {
    const viewLabel = input.view.trim() || "Overview";
    const lines = [
      input.workspaceKind === "project"
        ? "The user is viewing this Linear project in BacksterOS. Treat it as the active workspace focus."
        : "The user is viewing this Linear team in BacksterOS. Treat it as the active workspace focus.",
      `${input.workspaceKind === "project" ? "Project" : "Team"}: ${input.name}`,
      `${input.workspaceKind === "project" ? "Project" : "Team"} ID: ${input.workspaceId}`,
      `Active tab: ${viewLabel}`,
    ];

    if (input.workspaceKind === "project") {
      const overview =
        input.description !== undefined || input.summary !== undefined
          ? {
              summary: input.summary ?? null,
              description: input.description ?? null,
            }
          : await fetchLinearProjectOverview(input.workspaceId);

      const summary = (overview?.summary ?? input.summary ?? "").trim();
      const description = (overview?.description ?? input.description ?? "").trim();

      if (summary) {
        lines.push("", "Project summary:", summary);
      }
      if (description) {
        lines.push("", "Project description:", description);
      } else if (!summary) {
        lines.push("", "Project description: (empty)");
      }
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
