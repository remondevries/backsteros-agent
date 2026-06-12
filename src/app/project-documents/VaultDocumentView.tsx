import { useCallback, useEffect, useRef, useState } from "react";
import { TiptapEditor } from "../../editor/TiptapEditor";
import { useContentPanelBarState } from "../../hooks/useContentPanelBarState";
import { useVaultDocument } from "../../hooks/useVaultDocument";
import { useVaultDocumentWhoopSnapshot } from "../../hooks/useVaultDocumentWhoopSnapshot";
import { useContentPanelNavigation } from "../contentPanelNavigation";
import { DocumentNoteIcon } from "./DocumentNoteIcon";
import { VaultDocumentWhoopHeader } from "./VaultDocumentWhoopHeader";

const SAVE_DEBOUNCE_MS = 800;

export function VaultDocumentView({ path }: { path: string }) {
  const { updateActiveVaultDocument, setFocusContentSnapshot } = useContentPanelNavigation();
  const { document, loading, refreshing, error, save, refresh } = useVaultDocument(path);
  const [whoopRefreshKey, setWhoopRefreshKey] = useState(0);
  const { snapshot: whoopSnapshot, loading: whoopLoading } = useVaultDocumentWhoopSnapshot(
    document,
    { refreshKey: whoopRefreshKey },
  );
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

  useContentPanelBarState({
    saving,
    dirty,
    error: saveError ?? error,
    loading: loading && !document,
    loadingMessage: "Loading document…",
    refreshing,
    onRefresh: () => {
      setWhoopRefreshKey((current) => current + 1);
      void refresh();
    },
  });

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

  useEffect(() => {
    if (!document || document.path !== path) return;
    setFocusContentSnapshot({
      kind: "vault_document",
      title: titleDraft,
      body: bodyDraft,
    });
  }, [bodyDraft, document, path, setFocusContentSnapshot, titleDraft]);

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

  if (!document) {
    return <div className="vault-document-scroll" />;
  }

  return (
    <div className="vault-document-scroll">
      <article className="vault-document">
        {whoopSnapshot ? <VaultDocumentWhoopHeader snapshot={whoopSnapshot} /> : null}
        {!whoopSnapshot && whoopLoading && document.date ? (
          <p className="vault-document-whoop-status">Loading Whoop…</p>
        ) : null}
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
