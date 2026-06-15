import { Suspense, useCallback, useRef, useState, type ChangeEvent } from "react";
import { LETTER_RECEIVED_DATE_PROPERTY_LABELS } from "../../chat/letter";
import { uploadLinearTeamLetter } from "../../lib/api";
import {
  clearInboxDraftIssueUpdates,
  peekDraftIssueUpdates,
  queueInboxDraftIssueUpdates,
} from "../../lib/inboxDraftIssue";
import { seedLinearDocumentContentFromEntity } from "../../lib/linearDocumentContentSeed";
import { seedLinearIssueDetailFromEntity } from "../../lib/linearIssueDetailSeed";
import { notifyLinearDocumentListChange } from "../../lib/linearDocumentListEvents";
import { notifyLinearIssueListChange } from "../../lib/linearIssueListEvents";
import {
  clearLetterComposeDraft,
  createLetterComposeDraftIssueForDocument,
  getLetterComposeDraftFile,
  getLetterComposeDraftIssueId,
  setLetterComposeDraftFile,
  suggestLetterComposeTitleFromFile,
} from "../../lib/letterComposeDraft";
import { documentBodyPlaceholder, documentTitlePlaceholder } from "../../lib/documentTitlePlaceholder";
import { useContentPanelNavigation } from "../contentPanelNavigation";
import type { LinearSidebarTeamConfig } from "../sidebarNavConfig";
import { ResizablePanel } from "../ResizablePanel";
import { LetterComposeFilePreviewPanel } from "./LetterComposeFilePreviewPanel";
import { LinearIssueDetailsSidePanel } from "../project-issues/LinearIssueDetailsSidePanel";
import { LETTER_COMPOSE_ISSUE_DETAILS_WIDTH_KEY } from "./LetterLinkedIssueSidePanel";
import { LetterIssueDescriptionEditor } from "./LetterIssueDescriptionEditor";

const PDF_PREVIEW_MIN_WIDTH = 280;

function pickLetterFile(files: FileList | File[] | null | undefined): File | null {
  if (!files) return null;
  const list = Array.from(files);
  return list.find((file) => file.size > 0) ?? null;
}

export function LetterComposeView({
  documentDraftId,
  teamId,
  labelTeamId = null,
  workspaceTeamConfig = {},
  initialTitle = "New letter",
}: {
  documentDraftId: string;
  teamId: string;
  labelTeamId?: string | null;
  workspaceTeamConfig?: LinearSidebarTeamConfig;
  initialTitle?: string;
}) {
  const { setActiveLinearDocument } = useContentPanelNavigation();

  const [title, setTitle] = useState(initialTitle.trim() || "New letter");
  const [selectedFile, setSelectedFile] = useState<File | null>(() =>
    getLetterComposeDraftFile(documentDraftId),
  );
  const [isDragging, setIsDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dragDepthRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const layoutRef = useRef<HTMLDivElement>(null);
  const titleTouchedRef = useRef(false);

  const [draftIssueId] = useState(() => {
    const existing = getLetterComposeDraftIssueId(documentDraftId);
    if (existing) return existing;
    const issue = createLetterComposeDraftIssueForDocument(documentDraftId, initialTitle);
    seedLinearIssueDetailFromEntity(issue, { freshCreate: true });
    return issue.id;
  });

  const applyFile = useCallback(
    (file: File | null) => {
      setLetterComposeDraftFile(documentDraftId, file);
      setSelectedFile(file);
      setError(null);
      if (file && !titleTouchedRef.current) {
        const suggested = suggestLetterComposeTitleFromFile(file);
        setTitle(suggested);
        queueInboxDraftIssueUpdates(draftIssueId, { title: suggested });
      }
    },
    [documentDraftId, draftIssueId],
  );

  const handleTitleChange = useCallback(
    (value: string) => {
      titleTouchedRef.current = true;
      setTitle(value);
      queueInboxDraftIssueUpdates(draftIssueId, { title: value.trim() || "Untitled" });
      setActiveLinearDocument({
        id: documentDraftId,
        title: value.trim() || "New letter",
      });
    },
    [documentDraftId, draftIssueId, setActiveLinearDocument],
  );

  const handleDragEnter = useCallback((event: React.DragEvent) => {
    if (!event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    dragDepthRef.current += 1;
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    if (!event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    if (!event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      if (!event.dataTransfer.types.includes("Files")) return;
      event.preventDefault();
      dragDepthRef.current = 0;
      setIsDragging(false);
      const file = pickLetterFile(event.dataTransfer.files);
      if (file) applyFile(file);
    },
    [applyFile],
  );

  const handleFileInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = pickLetterFile(event.target.files);
      event.target.value = "";
      if (file) applyFile(file);
    },
    [applyFile],
  );

  const handleUploadClick = useCallback(() => {
    if (saving) return;
    fileInputRef.current?.click();
  }, [saving]);

  const handleSave = useCallback(async () => {
    if (saving) return;

    const file = getLetterComposeDraftFile(documentDraftId);
    if (!file) {
      setError("Choose a file to upload.");
      return;
    }

    const displayTitle = title.trim() || "Untitled";
    const pending = peekDraftIssueUpdates(draftIssueId) ?? {};
    const issueUpdates = {
      ...pending,
      title: displayTitle,
    };

    setSaving(true);
    setError(null);
    try {
      const result = await uploadLinearTeamLetter(teamId, file, {
        displayTitle,
        issueUpdates,
      });
      if (result.error || !result.document || !result.issue) {
        setError(result.error ?? "Failed to save letter.");
        return;
      }

      clearInboxDraftIssueUpdates(draftIssueId);
      clearLetterComposeDraft(documentDraftId);
      notifyLinearDocumentListChange({ type: "refresh" });
      notifyLinearIssueListChange({ type: "refresh" });
      seedLinearIssueDetailFromEntity(result.issue);
      seedLinearDocumentContentFromEntity(result.document, {
        content: result.content ?? "",
      });
      setActiveLinearDocument({
        id: result.document.linearDocumentId,
        title: result.document.title.trim() || displayTitle,
        projectId: result.document.projectId,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save letter.");
    } finally {
      setSaving(false);
    }
  }, [
    documentDraftId,
    draftIssueId,
    saving,
    setActiveLinearDocument,
    teamId,
    title,
  ]);

  const composeLayout = (
    <div className="linear-issue-layout linear-issue-layout--letter-compose linear-issue-layout--letters">
      <div className="linear-issue-layout-body">
        <div
          className={`linear-issue-main${isDragging ? " letter-compose-dragging" : ""}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div className="vault-document-scroll">
            <article className="vault-document letter-compose">
              <header className="vault-document-header">
                <input
                  type="text"
                  className="vault-document-title"
                  value={title}
                  onChange={(event) => handleTitleChange(event.target.value)}
                  placeholder={documentTitlePlaceholder({ lettersSection: true })}
                  aria-label="Letter name"
                  disabled={saving}
                />
              </header>
              <div className="vault-document-body-editor">
                <LetterIssueDescriptionEditor
                  issueId={draftIssueId}
                  disabled={saving}
                  placeholder={documentBodyPlaceholder({ lettersSection: true })}
                />
              </div>
            </article>
          </div>
        </div>
        <LinearIssueDetailsSidePanel
          issueId={draftIssueId}
          labelTeamId={labelTeamId}
          storageKey={LETTER_COMPOSE_ISSUE_DETAILS_WIDTH_KEY}
          ariaLabel="Letter issue details"
          dueDatePropertyLabels={LETTER_RECEIVED_DATE_PROPERTY_LABELS}
          hideEstimateProperty
          lettersLayout
          workspaceTeamConfig={workspaceTeamConfig}
        />
      </div>
      <div className="letter-compose-actions">
        {error ? (
          <p className="letter-compose-actions__error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="letter-compose-actions__buttons">
          <button
            type="button"
            className="btn-secondary letter-compose-actions__upload"
            onClick={handleUploadClick}
            disabled={saving}
          >
            Upload
          </button>
          <button
            type="button"
            className="btn-primary letter-compose-actions__save"
            onClick={() => void handleSave()}
            disabled={saving || !selectedFile}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          className="composer-file-input"
          accept="application/pdf,.pdf,image/*"
          aria-hidden="true"
          tabIndex={-1}
          onChange={handleFileInputChange}
        />
      </div>
    </div>
  );

  if (!selectedFile) {
    return composeLayout;
  }

  return (
    <div ref={layoutRef} className="document-pdf-layout">
      <div className="document-pdf-main">{composeLayout}</div>
      <ResizablePanel
        id="letter-compose-file-preview-panel"
        side="right"
        className="document-pdf-preview-panel app-resizable-panel-inset"
        storageKey="backsteros.documentPdfPreviewWidth"
        defaultWidth={PDF_PREVIEW_MIN_WIDTH}
        minWidth={PDF_PREVIEW_MIN_WIDTH}
        maxWidth={99999}
        containerRef={layoutRef}
        defaultWidthRatio={0.5}
        maxWidthRatio={0.9}
        resetWidthOnExpand
        collapsed={false}
        ariaLabel={`File preview: ${selectedFile.name}`}
      >
        <Suspense fallback={<div className="document-pdf-viewer-status">Loading preview…</div>}>
          <LetterComposeFilePreviewPanel file={selectedFile} />
        </Suspense>
      </ResizablePanel>
    </div>
  );
}
