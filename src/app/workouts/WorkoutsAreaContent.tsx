import type { ReactNode } from "react";
import { useWorkoutDashboardGraphScroll } from "../../hooks/useWorkoutDashboardGraphScroll";
import { WorkoutPeriodViewTabs } from "./WorkoutPeriodViewTabs";
import { WorkoutsDashboardScrollProvider } from "./WorkoutsDashboardScrollContext";
import { useWorkoutsPeriodView } from "./WorkoutsPeriodViewContext";

export function WorkoutsAreaContent({
  children,
  showPeriodTabs = true,
}: {
  children: ReactNode;
  showPeriodTabs?: boolean;
}) {
  const { periodView, setPeriodView } = useWorkoutsPeriodView();
  const { scrollRef, graphCollapsed } = useWorkoutDashboardGraphScroll(showPeriodTabs);

  const content = (
    <div
      className={`linear-workspace-content linear-project-content${
        showPeriodTabs ? " workouts-area-content--dashboard" : " workouts-area-content--session"
      }`}
    >
      {showPeriodTabs ? (
        <WorkoutPeriodViewTabs activeView={periodView} onChange={setPeriodView} />
      ) : null}
      <div
        ref={showPeriodTabs ? scrollRef : undefined}
        className={[
          "linear-project-view-body",
          showPeriodTabs ? "workspace-status-list-scroll workouts-area-view-body--dashboard" : null,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {children}
      </div>
    </div>
  );

  if (!showPeriodTabs) {
    return content;
  }

  return (
    <WorkoutsDashboardScrollProvider graphCollapsed={graphCollapsed}>
      {content}
    </WorkoutsDashboardScrollProvider>
  );
}
