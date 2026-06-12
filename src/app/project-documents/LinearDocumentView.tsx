import { useCallback, useEffect, useRef, useState } from "react";
import { TiptapEditor } from "../../editor/TiptapEditor";
import { useContentPanelBarState } from "../../hooks/useContentPanelBarState";
import { useLinearDocument } from "../../hooks/useLinearDocument";
import { deleteLinearDocument } from "../../lib/api";
import { useContentPanelNavigation } from "../contentPanelNavigation";
import { DocumentNoteIcon } from "./DocumentNoteIcon";

const SAVE_DEBOUNCE_MS = 800;

export function LinearDocumentView({
  documentId,
  projectId,
}: {
  documentId: string;
  projectId?: string;
}) {
  const { updateActiveLinearDocument, clearActiveLinearDocument, setFocusContentSnapshot } =
    useContentPanelNavigation();
  const { document, loading, refreshing, error, save, refresh } = useLinearDocument(documentId);
  const [titleDraft, setTitleDraft] = useState("");
  const [bodyDraft, setBodyDraft] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleRef = useRef(titleDraft);
  const bodyRef = useRef(bodyDraft);
  const userEditedRef = useRef(false);
  titleRef.current = titleDraft;
  bodyRef.current = bodyDraft;

  useContentPanelBarState({
    saving: saving || deleting,
    dirty,
    error: saveError ?? error,
    loading: loading && !document,
    loadingMessage: "Loading document…",
    refreshing,
    onRefresh: refresh,
  });

  useEffect(() => {
    setDirty(false);
    setSaveError(null);
    userEditedRef.current = false;
  }, [documentId]);

  useEffect(() => {
    if (!document || document.id !== documentId) return;
    if (dirty || userEditedRef.current) return;
    setTitleDraft(document.title);
    setBodyDraft(document.content);
  }, [dirty, document, documentId]);

  useEffect(() => {
    if (!document || document.id !== documentId) return;
    setFocusContentSnapshot({
      kind: "linear_document",
      title: titleDraft,
      content: bodyDraft,
    });
  }, [bodyDraft, document, documentId, setFocusContentSnapshot, titleDraft]);

  const persist = useCallback(
    async (title: string, body: string) => {
      setSaving(true);
      setSaveError(null);
      try {
        const saveErrorMessage = await save({ title, content: body });
        if (saveErrorMessage) {
          setSaveError(saveErrorMessage);
          return;
        }
        setDirty(false);
        updateActiveLinearDocument({
          title: title.trim() || document?.title || "Untitled",
          projectId: projectId ?? document?.projectId,
        });
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : "Failed to save document");
      } finally {
        setSaving(false);
      }
    },
    [document?.projectId, document?.title, projectId, save, updateActiveLinearDocument],
  );

  const scheduleSave = useCallback(
    (title: string, body: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        void persist(title, body);
      }, SAVE_DEBOUNCE_MS);
    },
    [persist],
  );

  useEffect(
    () => () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    },
    [],
  );

  const handleTitleFocus = () => {
    userEditedRef.current = true;
  };

  const handleTitleChange = (nextTitle: string) => {
    setTitleDraft(nextTitle);
    if (!userEditedRef.current) return;
    setDirty(true);
    setSaveError(null);
    scheduleSave(nextTitle, bodyRef.current);
  };

  const handleBodyFocus = () => {
    userEditedRef.current = true;
  };

  const handleBodyChange = (nextBody: string) => {
    setBodyDraft(nextBody);
    if (!userEditedRef.current) return;
    setDirty(true);
    setSaveError(null);
    scheduleSave(titleRef.current, nextBody);
  };

  const handleBlur = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (dirty && userEditedRef.current) {
      void persist(titleRef.current, bodyRef.current);
    }
  };

  const handleDelete = useCallback(async () => {
    if (deleting) return;
    setDeleting(true);
    setSaveError(null);
    try {
      const result = await deleteLinearDocument(documentId);
      if (result.error || !result.ok) {
        setSaveError(result.error ?? "Failed to delete document.");
        return;
      }
      clearActiveLinearDocument();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to delete document");
    } finally {
      setDeleting(false);
    }
  }, [clearActiveLinearDocument, deleting, documentId]);

  if (!document) {
    return <div className="vault-document-scroll" />;
  }

  return (
    <div className="vault-document-scroll">
      <article className="vault-document">
        <header className="vault-document-header">
          <div className="vault-document-icon" aria-hidden="true">
            <DocumentNoteIcon size={16} />
          </div>
          <input
            type="text"
            className="vault-document-title"
            value={titleDraft}
            onChange={(event) => handleTitleChange(event.target.value)}
            onFocus={handleTitleFocus}
            onBlur={handleBlur}
            placeholder="Untitled"
            aria-label="Document title"
          />
          <button
            type="button"
            className="linear-document-delete-button"
            onClick={() => void handleDelete()}
            disabled={deleting}
          >
            Delete
          </button>
        </header>
        <div className="vault-document-body-editor">
          <TiptapEditor
            value={bodyDraft}
            onChange={handleBodyChange}
            onFocus={handleBodyFocus}
            onBlur={handleBlur}
            format="markdown"
            placeholder="Start writing…"
            className="vault-document-tiptap"
          />
        </div>
      </article>
    </div>
  );
}
