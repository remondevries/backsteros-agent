import { useCallback, useEffect, useRef, useState } from "react";
import { TiptapEditor } from "../../editor/TiptapEditor";
import { useVaultDocument } from "../../hooks/useVaultDocument";
import { useContentPanelNavigation } from "../contentPanelNavigation";
import { DocumentNoteIcon } from "./DocumentNoteIcon";

const SAVE_DEBOUNCE_MS = 800;

export function VaultDocumentView({ path }: { path: string }) {
  const { updateActiveVaultDocument } = useContentPanelNavigation();
  const { document, loading, error, save } = useVaultDocument(path);
  const [titleDraft, setTitleDraft] = useState("");
  const [bodyDraft, setBodyDraft] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleRef = useRef(titleDraft);
  const bodyRef = useRef(bodyDraft);
  const userEditedRef = useRef(false);
  titleRef.current = titleDraft;
  bodyRef.current = bodyDraft;

  useEffect(() => {
    setDirty(false);
    setSaveError(null);
    userEditedRef.current = false;
  }, [path]);

  useEffect(() => {
    if (!document || document.path !== path) return;
    if (dirty || userEditedRef.current) return;
    setTitleDraft(document.title);
    setBodyDraft(document.body);
  }, [dirty, document, path]);

  const persist = useCallback(
    async (title: string, body: string) => {
      setSaving(true);
      setSaveError(null);
      try {
        const saveErrorMessage = await save({ title, body });
        if (saveErrorMessage) {
          setSaveError(saveErrorMessage);
          return;
        }
        setDirty(false);
        updateActiveVaultDocument({ title: title.trim() || document?.title || "Untitled" });
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : "Failed to save document");
      } finally {
        setSaving(false);
      }
    },
    [document?.title, save, updateActiveVaultDocument],
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

  if (loading && !document) {
    return (
      <div className="vault-document-scroll">
        <p className="vault-document-loading">Loading document…</p>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="vault-document-scroll">
        <div className="vault-document-error" role="alert">
          {error ?? "Failed to load document."}
        </div>
      </div>
    );
  }

  return (
    <div className="vault-document-scroll">
      <article className="vault-document">
        <header className="vault-document-header">
          <DocumentNoteIcon className="vault-document-icon" size={20} />
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
          {saving ? (
            <span className="vault-document-status">Saving…</span>
          ) : dirty ? (
            <span className="vault-document-status">Unsaved changes</span>
          ) : null}
        </header>
        {saveError ? (
          <p className="vault-document-save-error" role="alert">
            {saveError}
          </p>
        ) : null}
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
