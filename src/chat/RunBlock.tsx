import { useEffect, useState } from "react";
import { useRunPlaybackActive } from "../hooks/useTtsPlayback";
import { ActivityHeader, ActivityStepRow, ActivityTimeline } from "./ActivityTimeline";
import { ApprovalCard } from "./ApprovalCard";
import { collectTableEntityBrands, EntityBrand } from "./entityBrands";
import { BacksterBrand } from "./BacksterBrand";
import { EntityListCard } from "./EntityListCard";
import { WhoopSnapshotBrand } from "./WhoopSnapshotCard";
import { MessageActions } from "./MessageActions";
import { TerminalTypingText } from "./TerminalTypingText";
import { ToolResultCard } from "./ToolResultCard";
import type { RunViewModel } from "./types";

export function RunBlock({
  run,
  onToggle,
  onApprove,
  onReject,
  canSpeak,
  voiceModeEnabled = false,
  sourceBrand,
  typingAnimated = false,
  onOpenLinearDashboard,
  onOpenWhoopDashboard,
}: {
  run: RunViewModel;
  onToggle: () => void;
  onApprove: (approvalId: string) => void;
  onReject: (approvalId: string) => void;
  canSpeak?: boolean;
  voiceModeEnabled?: boolean;
  sourceBrand?: "backster";
  typingAnimated?: boolean;
  onOpenLinearDashboard?: () => void;
  onOpenWhoopDashboard?: () => void;
}) {
  const running = run.status === "running";
  const [typingComplete, setTypingComplete] = useState(false);
  const readingAloud = useRunPlaybackActive(voiceModeEnabled ? run.runId : "");

  useEffect(() => {
    if (running) {
      setTypingComplete(false);
    }
  }, [running]);

  const hasFileDiff = run.entities.some((entity) => entity.type === "file_diff");
  const hasWhoopSnapshots = run.entities.some(
    (entity) => entity.type === "whoop_snapshots" && entity.items.length > 0,
  );
  const showWhoopWidget = hasWhoopSnapshots && !hasFileDiff;
  const showWhoopBrandForFileDiff = hasFileDiff && hasWhoopSnapshots;
  const whoopSnapshotForFileDiff = run.entities.find(
    (entity) => entity.type === "whoop_snapshots",
  )?.items[0];
  const hideRedundantText = !running && (hasFileDiff || showWhoopWidget);
  const hasPendingApproval = run.approvals.some((approval) => !approval.resolved);
  const hideTextForApproval = hasPendingApproval && run.text.trim().length > 0;
  const showTextBlock =
    (running || run.text.length > 0) && !hideRedundantText && !hideTextForApproval;
  const hasTableEntities = run.entities.some(
    (entity) =>
      entity.type === "linear_issues" ||
      entity.type === "linear_issues_completed" ||
      entity.type === "calendar_events" ||
      entity.type === "markdown_files",
  );
  const textAboveEntities = hasTableEntities && showTextBlock;
  const tableEntityBrands = collectTableEntityBrands(run.entities);
  const showBacksterBrand = sourceBrand === "backster" && showTextBlock;
  const showEntityBrands =
    !showBacksterBrand &&
    ((hasTableEntities && tableEntityBrands.length > 0) || showWhoopBrandForFileDiff);
  const textBelowBrand = showBacksterBrand || textAboveEntities;

  const delayTableEntitiesUntilTypingComplete =
    showTextBlock && typingAnimated && hasTableEntities;
  const showTableEntities = !delayTableEntitiesUntilTypingComplete || typingComplete;

  const textBlock = showTextBlock ? (
    <div className="run-text-block">
      <TerminalTypingText
        key={run.runId}
        text={run.text}
        running={running}
        readingAloud={readingAloud}
        liveStream={voiceModeEnabled && running}
        typingAnimated={typingAnimated}
        onTypingComplete={() => setTypingComplete(true)}
        onOpenLinearDashboard={onOpenLinearDashboard}
        onOpenWhoopDashboard={onOpenWhoopDashboard}
      />
    </div>
  ) : null;

  return (
    <div className="run-block">
      {(showBacksterBrand || showEntityBrands) ? (
        <div className="run-entity-brands">
          {showBacksterBrand ? (
            <BacksterBrand />
          ) : (
            <>
              {tableEntityBrands.map((entity) => (
                <EntityBrand key={entity.type} payload={entity} />
              ))}
              {showWhoopBrandForFileDiff && <WhoopSnapshotBrand />}
            </>
          )}
        </div>
      ) : null}

      {textBelowBrand && textBlock}

      {run.entities.map((entity, index) => {
        if (entity.type === "whoop_snapshots" && hasFileDiff) {
          return null;
        }

        if (
          !showTableEntities &&
          (entity.type === "linear_issues" ||
            entity.type === "linear_issues_completed" ||
            entity.type === "calendar_events" ||
            entity.type === "markdown_files")
        ) {
          return null;
        }

        const whoopSnapshot =
          entity.type === "file_diff" ? whoopSnapshotForFileDiff : undefined;

        return (
          <EntityListCard
            key={`${run.runId}-entity-${index}`}
            payload={entity}
            whoopSnapshot={whoopSnapshot}
            showUrgentIssuesHeader={sourceBrand === "backster" && entity.type === "linear_issues"}
            showCompletedIssuesHeader={
              sourceBrand === "backster" && entity.type === "linear_issues_completed"
            }
          />
        );
      })}

      {!textBelowBrand && textBlock}

      {run.approvals.map((approval) => (
        <ApprovalCard
          key={approval.approvalId}
          summary={approval.summary}
          action={approval.action}
          path={approval.path}
          description={
            !approval.resolved && run.text.trim() ? run.text : undefined
          }
          resolved={approval.resolved}
          approved={approval.approved}
          onApprove={() => onApprove(approval.approvalId)}
          onReject={() => onReject(approval.approvalId)}
        />
      ))}

      {!run.entities.length && run.status === "finished" && !run.text && (
        <ToolResultCard toolName="run" result={{ status: run.status }} />
      )}

      <div className="run-footer">
        <ActivityHeader
          durationMs={run.durationMs}
          expanded={run.expanded}
          onToggle={onToggle}
          running={running}
          sentAt={run.finishedAt ?? run.startedAt}
        />
        {run.expanded && run.steps.length > 0 && (
          <ActivityTimeline
            running={running}
            scrollKey={run.steps.map((step) => `${step.stepId}:${step.status}:${step.label}`).join("|")}
          >
            {run.steps.map((step) => (
              <ActivityStepRow key={step.stepId} {...step} />
            ))}
          </ActivityTimeline>
        )}
        {run.text.trim() && !hideRedundantText && !hideTextForApproval && (
          <MessageActions
            text={run.text}
            playbackId={run.runId}
            canSpeak={canSpeak}
            showCopy={!running && typingComplete}
          />
        )}
      </div>
    </div>
  );
}
