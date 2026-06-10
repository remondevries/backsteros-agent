import type { CalendarEventEntity, LinearIssueEntity, MarkdownFileEntity, StructuredPayload, WhoopSnapshotEntity } from "./types";
import { CalendarEventRow } from "./CalendarEventRow";
import { FileDiffRow } from "./FileDiffRow";
import { ObsidianNoteRow } from "./ObsidianNoteRow";
import { LinearIssueRow } from "./LinearIssueRow";
import { LinearUrgentIssuesHeader } from "./LinearUrgentIssuesHeader";
import { LinearCompletedIssuesHeader } from "./LinearCompletedIssuesHeader";
import { WhoopSnapshotBrand, WhoopSnapshotCard } from "./WhoopSnapshotCard";
import { filterOpenLinearIssues, isValidLinearIssueDisplay, linearItemKey } from "./linearIssue";

export function EntityListCard({
  payload,
  whoopSnapshot,
  showUrgentIssuesHeader = false,
  showCompletedIssuesHeader = false,
}: {
  payload: StructuredPayload;
  whoopSnapshot?: WhoopSnapshotEntity;
  showUrgentIssuesHeader?: boolean;
  showCompletedIssuesHeader?: boolean;
}) {
  if (payload.type === "linear_issues") {
    const items = filterOpenLinearIssues(payload.items.filter(isValidLinearIssueDisplay));
    if (items.length === 0) return null;

    const list = (
      <div className="entity-list-card entity-list-card-linear">
        {items.map((item: LinearIssueEntity) => (
          <LinearIssueRow key={linearItemKey(item)} item={item} />
        ))}
      </div>
    );

    if (!showUrgentIssuesHeader) {
      return list;
    }

    return (
      <div className="entity-source-block entity-source-block--section-intro">
        <LinearUrgentIssuesHeader />
        {list}
      </div>
    );
  }

  if (payload.type === "linear_issues_completed") {
    const items = payload.items.filter(isValidLinearIssueDisplay);
    if (items.length === 0) return null;

    const list = (
      <div className="entity-list-card entity-list-card-linear">
        {items.map((item: LinearIssueEntity) => (
          <LinearIssueRow key={linearItemKey(item)} item={item} />
        ))}
      </div>
    );

    if (!showCompletedIssuesHeader) {
      return list;
    }

    return (
      <div className="entity-source-block entity-source-block--section-intro">
        <LinearCompletedIssuesHeader />
        {list}
      </div>
    );
  }

  if (payload.type === "markdown_files") {
    if (payload.items.length === 0) return null;

    return (
      <div className="entity-list-card entity-list-card-obsidian">
        {payload.items.map((item: MarkdownFileEntity) => (
          <ObsidianNoteRow key={item.path} item={item} />
        ))}
      </div>
    );
  }

  if (payload.type === "calendar_events") {
    if (payload.items.length === 0) return null;

    return (
      <div className="entity-list-card entity-list-card-calendar">
        {payload.items.map((item: CalendarEventEntity) => (
          <CalendarEventRow key={item.id} item={item} />
        ))}
      </div>
    );
  }

  if (payload.type === "whoop_snapshots") {
    if (payload.items.length === 0) return null;

    return (
      <div className="entity-source-block">
        <WhoopSnapshotBrand />
        <div className="whoop-snapshots-card">
          {payload.items.map((item: WhoopSnapshotEntity) => (
            <WhoopSnapshotCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    );
  }

  if (payload.type === "file_diff") {
    return (
      <FileDiffRow
        path={payload.path}
        summary={payload.summary}
        whoopSnapshot={whoopSnapshot}
      />
    );
  }

  return null;
}
