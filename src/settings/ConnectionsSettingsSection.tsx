import type { LinearIssueLinkMode } from "../chat/types";
import type { ComposerMode } from "../chat/composerMode";
import { CursorIntegrationSection, type CursorSettingsView } from "./CursorIntegrationSection";
import { ConnectionsCredentialsSection } from "./ConnectionsCredentialsSection";
import { GeminiIntegrationSection } from "./GeminiIntegrationSection";
import { GoogleCalendarIntegrationSection } from "./GoogleCalendarIntegrationSection";
import { GoogleGmailIntegrationSection } from "./GoogleGmailIntegrationSection";
import { LinearIntegrationSection, type LinearSettingsView } from "./LinearIntegrationSection";
import { WhoopIntegrationSection } from "./WhoopIntegrationSection";
import type { IntegrationsStatus } from "../lib/api";
import type { SettingsTabId } from "./settingsTabs";

export function IntegrationSettingsSection({
  activeTab,
  cursorView,
  linearView,
  issueLinkMode,
  groceryLinearProjectId,
  inboxLinearTeamId,
  dailyLinearTeamId,
  workoutsLinearTeamId,
  lettersLinearTeamId,
  knowledgeBaseLinearTeamId,
  addressbookLinearTeamId,
  workspaceTeamsLoading = false,
  saving,
  integrationsStatus,
  onIssueLinkModeChange,
  onGroceryLinearProjectIdChange,
  onInboxLinearTeamIdChange,
  onDailyLinearTeamIdChange,
  onWorkoutsLinearTeamIdChange,
  onLettersLinearTeamIdChange,
  onKnowledgeBaseLinearTeamIdChange,
  onAddressbookLinearTeamIdChange,
  onSecretsUpdated,
  onServerAccessSaved,
  onAccountDeleted,
  composerMode,
  onComposerModeChange,
  userProfilePath,
  agentProfilePath,
  onEditAgentProfile,
  onEditUserProfile,
}: {
  activeTab: SettingsTabId;
  cursorView: CursorSettingsView;
  linearView: LinearSettingsView;
  issueLinkMode: LinearIssueLinkMode;
  groceryLinearProjectId: string;
  inboxLinearTeamId: string;
  dailyLinearTeamId: string;
  workoutsLinearTeamId: string;
  lettersLinearTeamId: string;
  knowledgeBaseLinearTeamId: string;
  addressbookLinearTeamId: string;
  workspaceTeamsLoading?: boolean;
  saving: boolean;
  integrationsStatus: IntegrationsStatus | null;
  onIssueLinkModeChange: (mode: LinearIssueLinkMode) => void;
  onGroceryLinearProjectIdChange: (id: string) => void;
  onInboxLinearTeamIdChange: (teamId: string) => void;
  onDailyLinearTeamIdChange: (teamId: string) => void;
  onWorkoutsLinearTeamIdChange: (teamId: string) => void;
  onLettersLinearTeamIdChange: (teamId: string) => void;
  onKnowledgeBaseLinearTeamIdChange: (teamId: string) => void;
  onAddressbookLinearTeamIdChange: (teamId: string) => void;
  onSecretsUpdated?: () => void | Promise<void>;
  onServerAccessSaved?: () => void | Promise<void>;
  onAccountDeleted?: () => void | Promise<void>;
  composerMode: ComposerMode;
  onComposerModeChange: (mode: ComposerMode) => void;
  userProfilePath: string | null;
  agentProfilePath: string | null;
  onEditAgentProfile: () => void;
  onEditUserProfile: () => void;
}) {
  if (activeTab === "account") {
    return (
      <ConnectionsCredentialsSection
        saving={saving}
        integrationsStatus={integrationsStatus}
        onSecretsUpdated={onSecretsUpdated}
        onServerAccessSaved={onServerAccessSaved}
        onAccountDeleted={onAccountDeleted}
      />
    );
  }

  if (activeTab === "cursor") {
    return (
      <CursorIntegrationSection
        activeView={cursorView}
        composerMode={composerMode}
        saving={saving}
        userProfilePath={userProfilePath}
        agentProfilePath={agentProfilePath}
        onComposerModeChange={onComposerModeChange}
        onEditAgentProfile={onEditAgentProfile}
        onEditUserProfile={onEditUserProfile}
        onSecretsUpdated={onSecretsUpdated}
      />
    );
  }

  if (activeTab === "linear") {
    return (
      <LinearIntegrationSection
        activeView={linearView}
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
        onIssueLinkModeChange={onIssueLinkModeChange}
        onGroceryLinearProjectIdChange={onGroceryLinearProjectIdChange}
        onInboxLinearTeamIdChange={onInboxLinearTeamIdChange}
        onDailyLinearTeamIdChange={onDailyLinearTeamIdChange}
        onWorkoutsLinearTeamIdChange={onWorkoutsLinearTeamIdChange}
        onLettersLinearTeamIdChange={onLettersLinearTeamIdChange}
        onKnowledgeBaseLinearTeamIdChange={onKnowledgeBaseLinearTeamIdChange}
        onAddressbookLinearTeamIdChange={onAddressbookLinearTeamIdChange}
        onSecretsUpdated={onSecretsUpdated}
      />
    );
  }

  if (activeTab === "gemini") {
    return <GeminiIntegrationSection onSecretsUpdated={onSecretsUpdated} />;
  }

  if (activeTab === "google-calendar") {
    return <GoogleCalendarIntegrationSection onSecretsUpdated={onSecretsUpdated} />;
  }

  if (activeTab === "google-gmail") {
    return <GoogleGmailIntegrationSection />;
  }

  if (activeTab === "whoop") {
    return <WhoopIntegrationSection onSecretsUpdated={onSecretsUpdated} />;
  }

  return null;
}
