import { useEffect, useState } from "react";
import { useRunPlaybackActive } from "../hooks/useTtsPlayback";
import { ActivityHeader, ActivityStepRow, ActivityTimeline } from "./ActivityTimeline";
import { ApprovalCard } from "./ApprovalCard";
import { collectTableEntityBrands, EntityBrand } from "./entityBrands";
import { BacksterBrandHeader } from "./BacksterAssistantBlock";
import { GeminiBrandHeader } from "../lookup/GeminiBrand";
import { EntityListCard } from "./EntityListCard";
import { WhoopSnapshotBrand } from "./WhoopSnapshotCard";
import { MessageActions } from "./MessageActions";
import { TerminalTypingText } from "./TerminalTypingText";
import { UpdateConfirmationPresentation } from "./UpdateConfirmationPresentation";
import { parseUpdateConfirmationToken, formatUpdateConfirmationMessage } from "./updateConfirmation";
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
  animate = true,
  onOpenLinearDashboard,
  onOpenWhoopDashboard,
  onPresentationComplete,
}: {
  run: RunViewModel;
  onToggle: () => void;
  onApprove: (approvalId: string) => void;
  onReject: (approvalId: string) => void;
  canSpeak?: boolean;
  voiceModeEnabled?: boolean;
  sourceBrand?: "backster" | "gemini";
  animate?: boolean;
  onOpenLinearDashboard?: () => void;
  onOpenWhoopDashboard?: () => void;
  onPresentationComplete?: () => void;
}) {
  const running = run.status === "running";
  const [typingComplete, setTypingComplete] = useState(false);
  const readingAloud = useRunPlaybackActive(voiceModeEnabled ? run.runId : "");
  const updateConfirmation = parseUpdateConfirmationToken(run.text);
  const runActionText = updateConfirmation
    ? formatUpdateConfirmationMessage(updateConfirmation)
    : run.text;

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
  const hideRedundantText =
    !running && (hasFileDiff || showWhoopWidget) && updateConfirmation == null;
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
  const showGeminiBrand = sourceBrand === "gemini" && showTextBlock;
  const showEntityBrands =
    !showBacksterBrand &&
    !showGeminiBrand &&
    ((hasTableEntities && tableEntityBrands.length > 0) || showWhoopBrandForFileDiff);
  const textBelowBrand = showBacksterBrand || showGeminiBrand || textAboveEntities;

  const delayTableEntitiesUntilTypingComplete = showTextBlock && hasTableEntities;
  const showTableEntities = !delayTableEntitiesUntilTypingComplete || typingComplete;

  useEffect(() => {
    if (!animate || running || !onPresentationComplete) return;
    if (run.status !== "finished") return;
    if (showTextBlock && run.text.trim().length > 0) return;
    onPresentationComplete();
  }, [
    animate,
    running,
    onPresentationComplete,
    run.status,
    run.text,
    showTextBlock,
  ]);

  const textBlock = showTextBlock ? (() => {
    if (updateConfirmation) {
      return (
        <div className="run-text-block">
          <UpdateConfirmationPresentation
            what={updateConfirmation.what}
            where={updateConfirmation.where}
            message={updateConfirmation.message}
            running={running}
            startedAt={run.startedAt}
            readingAloud={readingAloud}
            animate={animate}
            onTypingComplete={() => {
              setTypingComplete(true);
              onPresentationComplete?.();
            }}
            onOpenLinearDashboard={onOpenLinearDashboard}
            onOpenWhoopDashboard={onOpenWhoopDashboard}
          />
        </div>
      );
    }

    return (
      <div className="run-text-block">
        <TerminalTypingText
          key={run.runId}
          text={run.text}
          running={running}
          startedAt={run.startedAt}
          readingAloud={readingAloud}
          animate={animate}
          onTypingComplete={() => {
            setTypingComplete(true);
            onPresentationComplete?.();
          }}
          onOpenLinearDashboard={onOpenLinearDashboard}
          onOpenWhoopDashboard={onOpenWhoopDashboard}
        />
      </div>
    );
  })() : null;

  return (
    <div className="run-block">
      {(showBacksterBrand || showGeminiBrand || showEntityBrands) ? (
        showBacksterBrand ? (
          <BacksterBrandHeader />
        ) : showGeminiBrand ? (
          <GeminiBrandHeader />
        ) : (
          <div className="run-entity-brands">
            <>
              {tableEntityBrands.map((entity) => (
                <EntityBrand key={entity.type} payload={entity} />
              ))}
              {showWhoopBrandForFileDiff && <WhoopSnapshotBrand />}
            </>
          </div>
        )
      ) : null}

      {textBelowBrand && textBlock}

      {run.entities.map((entity, index) => {
        if (entity.type === "file_diff" && updateConfirmation) {
          return null;
        }

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
        {runActionText.trim() && !hideRedundantText && !hideTextForApproval && (
          <MessageActions
            text={runActionText}
            playbackId={run.runId}
            canSpeak={canSpeak}
            showCopy={!running && typingComplete}
          />
        )}
      </div>
    </div>
  );
}
