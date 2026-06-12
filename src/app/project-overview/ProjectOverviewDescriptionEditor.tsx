import { useCallback, useEffect, useRef, useState } from "react";
import { TiptapEditor } from "../../editor/TiptapEditor";

const SAVE_DEBOUNCE_MS = 800;

export type ProjectOverviewEditorBarState = {
  saving: boolean;
  dirty: boolean;
  error: string | null;
};

export function ProjectOverviewDescriptionEditor({
  projectId,
  value,
  onSave,
  onBarStateChange,
}: {
  projectId: string;
  value: string;
  onSave: (content: string) => Promise<string | null>;
  onBarStateChange?: (state: ProjectOverviewEditorBarState) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [draft, setDraft] = useState(value);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftRef = useRef(draft);
  const userEditedRef = useRef(false);
  draftRef.current = draft;

  useEffect(() => {
    onBarStateChange?.({
      saving,
      dirty,
      error: saveError,
    });
  }, [dirty, onBarStateChange, saveError, saving]);

  useEffect(() => {
    setExpanded(true);
    setDirty(false);
    setSaveError(null);
    setDraft(value);
    userEditedRef.current = false;
  }, [projectId]);

  useEffect(() => {
    if (!dirty) {
      setDraft(value);
    }
  }, [dirty, value]);

  const persist = useCallback(
    async (content: string) => {
      setSaving(true);
      setSaveError(null);
      try {
        const error = await onSave(content);
        if (error) {
          setSaveError(error);
          return;
        }
        setDirty(false);
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : "Failed to save description");
      } finally {
        setSaving(false);
      }
    },
    [onSave],
  );

  const scheduleSave = useCallback(
    (content: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        void persist(content);
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

  const handleFocus = () => {
    userEditedRef.current = true;
  };

  const handleChange = (nextValue: string) => {
    setDraft(nextValue);
    if (!userEditedRef.current) return;
    setDirty(true);
    setSaveError(null);
    scheduleSave(nextValue);
  };

  const handleBlur = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (dirty && userEditedRef.current) {
      void persist(draftRef.current);
    }
  };

  return (
    <section className="project-overview-body" data-expanded={expanded ? "true" : "false"}>
      <div className="project-overview-description-block">
        <div className="project-overview-description-header">
          <button
            type="button"
            className="project-overview-description-toggle"
            aria-expanded={expanded}
            onClick={() => setExpanded((open) => !open)}
          >
            <span>Description</span>
            <span className="project-overview-description-chevron" aria-hidden="true">
              ▾
            </span>
          </button>
        </div>
        {expanded ? (
          <div className="project-overview-description-editor">
            <TiptapEditor
              value={draft}
              onChange={handleChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              format="markdown"
              placeholder="Add a project description…"
              className="project-overview-description-tiptap"
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
