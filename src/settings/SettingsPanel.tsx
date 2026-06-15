import { useCallback, useEffect, useRef, useState } from "react";
import {
  composerModeFromSettings,
  settingsFromComposerMode,
  type ComposerMode,
} from "../chat/composerMode";
import type { LinearIssueLinkMode } from "../chat/types";
import { getProfileContent, getSettings, getAccountWorkspace, peekCachedSettings, updateProfileContent, updateSettings, updateAccountWorkspace, type ProfileKind } from "../lib/api";
import { setLinearIssueLinkMode } from "../lib/linear/linearLink";
import { resolveProfilePaths } from "../lib/profilePaths";
import { AdministratorSettingsSection } from "./AdministratorSettingsSection";
import {
  IntegrationSettingsSection,
} from "./ConnectionsSettingsSection";
import { GeneralSettingsSection } from "./GeneralSettingsSection";
import type { LinearSettingsView } from "./LinearIntegrationSection";
import type { CursorSettingsView } from "./CursorIntegrationSection";
import { ObsidianSettingsSection } from "./ObsidianSettingsSection";
import { ProfileEditorSection } from "./ProfileEditorSection";
import { SettingsSectionToggle } from "./SettingsSectionToggle";
import { getVisibleSettingsTabs, isAdministratorNavTab, isIntegrationNavTab, type SettingsTabId } from "./settingsTabs";
import { useIntegrationsStatus } from "./useIntegrationsStatus";
import { useAdministratorAccess } from "./useAdministratorAccess";

const LINEAR_VIEW_OPTIONS: { value: LinearSettingsView; label: string }[] = [
  { value: "general", label: "General" },
  { value: "oauth", label: "OAuth" },
];

const CURSOR_VIEW_OPTIONS: { value: CursorSettingsView; label: string }[] = [
  { value: "general", label: "General" },
  { value: "api-key", label: "API Key" },
];

export function SettingsPanel({
  activeTab,
  notesPath,
  vaultName,
  defaultNotesPath,
  initialModelMode: _initialModelMode = "auto",
  initialUserProfilePath,
  initialAgentProfilePath,
  initialInboxLinearTeamId,
  initialDailyLinearTeamId,
  initialWorkoutsLinearTeamId,
  initialLettersLinearTeamId,
  initialKnowledgeBaseLinearTeamId,
  initialAddressbookLinearTeamId,
  onUpdated,
  onSecretsUpdated,
  onWorkspaceTeamsUpdated,
  vaultEnabled = true,
  onServerAccessSaved,
  onAccountDeleted,
}: {
  activeTab: SettingsTabId;
  notesPath: string | null;
  vaultName?: string | null;
  defaultNotesPath: string;
  initialModelMode?: string;
  initialUserProfilePath?: string;
  initialAgentProfilePath?: string;
  initialInboxLinearTeamId?: string | null;
  initialDailyLinearTeamId?: string | null;
  initialWorkoutsLinearTeamId?: string | null;
  initialLettersLinearTeamId?: string | null;
  initialKnowledgeBaseLinearTeamId?: string | null;
  initialAddressbookLinearTeamId?: string | null;
  vaultEnabled?: boolean;
  onUpdated: (path: string, nextVaultName?: string | null) => void;
  onSecretsUpdated?: () => void | Promise<void>;
  onWorkspaceTeamsUpdated?: (workspace: {
    inboxLinearTeamId?: string | null;
    dailyLinearTeamId?: string | null;
    workoutsLinearTeamId?: string | null;
    lettersLinearTeamId?: string | null;
    knowledgeBaseLinearTeamId?: string | null;
    addressbookLinearTeamId?: string | null;
  }) => void;
  onServerAccessSaved?: () => void | Promise<void>;
  onAccountDeleted?: () => void | Promise<void>;
}) {
  const [manualPath, setManualPath] = useState(notesPath ?? defaultNotesPath);
  const [manualVaultName, setManualVaultName] = useState(vaultName ?? "");
  const [projectsPath, setProjectsPath] = useState("");
  const [composerMode, setComposerMode] = useState<ComposerMode>("auto");
  const [issueLinkMode, setIssueLinkMode] = useState<LinearIssueLinkMode>("external");
  const [groceryLinearProjectId, setGroceryLinearProjectId] = useState<string>("");
  const [inboxLinearTeamId, setInboxLinearTeamId] = useState(
    initialInboxLinearTeamId?.trim() ?? "",
  );
  const [dailyLinearTeamId, setDailyLinearTeamId] = useState(
    initialDailyLinearTeamId?.trim() ?? "",
  );
  const [workoutsLinearTeamId, setWorkoutsLinearTeamId] = useState(
    initialWorkoutsLinearTeamId?.trim() ?? "",
  );
  const [lettersLinearTeamId, setLettersLinearTeamId] = useState(
    initialLettersLinearTeamId?.trim() ?? "",
  );
  const [knowledgeBaseLinearTeamId, setKnowledgeBaseLinearTeamId] = useState(
    initialKnowledgeBaseLinearTeamId?.trim() ?? "",
  );
  const [addressbookLinearTeamId, setAddressbookLinearTeamId] = useState(
    initialAddressbookLinearTeamId?.trim() ?? "",
  );
  const workspaceLoadGenerationRef = useRef(0);
  const workspaceLoadCountRef = useRef(0);
  const [workspaceTeamsLoading, setWorkspaceTeamsLoading] = useState(false);
  const [userProfilePath, setUserProfilePath] = useState<string | null>(
    initialUserProfilePath ?? null,
  );
  const [agentProfilePath, setAgentProfilePath] = useState<string | null>(
    initialAgentProfilePath ?? null,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [profileEditor, setProfileEditor] = useState<ProfileKind | null>(null);
  const [profileDraft, setProfileDraft] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [linearView, setLinearView] = useState<LinearSettingsView>("general");
  const [cursorView, setCursorView] = useState<CursorSettingsView>("general");
  const { isAdministrator, loading: administratorLoading } = useAdministratorAccess();

  const visibleSettingsTabs = getVisibleSettingsTabs({ isAdministrator });
  const resolvedActiveTab =
    visibleSettingsTabs.some((tab) => tab.id === activeTab)
      ? activeTab
      : visibleSettingsTabs[0]?.id ?? "general";
  const activeTabMeta =
    visibleSettingsTabs.find((tab) => tab.id === resolvedActiveTab) ?? visibleSettingsTabs[0];
  const { status: integrationsStatus, refresh: refreshIntegrationsStatus } =
    useIntegrationsStatus(true);
  const showSaveFooter =
    profileEditor !== null ||
    activeTab === "general" ||
    (activeTab === "cursor" && cursorView === "general") ||
    (vaultEnabled && activeTab === "obsidian") ||
    (activeTab === "linear" && linearView === "general");

  const profileEditorMeta =
    profileEditor === "agent"
      ? {
          title: "Agent persona",
          description:
            "Markdown read on every turn for Backster's identity and behavior. Changes apply on the next message.",
        }
      : profileEditor === "user"
        ? {
            title: "User profile",
            description:
              "Markdown read on every turn for your identity and timezone context. Changes apply on the next message.",
          }
        : null;

  const handleSecretsUpdated = useCallback(async () => {
    await refreshIntegrationsStatus();
    await onSecretsUpdated?.();
  }, [onSecretsUpdated, refreshIntegrationsStatus]);

  useEffect(() => {
    setSaveMessage(null);
    setError(null);
    setProfileEditor(null);
  }, [activeTab]);

  useEffect(() => {
    if (administratorLoading || isAdministrator) return;
    if (isAdministratorNavTab(activeTab)) {
      setSaveMessage(null);
      setError(null);
      setProfileEditor(null);
    }
  }, [activeTab, administratorLoading, isAdministrator]);

  useEffect(() => {
    if (!profileEditor) {
      setProfileDraft("");
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);
    setSaveMessage(null);
    setError(null);
    void getProfileContent(profileEditor)
      .then(({ content }) => {
        setProfileDraft(content);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load profile");
        setProfileDraft("");
      })
      .finally(() => {
        setProfileLoading(false);
      });
  }, [profileEditor]);

  const applyWorkspaceTeams = useCallback(
    (workspace: {
      inboxLinearTeamId?: string | null;
      dailyLinearTeamId?: string | null;
      workoutsLinearTeamId?: string | null;
      lettersLinearTeamId?: string | null;
      knowledgeBaseLinearTeamId?: string | null;
      addressbookLinearTeamId?: string | null;
    }) => {
      if (workspace.inboxLinearTeamId !== undefined) {
        setInboxLinearTeamId(workspace.inboxLinearTeamId?.trim() ?? "");
      }
      if (workspace.dailyLinearTeamId !== undefined) {
        setDailyLinearTeamId(workspace.dailyLinearTeamId?.trim() ?? "");
      }
      if (workspace.workoutsLinearTeamId !== undefined) {
        setWorkoutsLinearTeamId(workspace.workoutsLinearTeamId?.trim() ?? "");
      }
      if (workspace.lettersLinearTeamId !== undefined) {
        setLettersLinearTeamId(workspace.lettersLinearTeamId?.trim() ?? "");
      }
      if (workspace.knowledgeBaseLinearTeamId !== undefined) {
        setKnowledgeBaseLinearTeamId(workspace.knowledgeBaseLinearTeamId?.trim() ?? "");
      }
      if (workspace.addressbookLinearTeamId !== undefined) {
        setAddressbookLinearTeamId(workspace.addressbookLinearTeamId?.trim() ?? "");
      }
      onWorkspaceTeamsUpdated?.({
        inboxLinearTeamId: workspace.inboxLinearTeamId,
        dailyLinearTeamId: workspace.dailyLinearTeamId,
        workoutsLinearTeamId: workspace.workoutsLinearTeamId,
        lettersLinearTeamId: workspace.lettersLinearTeamId,
        knowledgeBaseLinearTeamId: workspace.knowledgeBaseLinearTeamId,
      });
    },
    [onWorkspaceTeamsUpdated],
  );

  const loadAccountWorkspace = useCallback(async () => {
    workspaceLoadCountRef.current += 1;
    setWorkspaceTeamsLoading(true);
    const generation = workspaceLoadGenerationRef.current + 1;
    workspaceLoadGenerationRef.current = generation;
    try {
      const account = await getAccountWorkspace().catch(() => null);
      if (!account || workspaceLoadGenerationRef.current !== generation) {
        return;
      }
      applyWorkspaceTeams(account.workspace);
    } finally {
      workspaceLoadCountRef.current = Math.max(0, workspaceLoadCountRef.current - 1);
      if (workspaceLoadCountRef.current === 0) {
        setWorkspaceTeamsLoading(false);
      }
    }
  }, [applyWorkspaceTeams]);

  useEffect(() => {
    applyWorkspaceTeams({
      inboxLinearTeamId: initialInboxLinearTeamId,
      dailyLinearTeamId: initialDailyLinearTeamId,
      workoutsLinearTeamId: initialWorkoutsLinearTeamId,
      lettersLinearTeamId: initialLettersLinearTeamId,
      knowledgeBaseLinearTeamId: initialKnowledgeBaseLinearTeamId,
      addressbookLinearTeamId: initialAddressbookLinearTeamId,
    });
  }, [
    applyWorkspaceTeams,
    initialAddressbookLinearTeamId,
    initialDailyLinearTeamId,
    initialWorkoutsLinearTeamId,
    initialInboxLinearTeamId,
    initialKnowledgeBaseLinearTeamId,
    initialLettersLinearTeamId,
  ]);

  useEffect(() => {
    void (async () => {
      const settings = peekCachedSettings() ?? (await getSettings().catch(() => null));
      if (settings) {
        setComposerMode(
          composerModeFromSettings(settings.executionMode, settings.modelMode),
        );
      }
      if (settings?.issueLinkMode) {
        setIssueLinkMode(settings.issueLinkMode);
        setLinearIssueLinkMode(settings.issueLinkMode);
      }
      if (settings?.groceryLinearProjectId) {
        setGroceryLinearProjectId(settings.groceryLinearProjectId);
      }
      setProjectsPath(settings?.projectsPath ?? "");
      await loadAccountWorkspace();
      const paths = await resolveProfilePaths({
        userProfilePath: initialUserProfilePath ?? settings?.userProfilePath,
        agentProfilePath: initialAgentProfilePath ?? settings?.agentProfilePath,
      });
      setUserProfilePath(paths.userProfilePath);
      setAgentProfilePath(paths.agentProfilePath);
    })();
  }, [initialAgentProfilePath, initialUserProfilePath, loadAccountWorkspace]);

  useEffect(() => {
    if (activeTab !== "linear" || linearView !== "general") return;
    void loadAccountWorkspace();
  }, [activeTab, linearView, loadAccountWorkspace]);

  async function saveProfile() {
    if (!profileEditor) return;

    setSaving(true);
    setError(null);
    setSaveMessage(null);
    try {
      await updateProfileContent(profileEditor, profileDraft);
      setSaveMessage("Saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  async function save() {
    if (profileEditor) {
      await saveProfile();
      return;
    }

    setSaving(true);
    setError(null);
    setSaveMessage(null);
    try {
      if (activeTab === "linear" && linearView === "general") {
        const workspaceResult = await updateAccountWorkspace({
          inboxLinearTeamId: inboxLinearTeamId.trim() || null,
          dailyLinearTeamId: dailyLinearTeamId.trim() || null,
          workoutsLinearTeamId: workoutsLinearTeamId.trim() || null,
          lettersLinearTeamId: lettersLinearTeamId.trim() || null,
          knowledgeBaseLinearTeamId: knowledgeBaseLinearTeamId.trim() || null,
          addressbookLinearTeamId: addressbookLinearTeamId.trim() || null,
        });
        applyWorkspaceTeams(workspaceResult.workspace);
        await onSecretsUpdated?.();
      }

      const result = await updateSettings({
        notesPath: manualPath,
        vaultName: manualVaultName.trim() || null,
        projectsPath: projectsPath.trim() || null,
        ...settingsFromComposerMode(composerMode),
        issueLinkMode,
        groceryLinearProjectId: groceryLinearProjectId || null,
      });
      setComposerMode(
        composerModeFromSettings(result.executionMode, result.modelMode),
      );
      setIssueLinkMode(result.issueLinkMode);
      setLinearIssueLinkMode(result.issueLinkMode);
      setGroceryLinearProjectId(result.groceryLinearProjectId ?? "");
      setProjectsPath(result.projectsPath ?? "");
      setSaveMessage("Saved");
      onUpdated(manualPath, result.vaultName ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="settings-panel">
      <div
        className={[
          "settings-panel-body",
          profileEditor ? "settings-panel-body--editor" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="settings-content-container">
          <header className="settings-content-header">
            {profileEditor && profileEditorMeta ? (
              <>
                <div className="settings-content-title-row">
                  <button
                    type="button"
                    className="settings-back-button"
                    onClick={() => setProfileEditor(null)}
                  >
                    Back
                  </button>
                  <h2 className="settings-content-title">{profileEditorMeta.title}</h2>
                </div>
                <p className="settings-content-description">{profileEditorMeta.description}</p>
              </>
            ) : resolvedActiveTab === "cursor" ? (
              <>
                <div className="settings-content-title-row settings-content-title-row--with-actions">
                  <div className="settings-content-title-group">
                    <h2 className="settings-content-title">{activeTabMeta.label}</h2>
                  </div>
                  <SettingsSectionToggle
                    value={cursorView}
                    options={CURSOR_VIEW_OPTIONS}
                    onChange={setCursorView}
                    ariaLabel="Cursor settings section"
                  />
                </div>
                <p className="settings-content-description">{activeTabMeta.description}</p>
              </>
            ) : resolvedActiveTab === "linear" ? (
              <>
                <div className="settings-content-title-row settings-content-title-row--with-actions">
                  <div className="settings-content-title-group">
                    <h2 className="settings-content-title">{activeTabMeta.label}</h2>
                  </div>
                  <SettingsSectionToggle
                    value={linearView}
                    options={LINEAR_VIEW_OPTIONS}
                    onChange={setLinearView}
                    ariaLabel="Linear settings section"
                  />
                </div>
                <p className="settings-content-description">{activeTabMeta.description}</p>
              </>
            ) : (
              <>
                <div className="settings-content-title-row">
                  <h2 className="settings-content-title">{activeTabMeta.label}</h2>
                </div>
                <p className="settings-content-description">{activeTabMeta.description}</p>
              </>
            )}
          </header>

          {profileEditor && profileEditorMeta ? (
            <ProfileEditorSection
              label={profileEditorMeta.title}
              pathHint={
                profileEditor === "agent"
                  ? agentProfilePath
                    ? `File: ${agentProfilePath}`
                    : undefined
                  : userProfilePath
                    ? `File: ${userProfilePath}`
                    : undefined
              }
              value={profileDraft}
              loading={profileLoading}
              disabled={saving || profileLoading}
              onChange={setProfileDraft}
            />
          ) : null}

          {activeTab === "general" && !profileEditor && (
            <GeneralSettingsSection
              saving={saving}
              projectsPath={projectsPath}
              onProjectsPathChange={setProjectsPath}
            />
          )}

          {isIntegrationNavTab(activeTab) && !profileEditor && (
            <IntegrationSettingsSection
              activeTab={activeTab}
              cursorView={cursorView}
              linearView={linearView}
              issueLinkMode={issueLinkMode}
              groceryLinearProjectId={groceryLinearProjectId}
              inboxLinearTeamId={inboxLinearTeamId}
              dailyLinearTeamId={dailyLinearTeamId}
              workoutsLinearTeamId={workoutsLinearTeamId}
              lettersLinearTeamId={lettersLinearTeamId}
              knowledgeBaseLinearTeamId={knowledgeBaseLinearTeamId}
              addressbookLinearTeamId={addressbookLinearTeamId}
              workspaceTeamsLoading={workspaceTeamsLoading}
              saving={saving}
              integrationsStatus={integrationsStatus}
              onIssueLinkModeChange={setIssueLinkMode}
              onGroceryLinearProjectIdChange={setGroceryLinearProjectId}
              onInboxLinearTeamIdChange={setInboxLinearTeamId}
              onDailyLinearTeamIdChange={setDailyLinearTeamId}
              onWorkoutsLinearTeamIdChange={setWorkoutsLinearTeamId}
              onLettersLinearTeamIdChange={setLettersLinearTeamId}
              onKnowledgeBaseLinearTeamIdChange={setKnowledgeBaseLinearTeamId}
              onAddressbookLinearTeamIdChange={setAddressbookLinearTeamId}
              onSecretsUpdated={handleSecretsUpdated}
              onServerAccessSaved={onServerAccessSaved}
              onAccountDeleted={onAccountDeleted}
              composerMode={composerMode}
              onComposerModeChange={setComposerMode}
              userProfilePath={userProfilePath}
              agentProfilePath={agentProfilePath}
              onEditAgentProfile={() => setProfileEditor("agent")}
              onEditUserProfile={() => setProfileEditor("user")}
            />
          )}

          {vaultEnabled && activeTab === "obsidian" && (
            <ObsidianSettingsSection
              notesPath={notesPath}
              defaultNotesPath={defaultNotesPath}
              manualPath={manualPath}
              manualVaultName={manualVaultName}
              onManualPathChange={setManualPath}
              onManualVaultNameChange={setManualVaultName}
            />
          )}

          {isAdministratorNavTab(activeTab) && !profileEditor && isAdministrator && (
            <AdministratorSettingsSection activeTab={activeTab} />
          )}
        </div>
      </div>

      {showSaveFooter && (
        <div className="settings-footer">
          {error ? (
            <p className="error-text settings-footer-status settings-footer-status--error">{error}</p>
          ) : saveMessage ? (
            <p className="settings-footer-status settings-footer-status--ok" role="status">
              {saveMessage}
            </p>
          ) : (
            <span className="settings-footer-status" aria-hidden="true" />
          )}
          <button
            type="button"
            className="btn-primary settings-save-button"
            onClick={() => {
              void save();
            }}
            disabled={saving || profileLoading}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      )}
    </div>
  );
}
