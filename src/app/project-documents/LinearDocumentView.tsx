import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LinearIssueEntity } from "../../chat/types";
import { TiptapEditor } from "../../editor/TiptapEditor";
import { useContentPanelBarState } from "../../hooks/useContentPanelBarState";
import { useDocumentDeleteBreadcrumbAction } from "../../hooks/useDocumentDeleteBreadcrumbAction";
import { useLinearDocument } from "../../hooks/useLinearDocument";
import { linearSync } from "../../lib/linearSync";
import { notifyLinearDocumentListChange } from "../../lib/linearDocumentListEvents";
import { parseDailyJournalDate, isDailyJournalDocumentTitle } from "../../lib/vaultDates";
import {
  buildLinearLinkedDocumentTitle,
  linearLinkedDocumentDisplayTitle,
  parseLinearLinkedDocumentTitle,
} from "../../lib/linearLinkedDocumentTitle";
import {
  hasDocumentLinkedIssue,
  resolveDocumentLinkedIssue,
} from "../../lib/resolveDocumentLinkedIssue";
import {
  buildMeetingDocumentTitle,
  meetingDocumentDisplayTitle,
  parseMeetingDocumentTitle,
} from "../../lib/meetingDocumentTitle";
import type { SidebarNavItemId } from "../../lib/sidebarNavItems";
import type { LinearSidebarTeamConfig } from "../sidebarNavConfig";
import { documentBodyPlaceholder, documentTitlePlaceholder } from "../../lib/documentTitlePlaceholder";
import {
  handleVaultDocumentTitleEnter,
  registerVaultDocumentTitleFocus,
} from "../../lib/vaultDocumentTitleFocus";
import { useContentPanelNavigation, useDebouncedFocusContentSnapshot } from "../contentPanelNavigation";
import { ResizablePanel } from "../ResizablePanel";
import { DeleteNoteConfirmDialog } from "../../ui/components/DeleteNoteConfirmDialog";
import { LinearDocumentActionBar } from "./LinearDocumentActionBar";
import { requestLinearIssueViewMode } from "../project-issues/issueViewModeIntent";
import { DailyJournalDocumentLeading } from "./DailyJournalDocumentLeading";
import { DailyNoteDueDateIssuesSection } from "./DailyNoteDueDateIssuesSection";
import { MeetingDocumentLeading } from "./MeetingDocumentLeading";
import { LinearDocumentDetailsPanel } from "./LinearDocumentDetailsPanel";
import { DocumentPdfLinkAction } from "./DocumentPdfLinkAction";
import { LetterLinkedIssueSidePanel } from "./LetterLinkedIssueSidePanel";
import { LetterIssueDescriptionEditor } from "./LetterIssueDescriptionEditor";

const LINEAR_DOCUMENT_DETAILS_WIDTH_KEY = "backsteros.layout.linearDocumentDetailsWidth";
const SAVE_DEBOUNCE_MS = 800;

export function LinearDocumentView({
  documentId,
  projectId,
  dailyJournalSection = false,
  meetingsSection = false,
  lettersSection = false,
  lettersTeamId = null,
  inboxSection = false,
  inboxTeamId = null,
  workoutsLinearTeamId = null,
  workspaceTeamConfig = {},
  activeVaultNavItem = null,
  showDetailsPanel = false,
}: {
  documentId: string;
  projectId?: string;
  dailyJournalSection?: boolean;
  meetingsSection?: boolean;
  lettersSection?: boolean;
  lettersTeamId?: string | null;
  inboxSection?: boolean;
  inboxTeamId?: string | null;
  workoutsLinearTeamId?: string | null;
  workspaceTeamConfig?: LinearSidebarTeamConfig;
  activeVaultNavItem?: SidebarNavItemId | null;
  showDetailsPanel?: boolean;
}) {
  const { updateActiveLinearDocument, clearActiveLinearDocument, setActiveLinearIssue, activeLinearIssue } =
    useContentPanelNavigation();
  const { document, loading, refreshing, error, save, updateProperties, refresh } =
    useLinearDocument(documentId);
  const [titleDraft, setTitleDraft] = useState("");
  const [bodyDraft, setBodyDraft] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [updatingProperties, setUpdatingProperties] = useState(false);
  const [propertiesError, setPropertiesError] = useState<string | null>(null);
  const [meetingDate, setMeetingDate] = useState<string | null>(null);
  const [meetingTime, setMeetingTime] = useState<string | null>(null);
  const [linkedIssueIdentifier, setLinkedIssueIdentifier] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [whoopRefreshKey, setWhoopRefreshKey] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleRef = useRef(titleDraft);
  const bodyRef = useRef(bodyDraft);
  const userEditedRef = useRef(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
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

  const dailyWhoopDate = useMemo(() => {
    if (!dailyJournalSection) return null;
    return parseDailyJournalDate(titleDraft) || parseDailyJournalDate(document?.title);
  }, [dailyJournalSection, document?.title, titleDraft]);
  const showDailyJournalLayout = Boolean(dailyWhoopDate);
  const isDailyJournalDocument = useMemo(
    () => isDailyJournalDocumentTitle(titleDraft) || isDailyJournalDocumentTitle(document?.title),
    [document?.title, titleDraft],
  );

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
        sourceLinearDocumentId: documentId,
        sourceLinearDocumentTitle:
          dailyWhoopDate ??
          (lettersSection
            ? linearLinkedDocumentDisplayTitle(titleDraft || document?.title)
            : titleDraft.trim() || document?.title || "Daily"),
      });
    },
    [dailyWhoopDate, document?.title, documentId, lettersSection, setActiveLinearIssue, titleDraft],
  );

  const selectedDailyIssueId = useMemo(() => {
    if (!activeLinearIssue) return null;
    if (activeLinearIssue.sourceLinearDocumentId !== documentId) return null;
    return activeLinearIssue.id;
  }, [activeLinearIssue, documentId]);

  const linkedTitleActive = useMemo(() => {
    if (meetingsSection) return false;
    if (lettersSection) {
      return resolveDocumentLinkedIssue(document).usesLegacyTitleLink;
    }
    return parseLinearLinkedDocumentTitle(document?.title).issueIdentifier != null;
  }, [document, lettersSection, meetingsSection]);

  const effectiveLinkedIssueKey = useMemo(() => {
    const linked = resolveDocumentLinkedIssue(document);
    return linked.issueId ?? linked.issueIdentifier ?? linkedIssueIdentifier;
  }, [document, linkedIssueIdentifier]);

  const letterLabelTeamId = useMemo(() => {
    if (!lettersSection) return null;
    return lettersTeamId?.trim() || document?.teamId?.trim() || null;
  }, [document?.teamId, lettersSection, lettersTeamId]);

  const titlePlaceholder = useMemo(
    () =>
      documentTitlePlaceholder({
        activeVaultNavItem,
        dailyJournalSection,
        meetingsSection,
        lettersSection,
      }),
    [activeVaultNavItem, dailyJournalSection, lettersSection, meetingsSection],
  );

  const bodyPlaceholder = useMemo(
    () =>
      documentBodyPlaceholder({
        activeVaultNavItem,
        dailyJournalSection,
        meetingsSection,
        lettersSection,
      }),
    [activeVaultNavItem, dailyJournalSection, lettersSection, meetingsSection],
  );

  useEffect(() => {
    setDirty(false);
    setSaveError(null);
    userEditedRef.current = false;
  }, [documentId]);

  useEffect(() => {
    if (!document || document.id !== documentId) return;
    if (dirty || userEditedRef.current) return;
    if (meetingsSection) {
      const parsed = parseMeetingDocumentTitle(document.title);
      setMeetingDate(parsed.date);
      setMeetingTime(parsed.time);
      setTitleDraft(parsed.displayTitle || meetingDocumentDisplayTitle(document.title));
    } else if (lettersSection || linkedTitleActive) {
      const linked = resolveDocumentLinkedIssue(document);
      setLinkedIssueIdentifier(linked.issueIdentifier);
      setTitleDraft(
        linked.displayTitle ||
          (lettersSection ? document.title : linearLinkedDocumentDisplayTitle(document.title)),
      );
    } else {
      setTitleDraft(document.title);
    }
    setBodyDraft(document.content);
  }, [dirty, document, documentId, lettersSection, linkedTitleActive, meetingsSection]);

  const focusSnapshot = useMemo(() => {
    if (!document || document.id !== documentId) return null;
    return {
      kind: "linear_document" as const,
      title: titleDraft,
      content: bodyDraft,
    };
  }, [bodyDraft, document, documentId, titleDraft]);

  useDebouncedFocusContentSnapshot(
    focusSnapshot,
    Boolean(document && document.id === documentId),
  );

  useEffect(() => {
    if (!document || document.id !== documentId) return undefined;
    if (isDailyJournalDocument) return undefined;
    return registerVaultDocumentTitleFocus({
      focusTitle: () => {
        const input = titleInputRef.current;
        if (!input) return;
        input.focus();
        input.select();
      },
    });
  }, [document, documentId, isDailyJournalDocument]);

  const persist = useCallback(
    async (titleInput: string, body: string) => {
      const title = meetingsSection
        ? buildMeetingDocumentTitle(meetingDate, titleInput, meetingTime)
        : linkedTitleActive
          ? buildLinearLinkedDocumentTitle(linkedIssueIdentifier, titleInput)
          : titleInput;
      setSaving(true);
      setSaveError(null);
      try {
        const saveResult = await save(
          isDailyJournalDocument
            ? { content: body }
            : { title, content: body },
        );
        if (saveResult.error) {
          setSaveError(saveResult.error);
          return;
        }
        setDirty(false);
        const nextTitle = isDailyJournalDocument
          ? document?.title?.trim() || titleDraft.trim() || "Untitled"
          : saveResult.document?.title.trim() ||
            title.trim() ||
            document?.title ||
            "Untitled";
        const nextNavTitle = meetingsSection
          ? meetingDocumentDisplayTitle(nextTitle)
          : linkedTitleActive
            ? linearLinkedDocumentDisplayTitle(nextTitle)
            : lettersSection
              ? titleInput.trim() || "Untitled"
              : nextTitle;
        updateActiveLinearDocument({
          title: nextNavTitle,
          projectId: projectId ?? document?.projectId,
        });
      notifyLinearDocumentListChange({
          type: "update",
          linearDocumentId: documentId,
          patch: {
            ...(isDailyJournalDocument ? {} : { title: nextTitle }),
            updatedAt: saveResult.document?.updatedAt,
            linkedIssueId: saveResult.document?.linkedIssueId,
            linkedIssueIdentifier: saveResult.document?.linkedIssueIdentifier,
          },
        });
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : "Failed to save document");
      } finally {
        setSaving(false);
      }
    },
    [document?.projectId, document?.title, documentId, isDailyJournalDocument, lettersSection, linkedIssueIdentifier, linkedTitleActive, meetingDate, meetingTime, meetingsSection, projectId, save, titleDraft, updateActiveLinearDocument],
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

  const handleUpdateProperties = useCallback(
    async (updates: {
      teamId?: string;
      projectId?: string | null;
      title?: string;
      issueId?: string | null;
    }) => {
      if (isDailyJournalDocument && updates.title !== undefined) {
        const { title: _title, ...rest } = updates;
        if (Object.keys(rest).length === 0) {
          return { error: null };
        }
        updates = rest;
      }
      setUpdatingProperties(true);
      setPropertiesError(null);
      try {
        const result = await updateProperties(updates);
        if (result.error || !result.document) {
          setPropertiesError(result.error ?? "Failed to update document properties.");
          return { error: result.error ?? "Failed to update document properties." };
        }

        if (meetingsSection) {
          const parsed = parseMeetingDocumentTitle(result.document.title);
          setMeetingDate(parsed.date);
          setMeetingTime(parsed.time);
          if (!dirty && !userEditedRef.current) {
            setTitleDraft(parsed.displayTitle || meetingDocumentDisplayTitle(result.document.title));
          }
        } else if (lettersSection || linkedTitleActive) {
          const linked = resolveDocumentLinkedIssue(result.document);
          setLinkedIssueIdentifier(linked.issueIdentifier);
          if (!dirty && !userEditedRef.current) {
            setTitleDraft(
              linked.displayTitle ||
                (lettersSection
                  ? result.document.title
                  : linearLinkedDocumentDisplayTitle(result.document.title)),
            );
          }
        }

        updateActiveLinearDocument({
          title: meetingsSection
            ? meetingDocumentDisplayTitle(result.document.title)
            : linkedTitleActive
              ? linearLinkedDocumentDisplayTitle(result.document.title)
              : lettersSection
                ? resolveDocumentLinkedIssue(result.document).displayTitle
                : result.document.title,
          projectId: result.document.projectId,
        });

        notifyLinearDocumentListChange({
          type: "refresh",
          documentId,
        });
        return { error: null };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to update document properties.";
        setPropertiesError(message);
        return { error: message };
      } finally {
        setUpdatingProperties(false);
      }
    },
    [dirty, documentId, isDailyJournalDocument, lettersSection, linkedTitleActive, meetingsSection, updateActiveLinearDocument, updateProperties],
  );

  const handleSyncDocumentOrganizationProject = useCallback(
    async (updates: { teamId?: string; projectId?: string | null }) => {
      return handleUpdateProperties(updates);
    },
    [handleUpdateProperties],
  );

  const handleDelete = useCallback(async () => {
    if (deleting) return;
    setDeleting(true);
    setSaveError(null);
    try {
      await linearSync.enqueueDocumentDelete(documentId);
      setDeleteConfirmOpen(false);
      clearActiveLinearDocument();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to delete document");
    } finally {
      setDeleting(false);
    }
  }, [clearActiveLinearDocument, deleting, documentId]);

  useDocumentDeleteBreadcrumbAction(
    document && !isDailyJournalDocument
      ? {
          deleting,
          onDelete: () => setDeleteConfirmOpen(true),
        }
      : null,
  );

  const handleLinkIssue = useCallback(
    (issue: LinearIssueEntity) => {
      if (!lettersSection || updatingProperties) return;

      const identifier = issue.identifier?.trim();
      if (!identifier) return;

      const displayTitle =
        titleDraft.trim() ||
        resolveDocumentLinkedIssue(document).displayTitle ||
        "Untitled";
      const nextTitle = linkedTitleActive
        ? buildLinearLinkedDocumentTitle(identifier, displayTitle)
        : displayTitle;
      if (
        nextTitle === document?.title.trim() &&
        (document?.linkedIssueId === issue.id ||
          document?.linkedIssueIdentifier?.toUpperCase() === identifier.toUpperCase())
      ) {
        return;
      }

      setLinkedIssueIdentifier(identifier);
      void handleUpdateProperties({
        issueId: issue.id,
        title: nextTitle,
      });
    },
    [
      document,
      handleUpdateProperties,
      lettersSection,
      linkedTitleActive,
      titleDraft,
      updatingProperties,
    ],
  );

  const handleClearLinkedIssue = useCallback(() => {
    if (!lettersSection || updatingProperties || !document) return;
    if (!hasDocumentLinkedIssue(document)) return;

    const displayTitle =
      titleDraft.trim() ||
      resolveDocumentLinkedIssue(document).displayTitle ||
      "Untitled";
    const nextTitle = displayTitle;
    if (
      nextTitle === document.title.trim() &&
      !document.linkedIssueId &&
      !document.linkedIssueIdentifier
    ) {
      return;
    }

    setLinkedIssueIdentifier(null);
    void handleUpdateProperties({ issueId: null, title: nextTitle });
  }, [document, handleUpdateProperties, lettersSection, linkedTitleActive, titleDraft, updatingProperties]);

  if (!document) {
    return lettersSection ? (
      <DocumentPdfLinkAction content="">
        <div className="linear-issue-layout linear-issue-layout--letters">
          <div className="linear-issue-main">
            <div className="vault-document-scroll" />
          </div>
          <LetterLinkedIssueSidePanel
            issueIdentifier={null}
            labelTeamId={letterLabelTeamId}
            disabled={updatingProperties}
            workspaceTeamConfig={workspaceTeamConfig}
            onLinkIssue={handleLinkIssue}
            onClearIssue={handleClearLinkedIssue}
            onSyncDocumentOrganizationProject={handleSyncDocumentOrganizationProject}
          />
        </div>
      </DocumentPdfLinkAction>
    ) : showDetailsPanel ? (
      <div className="linear-issue-layout">
        <div className="linear-issue-main">
          <div className="vault-document-scroll" />
        </div>
      </div>
    ) : (
      <div className="vault-document-scroll" />
    );
  }

  const documentArticle = (
    <article
      className={`vault-document${showDailyJournalLayout ? " vault-document--daily" : ""}`}
    >
      <header className="vault-document-header">
        {meetingsSection ? (
          <MeetingDocumentLeading />
        ) : !lettersSection ? (
          <DailyJournalDocumentLeading
            date={dailyWhoopDate}
            enabled={dailyJournalSection}
            refreshKey={whoopRefreshKey}
            workoutsLinearTeamId={workoutsLinearTeamId}
          />
        ) : null}
        {isDailyJournalDocument ? (
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
        {lettersSection ? (
          <LetterIssueDescriptionEditor
            issueId={effectiveLinkedIssueKey}
            disabled={updatingProperties}
            placeholder={bodyPlaceholder}
          />
        ) : (
          <TiptapEditor
            value={bodyDraft}
            onChange={handleBodyChange}
            onFocus={handleBodyFocus}
            onBlur={handleBlur}
            format="markdown"
            placeholder={bodyPlaceholder}
            className="vault-document-tiptap"
          />
        )}
      </div>
      {dailyJournalSection && dailyWhoopDate ? (
        <DailyNoteDueDateIssuesSection
          dueDate={dailyWhoopDate}
          enabled={Boolean(dailyWhoopDate)}
          onOpenIssue={openLinearIssue}
          selectedIssueId={selectedDailyIssueId}
        />
      ) : null}
    </article>
  );

  const deleteConfirmDialog =
    document && !isDailyJournalDocument ? (
      <DeleteNoteConfirmDialog
        open={deleteConfirmOpen}
        fileName={titleDraft.trim() || document.title.trim() || "Untitled"}
        deleting={deleting}
        onCancel={() => {
          if (deleting) return;
          setDeleteConfirmOpen(false);
        }}
        onConfirm={() => {
          void handleDelete();
        }}
      />
    ) : null;

  if (lettersSection) {
    return (
      <>
        {deleteConfirmDialog}
        <DocumentPdfLinkAction content={bodyDraft}>
          <div className="linear-issue-layout linear-issue-layout--letters">
            <div className="linear-issue-main">
              <div className="vault-document-scroll">{documentArticle}</div>
            </div>
            <LetterLinkedIssueSidePanel
              issueIdentifier={effectiveLinkedIssueKey}
              labelTeamId={letterLabelTeamId}
              disabled={updatingProperties}
              workspaceTeamConfig={workspaceTeamConfig}
              onLinkIssue={handleLinkIssue}
              onClearIssue={handleClearLinkedIssue}
              onSyncDocumentOrganizationProject={handleSyncDocumentOrganizationProject}
            />
          </div>
        </DocumentPdfLinkAction>
      </>
    );
  }

  if (!showDetailsPanel) {
    return (
      <>
        {deleteConfirmDialog}
        <DocumentPdfLinkAction content={bodyDraft}>
          <div className="vault-document-scroll">{documentArticle}</div>
        </DocumentPdfLinkAction>
      </>
    );
  }

  return (
    <>
      {deleteConfirmDialog}
      <div className="linear-issue-layout">
      <div className="linear-issue-main">
        <DocumentPdfLinkAction content={bodyDraft}>
          <div className="vault-document-scroll">{documentArticle}</div>
        </DocumentPdfLinkAction>
      </div>
      <ResizablePanel
        side="right"
        className={[
          "app-resizable-panel-inset linear-issue-details-resizable",
          meetingsSection ? "linear-issue-details-resizable--meetings" : null,
          inboxSection ? "linear-issue-details-resizable--inbox" : null,
        ]
          .filter(Boolean)
          .join(" ")}
        storageKey={LINEAR_DOCUMENT_DETAILS_WIDTH_KEY}
        defaultWidth={300}
        minWidth={300}
        maxWidth={480}
        ariaLabel="Document details"
      >
        <div className="linear-issue-details-shell">
          {meetingsSection ? <LinearDocumentActionBar document={document} /> : null}
          <div className="linear-issue-details-scroll">
            <LinearDocumentDetailsPanel
              document={document}
              meetingsSection={meetingsSection}
              inboxSection={inboxSection}
              inboxTeamId={inboxTeamId}
              workspaceTeamConfig={workspaceTeamConfig}
              onUpdateProperties={handleUpdateProperties}
              updatingProperties={updatingProperties}
              propertiesError={propertiesError}
            />
          </div>
        </div>
      </ResizablePanel>
    </div>
    </>
  );
}
