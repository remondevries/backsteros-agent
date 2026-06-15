import { useCallback, useEffect, useRef, useState } from "react";
import { TiptapEditor } from "../../editor/TiptapEditor";
import { useLinearIssueDetail } from "../../hooks/useLinearIssueDetail";

const SAVE_DEBOUNCE_MS = 800;

export function LetterIssueDescriptionEditor({
  issueId,
  disabled = false,
  placeholder = "Type here the issue description",
  className = "vault-document-tiptap",
}: {
  issueId: string | null;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const enabled = Boolean(issueId?.trim()) && !disabled;
  const { issue, loading, updateIssue } = useLinearIssueDetail(issueId ?? "", enabled);

  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const descriptionRef = useRef(descriptionDraft);
  const userEditedRef = useRef(false);
  descriptionRef.current = descriptionDraft;

  useEffect(() => {
    setDescriptionDraft("");
    setDirty(false);
    setSaveError(null);
    userEditedRef.current = false;
  }, [issueId]);

  useEffect(() => {
    if (!issue) return;
    if (dirty || userEditedRef.current) return;
    setDescriptionDraft(issue.description ?? "");
  }, [dirty, issue]);

  useEffect(
    () => () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    },
    [],
  );

  const persistDescription = useCallback(
    async (content: string) => {
      setSaveError(null);
      try {
        const normalized = content.trim();
        const errorMessage = await updateIssue({
          description: normalized.length > 0 ? content : null,
        });
        if (errorMessage) {
          setSaveError(errorMessage);
          return;
        }
        setDirty(false);
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : "Failed to save description");
      }
    },
    [updateIssue],
  );

  const scheduleSave = useCallback(
    (content: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        void persistDescription(content);
      }, SAVE_DEBOUNCE_MS);
    },
    [persistDescription],
  );

  const handleFocus = () => {
    userEditedRef.current = true;
  };

  const handleChange = (nextDescription: string) => {
    setDescriptionDraft(nextDescription);
    if (!userEditedRef.current) return;
    setDirty(true);
    setSaveError(null);
    scheduleSave(nextDescription);
  };

  const handleBlur = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (dirty && userEditedRef.current) {
      void persistDescription(descriptionRef.current);
    }
  };

  if (!issueId?.trim()) {
    return (
      <p className="vault-document-linear-issues-status" aria-live="polite">
        Link an issue to view and edit its description.
      </p>
    );
  }

  if (loading && !issue) {
    return <p className="vault-document-linear-issues-status">Loading issue description…</p>;
  }

  return (
    <>
      {saveError ? (
        <p className="vault-document-save-error" role="alert">
          {saveError}
        </p>
      ) : null}
      <TiptapEditor
        value={descriptionDraft}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        format="markdown"
        placeholder={placeholder}
        className={className}
        disabled={disabled}
      />
    </>
  );
}
