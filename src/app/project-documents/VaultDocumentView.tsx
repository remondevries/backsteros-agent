import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LinearIssueEntity } from "../../chat/types";
import { TiptapEditor } from "../../editor/TiptapEditor";
import { useContentPanelBarState } from "../../hooks/useContentPanelBarState";
import { useDocumentDeleteBreadcrumbAction } from "../../hooks/useDocumentDeleteBreadcrumbAction";
import { useVaultDocument } from "../../hooks/useVaultDocument";
import { deleteVaultDocument } from "../../lib/api";
import { isDailyVaultNotePath } from "../../lib/vaultNotePaths";
import { dailyDateFromPath, parseDailyJournalDate } from "../../lib/vaultDates";
import { notifyVaultContentChanged } from "../../lib/vaultContentEvents";
import { vaultDocumentDisplayName } from "../../lib/sidebarNoteDeletion";
import type { SidebarNavItemId } from "../../lib/sidebarNavItems";
import { documentBodyPlaceholder, documentTitlePlaceholder } from "../../lib/documentTitlePlaceholder";
import {
  handleVaultDocumentTitleEnter,
  registerVaultDocumentTitleFocus,
} from "../../lib/vaultDocumentTitleFocus";
import { useContentPanelNavigation, useDebouncedFocusContentSnapshot } from "../contentPanelNavigation";
import { requestLinearIssueViewMode } from "../project-issues/issueViewModeIntent";
import { DailyJournalDocumentLeading } from "./DailyJournalDocumentLeading";
import { DailyNoteDueDateIssuesSection } from "./DailyNoteDueDateIssuesSection";
import { MeetingDocumentLeading } from "./MeetingDocumentLeading";
import { DocumentPdfLinkAction } from "./DocumentPdfLinkAction";
import { DeleteNoteConfirmDialog } from "../../ui/components/DeleteNoteConfirmDialog";

const SAVE_DEBOUNCE_MS = 800;

export function VaultDocumentView({
  path,
  dailyJournalSection = false,
  meetingsSection = false,
  workoutsLinearTeamId = null,
  activeVaultNavItem = null,
}: {
  path: string;
  dailyJournalSection?: boolean;
  meetingsSection?: boolean;
  workoutsLinearTeamId?: string | null;
  activeVaultNavItem?: SidebarNavItemId | null;
}) {
  const isDailyNote = isDailyVaultNotePath(path);
  const dailyDateHint = isDailyNote ? dailyDateFromPath(path) : null;
  const {
    activeVaultDocument,
    updateActiveVaultDocument,
    setActiveLinearIssue,
    activeLinearIssue,
    clearActiveVaultDocument,
  } = useContentPanelNavigation();
  const { document, loading, refreshing, error, save, refresh } = useVaultDocument(path);
  const [whoopRefreshKey, setWhoopRefreshKey] = useState(0);
  const [titleDraft, setTitleDraft] = useState("");
  const [bodyDraft, setBodyDraft] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleRef = useRef(titleDraft);
  const bodyRef = useRef(bodyDraft);
  const userEditedRef = useRef(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const focusHandledRef = useRef(false);
  const preserveEditStateOnPathChangeRef = useRef(false);
  const focusTitleRequested =
    activeVaultDocument?.focusTitle === true && activeVaultDocument.path === path;
  const dueDate =
    dailyDateHint ||
    parseDailyJournalDate(titleDraft) ||
    document?.date?.trim() ||
    null;
  const dailyWhoopDate =
    dailyJournalSection && isDailyNote
      ? dueDate
      : null;
  const showDailyJournalLayout = Boolean(dailyWhoopDate);
  const titlePlaceholder = useMemo(
    () =>
      documentTitlePlaceholder({
        activeVaultNavItem,
        dailyJournalSection,
        meetingsSection,
      }),
    [activeVaultNavItem, dailyJournalSection, meetingsSection],
  );

  const bodyPlaceholder = useMemo(
    () =>
      documentBodyPlaceholder({
        activeVaultNavItem,
        dailyJournalSection,
        meetingsSection,
      }),
    [activeVaultNavItem, dailyJournalSection, meetingsSection],
  );
  titleRef.current = titleDraft;
  bodyRef.current = bodyDraft;

  useContentPanelBarState({
    saving: saving || deleting,
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
    const preserveEditState = preserveEditStateOnPathChangeRef.current;
    preserveEditStateOnPathChangeRef.current = false;

    setSaveError(null);
    focusHandledRef.current = false;

    if (!preserveEditState) {
      setDirty(false);
      userEditedRef.current = false;
    }
  }, [path]);

  useEffect(() => {
    if (!document || document.path !== path) return;
    if (dirty || userEditedRef.current) return;
    setTitleDraft(document.title);
    setBodyDraft(document.body);
  }, [dirty, document, path]);

  useEffect(() => {
    if (!focusTitleRequested || focusHandledRef.current) return;
    if (!document || document.path !== path) return;
    if (isDailyNote) return;
    focusHandledRef.current = true;
    const input = titleInputRef.current;
    if (input) {
      input.focus();
      input.select();
    }
    updateActiveVaultDocument({ focusTitle: false });
  }, [document, focusTitleRequested, isDailyNote, path, updateActiveVaultDocument]);

  const focusSnapshot = useMemo(() => {
    if (!document || document.path !== path) return null;
    return {
      kind: "vault_document" as const,
      title: titleDraft,
      body: bodyDraft,
    };
  }, [bodyDraft, document, path, titleDraft]);

  useDebouncedFocusContentSnapshot(focusSnapshot, Boolean(document && document.path === path));

  useEffect(() => {
    if (!document || document.path !== path) return undefined;
    if (isDailyNote) return undefined;
    return registerVaultDocumentTitleFocus({
      focusTitle: () => {
        const input = titleInputRef.current;
        if (!input) return;
        input.focus();
        input.select();
      },
    });
  }, [document, isDailyNote, path]);

  const openLinearIssue = useCallback(
    (issue: LinearIssueEntity, mode: "issue" | "terminal" = "issue") => {
      if (mode === "terminal") {
        requestLinearIssueViewMode(issue.id, "terminal");
      }
      setActiveLinearIssue({
        id: issue.id,
        identifier: issue.identifier ?? issue.id,
        title: issue.title,
        status: issue.status,
        stateType: issue.stateType,
        projectName: issue.projectName?.trim() || undefined,
        sourceVaultDocumentPath: path,
        sourceVaultDocumentTitle: titleDraft.trim() || document?.title || dailyDateHint || "Daily",
      });
    },
    [dailyDateHint, document?.title, path, setActiveLinearIssue, titleDraft],
  );

  const selectedDailyIssueId = useMemo(() => {
    if (!activeLinearIssue) return null;
    if (activeLinearIssue.sourceVaultDocumentPath !== path) return null;
    return activeLinearIssue.id;
  }, [activeLinearIssue, path]);

  const persist = useCallback(
    async (title: string, body: string) => {
      setSaving(true);
      setSaveError(null);
      try {
        const result = await save(isDailyNote ? { body } : { title, body });
        if (result.error) {
          setSaveError(result.error);
          return;
        }
        setDirty(false);
        const savedDocument = result.document;
        const nextTitle = isDailyNote
          ? document?.title?.trim() || dailyDateHint || title.trim() || "Untitled"
          : title.trim() || savedDocument?.title || document?.title || "Untitled";
        if (savedDocument && savedDocument.path !== path) {
          preserveEditStateOnPathChangeRef.current = true;
          updateActiveVaultDocument({
            path: savedDocument.path,
            title: nextTitle,
          });
          notifyVaultContentChanged();
        } else {
          updateActiveVaultDocument({ title: nextTitle });
        }
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : "Failed to save document");
      } finally {
        setSaving(false);
      }
    },
    [dailyDateHint, document?.title, isDailyNote, path, save, updateActiveVaultDocument],
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
      const result = await deleteVaultDocument(path);
      if (result.error) {
        setSaveError(result.error);
        return;
      }
      setDeleteConfirmOpen(false);
      clearActiveVaultDocument();
      notifyVaultContentChanged();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to delete note");
    } finally {
      setDeleting(false);
    }
  }, [clearActiveVaultDocument, deleting, path]);

  useDocumentDeleteBreadcrumbAction(
    document
      ? {
          deleting,
          onDelete: () => setDeleteConfirmOpen(true),
        }
      : null,
  );

  if (!document) {
    return <div className="vault-document-scroll" />;
  }

  return (
    <>
      <DeleteNoteConfirmDialog
        open={deleteConfirmOpen}
        fileName={vaultDocumentDisplayName(path, titleDraft || document.title)}
        deleting={deleting}
        onCancel={() => {
          if (deleting) return;
          setDeleteConfirmOpen(false);
        }}
        onConfirm={() => {
          void handleDelete();
        }}
      />
      <DocumentPdfLinkAction content={bodyDraft}>
      <div className="vault-document-scroll">
        <article
          className={`vault-document${showDailyJournalLayout ? " vault-document--daily" : ""}`}
        >
        <header className="vault-document-header">
          {meetingsSection ? (
            <MeetingDocumentLeading />
          ) : (
            <DailyJournalDocumentLeading
              date={dailyWhoopDate}
              enabled={dailyJournalSection && isDailyNote}
              refreshKey={whoopRefreshKey}
              workoutsLinearTeamId={workoutsLinearTeamId}
            />
          )}
          {isDailyNote ? (
            <h1
              className="vault-document-title vault-document-title--readonly"
              aria-label="Document title"
            >
              {titleDraft || document.title}
            </h1>
          ) : (
            <input
              ref={titleInputRef}
              type="text"
              className="vault-document-title"
              value={titleDraft}
              onChange={(event) => handleTitleChange(event.target.value)}
              onFocus={handleTitleFocus}
              onBlur={handleBlur}
              onKeyDown={handleVaultDocumentTitleEnter}
              placeholder={titlePlaceholder}
              aria-label="Document title"
            />
          )}
        </header>
        <div className="vault-document-body-editor">
          <TiptapEditor
            value={bodyDraft}
            onChange={handleBodyChange}
            onFocus={handleBodyFocus}
            onBlur={handleBlur}
            format="markdown"
            hidePdfLinks
            placeholder={bodyPlaceholder}
            className="vault-document-tiptap"
          />
        </div>
        {isDailyNote && dueDate ? (
          <DailyNoteDueDateIssuesSection
            dueDate={dueDate}
            enabled={Boolean(dueDate)}
            onOpenIssue={openLinearIssue}
            selectedIssueId={selectedDailyIssueId}
          />
        ) : null}
      </article>
    </div>
    </DocumentPdfLinkAction>
    </>
  );
}
