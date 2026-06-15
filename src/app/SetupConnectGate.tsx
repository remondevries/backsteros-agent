import { useCallback, useEffect, useState } from "react";
import { useLinearTeams } from "../hooks/useLinearTeams";
import { getAccountWorkspace, updateAccountWorkspace } from "../lib/api";
import { LinearWorkspaceTeamFields } from "../settings/LinearWorkspaceTeamFields";
import { ConnectGateShell } from "./ConnectGateShell";

const EMPTY_TEAM_VALUE = "";

export function SetupConnectGate({
  onComplete,
  onLinearStepClick,
  onCursorStepClick,
}: {
  onComplete: () => void | Promise<void>;
  onLinearStepClick?: () => void;
  onCursorStepClick?: () => void;
}) {
  const [inboxTeamId, setInboxTeamId] = useState(EMPTY_TEAM_VALUE);
  const [dailyTeamId, setDailyTeamId] = useState(EMPTY_TEAM_VALUE);
  const [workoutsTeamId, setWorkoutsTeamId] = useState(EMPTY_TEAM_VALUE);
  const [lettersTeamId, setLettersTeamId] = useState(EMPTY_TEAM_VALUE);
  const [knowledgeBaseTeamId, setKnowledgeBaseTeamId] = useState(EMPTY_TEAM_VALUE);
  const [addressbookTeamId, setAddressbookTeamId] = useState(EMPTY_TEAM_VALUE);
  const [isAdministrator, setIsAdministrator] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { teams, loading: teamsLoading, error: teamsError } = useLinearTeams(true);
  const teamsUnavailable = teams.length === 0 && !teamsLoading && !settingsLoading;
  const formDisabled = saving || teamsUnavailable;

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const account = await getAccountWorkspace();
        if (!active) return;
        setIsAdministrator(account.isAdministrator);
        setInboxTeamId(account.workspace.inboxLinearTeamId ?? EMPTY_TEAM_VALUE);
        setDailyTeamId(account.workspace.dailyLinearTeamId ?? EMPTY_TEAM_VALUE);
        setWorkoutsTeamId(account.workspace.workoutsLinearTeamId ?? EMPTY_TEAM_VALUE);
        setLettersTeamId(account.workspace.lettersLinearTeamId ?? EMPTY_TEAM_VALUE);
        setKnowledgeBaseTeamId(account.workspace.knowledgeBaseLinearTeamId ?? EMPTY_TEAM_VALUE);
        setAddressbookTeamId(account.workspace.addressbookLinearTeamId ?? EMPTY_TEAM_VALUE);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load setup");
      } finally {
        if (active) {
          setSettingsLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (teamsError) {
      setError(teamsError);
    }
  }, [teamsError]);

  const handleFinish = useCallback(async () => {
    const workoutsRequired = isAdministrator;
    if (
      !inboxTeamId ||
      !dailyTeamId ||
      (workoutsRequired && !workoutsTeamId) ||
      !lettersTeamId ||
      !knowledgeBaseTeamId ||
      !addressbookTeamId
    ) {
      setError("Please answer all questions before continuing.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await updateAccountWorkspace({
        inboxLinearTeamId: inboxTeamId,
        dailyLinearTeamId: dailyTeamId,
        workoutsLinearTeamId: workoutsRequired ? workoutsTeamId : null,
        lettersLinearTeamId: lettersTeamId,
        knowledgeBaseLinearTeamId: knowledgeBaseTeamId,
        addressbookLinearTeamId: addressbookTeamId,
        markSetupComplete: true,
      });
      await onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save setup");
      setSaving(false);
    }
  }, [
    addressbookTeamId,
    dailyTeamId,
    inboxTeamId,
    isAdministrator,
    knowledgeBaseTeamId,
    lettersTeamId,
    onComplete,
    workoutsTeamId,
  ]);

  return (
    <ConnectGateShell
      brand="backster"
      progressStep="setup"
      linearStepComplete
      cursorStepComplete
      onProgressStepClick={(step) => {
        if (step === "linear") {
          onLinearStepClick?.();
        } else if (step === "cursor") {
          onCursorStepClick?.();
        }
      }}
      title="A few quick questions"
      description={
        isAdministrator
          ? "Tell BacksterOS where your inbox, daily notes, workouts, letters, knowledge base, and contacts live in Linear."
          : "Tell BacksterOS where your inbox, daily notes, letters, knowledge base, and contacts live in Linear."
      }
      className="linear-connect-gate--setup"
    >
      <div className="linear-connect-gate-body linear-connect-gate-setup-form">
        <LinearWorkspaceTeamFields
          layout="setup"
          idPrefix="setup"
          inboxTeamId={inboxTeamId}
          dailyTeamId={dailyTeamId}
          workoutsTeamId={workoutsTeamId}
          lettersTeamId={lettersTeamId}
          knowledgeBaseTeamId={knowledgeBaseTeamId}
          addressbookTeamId={addressbookTeamId}
          workspaceTeamsLoading={settingsLoading}
          onInboxTeamIdChange={setInboxTeamId}
          onDailyTeamIdChange={setDailyTeamId}
          onWorkoutsTeamIdChange={setWorkoutsTeamId}
          onLettersTeamIdChange={setLettersTeamId}
          onKnowledgeBaseTeamIdChange={setKnowledgeBaseTeamId}
          onAddressbookTeamIdChange={setAddressbookTeamId}
          disabled={formDisabled}
        />
        <div className="linear-connect-gate-actions">
          <button
            type="button"
            className="btn-primary linear-connect-gate-primary"
            disabled={formDisabled || settingsLoading || teamsLoading}
            onClick={() => {
              void handleFinish();
            }}
          >
            {saving ? "Saving…" : "Finish setup"}
          </button>
        </div>
        {error ? (
          <p className="linear-connect-gate-description linear-connect-gate-description--error">
            {error}
          </p>
        ) : null}
      </div>
    </ConnectGateShell>
  );
}
