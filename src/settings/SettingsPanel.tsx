import { useCallback, useEffect, useMemo, useState } from "react";
import {
  composerModeFromSettings,
  settingsFromComposerMode,
  type ComposerMode,
} from "../chat/composerMode";
import type { LinearIssueLinkMode } from "../chat/types";
import { getProfileContent, getSettings, updateProfileContent, updateSettings, type ProfileKind } from "../lib/api";
import { setLinearIssueLinkMode } from "../lib/linear/linearLink";
import { resolveProfilePaths } from "../lib/profilePaths";
import { CursorIntegrationSection } from "./CursorIntegrationSection";
import { GeneralSettingsSection } from "./GeneralSettingsSection";
import { GeminiIntegrationSection } from "./GeminiIntegrationSection";
import { GoogleCalendarIntegrationSection } from "./GoogleCalendarIntegrationSection";
import { GoogleGmailIntegrationSection } from "./GoogleGmailIntegrationSection";
import {
  isSettingsTabConnected,
} from "./integrationConnectionStatus";
import { LinearIntegrationSection, type LinearSettingsView } from "./LinearIntegrationSection";
import { ObsidianSettingsSection } from "./ObsidianSettingsSection";
import { ProfileEditorSection } from "./ProfileEditorSection";
import { SettingsConnectionBadge } from "./SettingsConnectionBadge";
import { SettingsSectionToggle } from "./SettingsSectionToggle";
import { SETTINGS_TABS, type SettingsTabId } from "./settingsTabs";
import { useIntegrationsStatus } from "./useIntegrationsStatus";

const LINEAR_VIEW_OPTIONS: { value: LinearSettingsView; label: string }[] = [
  { value: "general", label: "General" },
  { value: "api-key", label: "API Key" },
  { value: "oauth", label: "OAuth" },
];

const LINEAR_VIEW_DESCRIPTIONS: Record<LinearSettingsView, string> = {
  general: "Connection status, issue links, and grocery list project.",
  "api-key": "Personal API key for Linear MCP tools and automations.",
  oauth: "OAuth app credentials and browser sign-in for issue control.",
};

export function SettingsPanel({
  activeTab,
  notesPath,
  vaultName,
  defaultNotesPath,
  initialModelMode: _initialModelMode = "auto",
  initialUserProfilePath,
  initialAgentProfilePath,
  onUpdated,
  onSecretsUpdated,
}: {
  activeTab: SettingsTabId;
  notesPath: string | null;
  vaultName?: string | null;
  defaultNotesPath: string;
  initialModelMode?: string;
  initialUserProfilePath?: string;
  initialAgentProfilePath?: string;
  onUpdated: (path: string, nextVaultName?: string | null) => void;
  onSecretsUpdated?: () => void | Promise<void>;
}) {
  const [manualPath, setManualPath] = useState(notesPath ?? defaultNotesPath);
  const [manualVaultName, setManualVaultName] = useState(vaultName ?? "");
  const [projectsPath, setProjectsPath] = useState("");
  const [composerMode, setComposerMode] = useState<ComposerMode>("auto");
  const [issueLinkMode, setIssueLinkMode] = useState<LinearIssueLinkMode>("external");
  const [groceryLinearProjectId, setGroceryLinearProjectId] = useState<string>("");
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

  const activeTabMeta = SETTINGS_TABS.find((tab) => tab.id === activeTab) ?? SETTINGS_TABS[0];
  const showSaveFooter =
    profileEditor !== null ||
    activeTab === "general" ||
    activeTab === "obsidian" ||
    (activeTab === "linear" && linearView === "general");
  const { status: integrationsStatus, refresh: refreshIntegrationsStatus } =
    useIntegrationsStatus(true);
  const connectionContext = useMemo(
    () => ({
      integrationsStatus,
      savedNotesPath: notesPath,
    }),
    [integrationsStatus, notesPath],
  );
  const showConnectionBadge = !profileEditor && isSettingsTabConnected(activeTab, connectionContext);

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

  useEffect(() => {
    void (async () => {
      const settings = await getSettings().catch(() => null);
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
      const paths = await resolveProfilePaths({
        userProfilePath: initialUserProfilePath ?? settings?.userProfilePath,
        agentProfilePath: initialAgentProfilePath ?? settings?.agentProfilePath,
      });
      setUserProfilePath(paths.userProfilePath);
      setAgentProfilePath(paths.agentProfilePath);
    })();
  }, [initialAgentProfilePath, initialUserProfilePath]);

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
            ) : activeTab === "linear" ? (
              <>
                <div className="settings-content-title-row settings-content-title-row--with-actions">
                  <div className="settings-content-title-group">
                    <h2 className="settings-content-title">{activeTabMeta.label}</h2>
                    {showConnectionBadge && <SettingsConnectionBadge />}
                  </div>
                  <SettingsSectionToggle
                    value={linearView}
                    options={LINEAR_VIEW_OPTIONS}
                    onChange={setLinearView}
                    ariaLabel="Linear settings section"
                  />
                </div>
                <p className="settings-content-description">
                  {LINEAR_VIEW_DESCRIPTIONS[linearView]}
                </p>
              </>
            ) : (
              <>
                <div className="settings-content-title-row">
                  <h2 className="settings-content-title">{activeTabMeta.label}</h2>
                  {showConnectionBadge && <SettingsConnectionBadge />}
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
              composerMode={composerMode}
              saving={saving}
              projectsPath={projectsPath}
              userProfilePath={userProfilePath}
              agentProfilePath={agentProfilePath}
              onComposerModeChange={setComposerMode}
              onProjectsPathChange={setProjectsPath}
              onEditAgentProfile={() => setProfileEditor("agent")}
              onEditUserProfile={() => setProfileEditor("user")}
            />
          )}

          {activeTab === "obsidian" && (
            <ObsidianSettingsSection
              notesPath={notesPath}
              defaultNotesPath={defaultNotesPath}
              manualPath={manualPath}
              manualVaultName={manualVaultName}
              onManualPathChange={setManualPath}
              onManualVaultNameChange={setManualVaultName}
            />
          )}

          {activeTab === "cursor" && (
            <CursorIntegrationSection onSecretsUpdated={handleSecretsUpdated} />
          )}

          {activeTab === "linear" && (
            <LinearIntegrationSection
              activeView={linearView}
              issueLinkMode={issueLinkMode}
              groceryLinearProjectId={groceryLinearProjectId}
              saving={saving}
              onIssueLinkModeChange={setIssueLinkMode}
              onGroceryLinearProjectIdChange={setGroceryLinearProjectId}
              onSecretsUpdated={handleSecretsUpdated}
            />
          )}

          {activeTab === "gemini" && (
            <GeminiIntegrationSection onSecretsUpdated={handleSecretsUpdated} />
          )}

          {activeTab === "google-calendar" && (
            <GoogleCalendarIntegrationSection onSecretsUpdated={handleSecretsUpdated} />
          )}

          {activeTab === "google-gmail" && <GoogleGmailIntegrationSection />}
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
