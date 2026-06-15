import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TiptapEditor } from "../../editor/TiptapEditor";
import { XTermView } from "../../editor/XTermView";
import { useContentPanelBarState } from "../../hooks/useContentPanelBarState";
import { useLinearIssueDetail } from "../../hooks/useLinearIssueDetail";
import { useLinearIssueSubIssues } from "../../hooks/useLinearIssueSubIssues";
import { useLinearProjectWatcherPollProgress } from "../../hooks/useLinearProjectWatcherPollProgress";
import { ensureLinearIssueTerminalDirectory, getSettings } from "../../lib/api";
import { resolveTerminalLeafId } from "../../modules/terminal/leafId";
import {
  useLeafAgentWaiting,
  useLeafAgentWorking,
  useLeafSessionActive,
} from "../../modules/terminal/lib/useTerminalSession";
import {
  ensureTerminalAgentActivityLogBridge,
  registerTerminalAgentLogContext,
} from "../../lib/terminalAgentActivityLog";
import { useContentPanelNavigation, useDebouncedFocusContentSnapshot } from "../contentPanelNavigation";
import type { LinearSidebarTeamConfig } from "../sidebarNavConfig";
import { useIssueViewModeBreadcrumbAction } from "../../hooks/useIssueViewModeBreadcrumbAction";
import { LinearIssueDetailsSidePanel } from "./LinearIssueDetailsSidePanel";
import type { LinearIssueViewMode } from "./LinearIssueViewModeToggle";
import {
  consumeLinearIssueViewMode,
  subscribeLinearIssueViewModeIntent,
} from "./issueViewModeIntent";
import {
  handleVaultDocumentTitleEnter,
  registerVaultDocumentTitleFocus,
} from "../../lib/vaultDocumentTitleFocus";
import { seedLinearIssueDetailFromEntity } from "../../lib/linearIssueDetailSeed";
import { stripMarkdownForSpeech } from "../../lib/tts";
const SAVE_DEBOUNCE_MS = 800;

function formatSubIssueDescription(description: string | null): string {
  if (!description?.trim()) return "";
  return stripMarkdownForSpeech(description);
}

export function LinearIssueView({
  issueId,
  showDetailsPanel = true,
  showInboxConvertBar = false,
  showSubIssueTitles = false,
  workspaceTeamConfig = {},
}: {
  issueId: string;
  showDetailsPanel?: boolean;
  showInboxConvertBar?: boolean;
  showSubIssueTitles?: boolean;
  workspaceTeamConfig?: LinearSidebarTeamConfig;
}) {
  const { updateActiveLinearIssue, linearIssueRefreshNonce, clearActiveLinearIssue, setActiveLinearIssue } =
    useContentPanelNavigation();
  const { issue, loading, refreshing, updating, error, refresh, updateIssue } = useLinearIssueDetail(
    issueId,
    true,
    { inboxMode: !showDetailsPanel },
  );
  const { subIssues, linkedCustomers } = useLinearIssueSubIssues(issueId, showSubIssueTitles);
  const [contentMode, setContentMode] = useState<LinearIssueViewMode>("issue");
  const [terminalWorkingDirectory, setTerminalWorkingDirectory] = useState<string | null>(null);
  const [terminalWorkingDirectoryResolved, setTerminalWorkingDirectoryResolved] = useState(false);
  const projectId = issue?.projectId?.trim() || null;
  const { watcherActive } = useLinearProjectWatcherPollProgress(projectId);
  const terminalLeafId = useMemo(() => resolveTerminalLeafId(issueId), [issueId]);
  const terminalSessionActive = useLeafSessionActive(terminalLeafId);
  const terminalAgentWorking = useLeafAgentWorking(terminalLeafId);
  const terminalAgentWaiting = useLeafAgentWaiting(terminalLeafId);
  const loadedIssueId = issue?.id ?? null;

  useIssueViewModeBreadcrumbAction(
    watcherActive
      ? {
          mode: contentMode,
          onChange: setContentMode,
          terminalSessionActive,
          terminalAgentWorking,
          terminalAgentWaiting,
        }
      : null,
  );
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [descriptionDirty, setDescriptionDirty] = useState(false);
  const [descriptionSaving, setDescriptionSaving] = useState(false);
  const [descriptionSaveError, setDescriptionSaveError] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState("");
  const [titleDirty, setTitleDirty] = useState(false);
  const [titleSaving, setTitleSaving] = useState(false);
  const [titleSaveError, setTitleSaveError] = useState<string | null>(null);
  const descriptionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const descriptionRef = useRef(descriptionDraft);
  const titleRef = useRef(titleDraft);
  const issueScrollRef = useRef<HTMLDivElement | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const userEditedDescriptionRef = useRef(false);
  const userEditedTitleRef = useRef(false);
  descriptionRef.current = descriptionDraft;
  titleRef.current = titleDraft;

  useContentPanelBarState({
    saving: descriptionSaving || titleSaving,
    dirty: descriptionDirty || titleDirty,
    error: titleSaveError ?? descriptionSaveError ?? error,
    loading: loading && !issue,
    loadingMessage: "Loading issue…",
    refreshing: refreshing || updating,
    onRefresh: refresh,
  });

  useEffect(() => {
    if (linearIssueRefreshNonce === 0) return;
    void refresh({ silent: true });
  }, [linearIssueRefreshNonce, refresh]);

  useEffect(() => {
    if (!issue) return;
    const issueProjectId = issue.projectId?.trim();
    if (!issueProjectId) return;
    registerTerminalAgentLogContext(terminalLeafId, {
      issueId: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      projectId: issueProjectId,
      projectName: issue.projectName?.trim() || "Project",
      issueStatus: issue.status,
      issueStateType: issue.stateType,
    });
    ensureTerminalAgentActivityLogBridge();
  }, [issue, terminalLeafId]);

  useEffect(() => {
    setDescriptionDraft("");
    setDescriptionDirty(false);
    setDescriptionSaving(false);
    setDescriptionSaveError(null);
    setTitleDraft("");
    setTitleDirty(false);
    setTitleSaving(false);
    setTitleSaveError(null);
    setContentMode(consumeLinearIssueViewMode(issueId) ?? "issue");
    userEditedDescriptionRef.current = false;
    userEditedTitleRef.current = false;
  }, [issueId]);

  useEffect(() => {
    return subscribeLinearIssueViewModeIntent((targetIssueId, mode) => {
      if (targetIssueId !== issueId) return;
      consumeLinearIssueViewMode(targetIssueId);
      setContentMode(mode);
    });
  }, [issueId]);

  useEffect(() => {
    if (!issue) return;
    if (descriptionDirty || userEditedDescriptionRef.current) return;
    setDescriptionDraft(issue.description ?? "");
  }, [descriptionDirty, issue]);

  useEffect(() => {
    if (!issue) return;
    if (titleDirty || userEditedTitleRef.current) return;
    setTitleDraft(issue.title);
  }, [issue, titleDirty]);

  useEffect(
    () => () => {
      if (descriptionDebounceRef.current) {
        clearTimeout(descriptionDebounceRef.current);
      }
      if (titleDebounceRef.current) {
        clearTimeout(titleDebounceRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!issue) return;
    updateActiveLinearIssue({
      identifier: issue.identifier?.trim() || undefined,
      title: titleDirty ? titleDraft.trim() || issue.title : issue.title,
      status: issue.status,
      stateType: issue.stateType,
      projectName: issue.projectName?.trim() || undefined,
    });
  }, [issue, titleDirty, titleDraft, updateActiveLinearIssue]);

  const focusSnapshot = useMemo(() => {
    if (!issue) return null;
    return {
      kind: "linear_issue" as const,
      description: descriptionDraft || null,
    };
  }, [descriptionDraft, issue]);

  useDebouncedFocusContentSnapshot(focusSnapshot, Boolean(issue));

  useEffect(() => {
    if (!issue || contentMode !== "issue") return undefined;
    return registerVaultDocumentTitleFocus({
      focusTitle: () => {
        const input = titleInputRef.current;
        if (!input) return;
        input.focus();
        input.select();
      },
    });
  }, [contentMode, issue]);

  const persistDescription = useCallback(
    async (content: string) => {
      setDescriptionSaving(true);
      setDescriptionSaveError(null);
      try {
        const normalized = content.trim();
        const saveError = await updateIssue({
          description: normalized.length > 0 ? content : null,
        });
        if (saveError) {
          setDescriptionSaveError(saveError);
          return;
        }
        setDescriptionDirty(false);
      } catch (err) {
        setDescriptionSaveError(err instanceof Error ? err.message : "Failed to save description");
      } finally {
        setDescriptionSaving(false);
      }
    },
    [updateIssue],
  );

  const persistTitle = useCallback(
    async (nextTitle: string) => {
      const normalized = nextTitle.trim();
      if (!normalized) {
        setTitleSaveError("Title cannot be empty.");
        if (issue) {
          setTitleDraft(issue.title);
          setTitleDirty(false);
        }
        return;
      }

      setTitleSaving(true);
      setTitleSaveError(null);
      try {
        const saveError = await updateIssue({ title: normalized });
        if (saveError) {
          setTitleSaveError(saveError);
          return;
        }
        setTitleDirty(false);
      } catch (err) {
        setTitleSaveError(err instanceof Error ? err.message : "Failed to save title");
      } finally {
        setTitleSaving(false);
      }
    },
    [issue, updateIssue],
  );

  const scheduleDescriptionSave = useCallback(
    (content: string) => {
      if (descriptionDebounceRef.current) {
        clearTimeout(descriptionDebounceRef.current);
      }
      descriptionDebounceRef.current = setTimeout(() => {
        void persistDescription(content);
      }, SAVE_DEBOUNCE_MS);
    },
    [persistDescription],
  );

  const scheduleTitleSave = useCallback(
    (nextTitle: string) => {
      if (titleDebounceRef.current) {
        clearTimeout(titleDebounceRef.current);
      }
      titleDebounceRef.current = setTimeout(() => {
        void persistTitle(nextTitle);
      }, SAVE_DEBOUNCE_MS);
    },
    [persistTitle],
  );

  const handleDescriptionFocus = () => {
    userEditedDescriptionRef.current = true;
  };

  const handleDescriptionChange = (nextDescription: string) => {
    setDescriptionDraft(nextDescription);
    if (!userEditedDescriptionRef.current) return;
    setDescriptionDirty(true);
    setDescriptionSaveError(null);
    scheduleDescriptionSave(nextDescription);
  };

  const handleDescriptionBlur = () => {
    if (descriptionDebounceRef.current) {
      clearTimeout(descriptionDebounceRef.current);
      descriptionDebounceRef.current = null;
    }
    if (descriptionDirty && userEditedDescriptionRef.current) {
      void persistDescription(descriptionRef.current);
    }
  };

  const handleTitleFocus = () => {
    userEditedTitleRef.current = true;
  };

  const handleTitleChange = (nextTitle: string) => {
    setTitleDraft(nextTitle);
    if (!userEditedTitleRef.current) return;
    setTitleDirty(true);
    setTitleSaveError(null);
    scheduleTitleSave(nextTitle);
  };

  const handleTitleBlur = () => {
    if (titleDebounceRef.current) {
      clearTimeout(titleDebounceRef.current);
      titleDebounceRef.current = null;
    }
    if (titleDirty && userEditedTitleRef.current) {
      void persistTitle(titleRef.current);
    }
  };

  useEffect(() => {
    if (!watcherActive && contentMode === "terminal") {
      setContentMode("issue");
    }
  }, [contentMode, watcherActive]);

  const showTerminal = watcherActive && contentMode === "terminal";

  useEffect(() => {
    if (showTerminal) return;
    const scrollNode = issueScrollRef.current;
    if (!scrollNode) return;

    const resetScroll = () => {
      scrollNode.scrollTop = 0;
      scrollNode.scrollLeft = 0;
    };

    resetScroll();
    const frameA = window.requestAnimationFrame(resetScroll);
    const frameB = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(resetScroll);
    });

    return () => {
      window.cancelAnimationFrame(frameA);
      window.cancelAnimationFrame(frameB);
    };
  }, [issueId, loadedIssueId, showTerminal]);

  useEffect(() => {
    if (!showTerminal) {
      setTerminalWorkingDirectoryResolved(false);
      return;
    }
    let cancelled = false;

    void getSettings()
      .then((settings) => {
        if (cancelled) return;
        const configuredPath = settings.projectsPath?.trim() || null;
        if (!configuredPath) {
          setTerminalWorkingDirectory(null);
          setTerminalWorkingDirectoryResolved(true);
          return;
        }

        const projectName = issue?.projectName?.trim() || null;
        const issueIdentifier = issue?.identifier?.trim() || null;
        if (!projectName || !issueIdentifier) {
          setTerminalWorkingDirectory(configuredPath);
          setTerminalWorkingDirectoryResolved(true);
          return;
        }

        void ensureLinearIssueTerminalDirectory({
          projectsPath: configuredPath,
          projectName,
          issueIdentifier,
        })
          .then((result) => {
            if (cancelled) return;
            setTerminalWorkingDirectory(result.path);
            setTerminalWorkingDirectoryResolved(true);
          })
          .catch(() => {
            if (cancelled) return;
            setTerminalWorkingDirectory(configuredPath);
            setTerminalWorkingDirectoryResolved(true);
          });
      })
      .catch(() => {
        if (!cancelled) {
          setTerminalWorkingDirectory(null);
          setTerminalWorkingDirectoryResolved(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [issue?.identifier, issue?.projectName, showTerminal]);

  return (
    <div className="linear-issue-layout">
      <div className="linear-issue-main">
        <div
          ref={issueScrollRef}
          className={[
            "linear-issue-scroll",
            showTerminal ? "linear-issue-scroll--terminal" : null,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {showTerminal ? (
            <div className="linear-issue-terminal-shell">
              {terminalWorkingDirectoryResolved ? (
                <XTermView
                  className="linear-issue-terminal"
                  workingDirectory={terminalWorkingDirectory}
                  sessionKey={issueId}
                />
              ) : null}
            </div>
          ) : issue ? (
            <article className="linear-issue">
              <header className="linear-issue-header">
                <input
                  ref={titleInputRef}
                  type="text"
                  className="linear-issue-title"
                  value={titleDraft}
                  onChange={(event) => handleTitleChange(event.target.value)}
                  onFocus={handleTitleFocus}
                  onBlur={handleTitleBlur}
                  onKeyDown={handleVaultDocumentTitleEnter}
                  placeholder="Issue title"
                  aria-label="Issue title"
                />
                {showSubIssueTitles && linkedCustomers.length > 0 ? (
                  <p className="linear-issue-linked-customer" aria-label="Linked customer">
                    {linkedCustomers.map((customer) => customer.name).join(", ")}
                  </p>
                ) : null}
                {showSubIssueTitles && subIssues.length > 0 ? (
                  <ul className="linear-issue-sub-issues" aria-label="Sub-issues">
                    {subIssues.map((subIssue) => {
                      const descriptionPreview = formatSubIssueDescription(subIssue.description);
                      return (
                        <li key={subIssue.id} className="linear-issue-sub-issue">
                          <span className="linear-issue-sub-issue-title">{subIssue.title}</span>
                          {descriptionPreview ? (
                            <>
                              <span className="linear-issue-sub-issue-separator" aria-hidden="true">
                                :
                              </span>
                              <span className="linear-issue-sub-issue-description">
                                {descriptionPreview}
                              </span>
                            </>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </header>
              <div className="linear-issue-body-editor">
                <TiptapEditor
                  value={descriptionDraft}
                  onChange={handleDescriptionChange}
                  onFocus={handleDescriptionFocus}
                  onBlur={handleDescriptionBlur}
                  format="markdown"
                  placeholder="Add a description…"
                  className="linear-issue-tiptap"
                />
              </div>
            </article>
          ) : null}
        </div>
      </div>

      {issue && showDetailsPanel ? (
        <LinearIssueDetailsSidePanel
          issueId={issue.id}
          workspaceTeamConfig={workspaceTeamConfig}
          inboxProjectMove={
            showInboxConvertBar && !showTerminal
              ? {
                  issueId: issue.id,
                  getTitle: () => titleRef.current,
                  getDescription: () => descriptionRef.current,
                  onMoved: clearActiveLinearIssue,
                  onViewConvertedIssue: (converted) => {
                    seedLinearIssueDetailFromEntity({
                      id: converted.id,
                      identifier: converted.identifier,
                      title: titleRef.current,
                      url: converted.url,
                      projectId: converted.projectId,
                      projectName: converted.projectName,
                    });
                    setActiveLinearIssue({
                      id: converted.id,
                      identifier: converted.identifier,
                      title: titleRef.current,
                    });
                  },
                }
              : undefined
          }
        />
      ) : null}
    </div>
  );
}
