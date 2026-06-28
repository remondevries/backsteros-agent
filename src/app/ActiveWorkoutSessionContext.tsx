import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { useLinearWorkoutMilestones } from "../hooks/useLinearWorkoutMilestones";
import { onWorkoutSessionChanged } from "../lib/workoutSessionEvents";
import { formatWorkoutDayLabel } from "../lib/workouts/workoutsBreadcrumb";
import {
  findLatestActiveWorkoutMilestone,
  isWorkoutMilestoneActive,
} from "../lib/workouts/workoutMilestoneActive";
import { workoutMilestoneDateKey } from "../lib/workouts/workoutMilestoneGroups";
import { workoutsDayPath } from "../lib/workouts/workoutDays";
import type { SidebarNavItemId } from "../lib/sidebarNavItems";
import { useContentPanelNavigation } from "./contentPanelNavigation";

type ActiveWorkoutSessionContextValue = {
  isActive: boolean;
  dateKey: string | null;
  sessionLabel: string | null;
  openWorkoutSession: () => void;
};

const ActiveWorkoutSessionContext = createContext<ActiveWorkoutSessionContextValue | null>(null);

export function ActiveWorkoutSessionProvider({
  teamId,
  children,
  onVaultNavItemChange,
}: {
  teamId: string | null;
  children: ReactNode;
  onVaultNavItemChange: (item: SidebarNavItemId) => void;
}) {
  const normalizedTeamId = teamId?.trim() ?? "";
  const enabled = Boolean(normalizedTeamId);
  const { milestones, refreshInBackground } = useLinearWorkoutMilestones({
    teamId: normalizedTeamId,
    enabled,
  });
  const {
    clearActiveLinearDocument,
    clearActiveLinearIssue,
    resetProjectsOverview,
    setActiveVaultDocument,
  } = useContentPanelNavigation();

  const activeMilestone = useMemo(
    () => findLatestActiveWorkoutMilestone(milestones),
    [milestones],
  );
  const dateKey = activeMilestone ? workoutMilestoneDateKey(activeMilestone) : null;
  const sessionLabel = dateKey ? formatWorkoutDayLabel(dateKey) : null;

  useEffect(() => {
    if (!enabled) return;
    return onWorkoutSessionChanged(() => {
      void refreshInBackground();
    });
  }, [enabled, refreshInBackground]);

  useEffect(() => {
    if (!enabled) return;
    const intervalId = window.setInterval(() => {
      void refreshInBackground();
    }, 45_000);
    return () => window.clearInterval(intervalId);
  }, [enabled, refreshInBackground]);

  const openWorkoutSession = useCallback(() => {
    if (!dateKey) return;
    clearActiveLinearIssue();
    clearActiveLinearDocument();
    resetProjectsOverview();
    onVaultNavItemChange("workouts");
    setActiveVaultDocument({
      path: workoutsDayPath(dateKey),
      title: sessionLabel ?? dateKey,
    });
  }, [
    clearActiveLinearDocument,
    clearActiveLinearIssue,
    dateKey,
    onVaultNavItemChange,
    resetProjectsOverview,
    sessionLabel,
    setActiveVaultDocument,
  ]);

  const value = useMemo(
    () => ({
      isActive: activeMilestone !== null && isWorkoutMilestoneActive(activeMilestone),
      dateKey,
      sessionLabel,
      openWorkoutSession,
    }),
    [activeMilestone, dateKey, openWorkoutSession, sessionLabel],
  );

  return (
    <ActiveWorkoutSessionContext.Provider value={value}>{children}</ActiveWorkoutSessionContext.Provider>
  );
}

export function useActiveWorkoutSession(): ActiveWorkoutSessionContextValue {
  const context = useContext(ActiveWorkoutSessionContext);
  if (!context) {
    throw new Error("useActiveWorkoutSession must be used within ActiveWorkoutSessionProvider");
  }
  return context;
}
