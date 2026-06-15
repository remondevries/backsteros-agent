import { useWhoopDaySnapshot } from "../../hooks/useWhoopDaySnapshot";
import { DocumentNoteIcon } from "./DocumentNoteIcon";
import { DailyGymIndicator } from "./DailyGymIndicator";
import { VaultDocumentWhoopHeader } from "./VaultDocumentWhoopHeader";

export function DailyJournalDocumentLeading({
  date,
  enabled,
  refreshKey,
  workoutsLinearTeamId = null,
}: {
  date: string | null;
  enabled: boolean;
  refreshKey?: number;
  workoutsLinearTeamId?: string | null;
}) {
  const showWhoop = enabled && Boolean(date);
  const { snapshot, loading, authenticated } = useWhoopDaySnapshot(date, {
    enabled: showWhoop,
    refreshKey,
  });

  if (!showWhoop) {
    return (
      <div className="vault-document-icon" aria-hidden="true">
        <DocumentNoteIcon size={16} />
      </div>
    );
  }

  if (authenticated === false) {
    return (
      <div className="vault-document-icon" aria-hidden="true">
        <DocumentNoteIcon size={16} />
      </div>
    );
  }

  if (loading && authenticated == null) {
    return (
      <p className="vault-document-whoop-status vault-document-leading-whoop">Loading Whoop…</p>
    );
  }

  if (snapshot) {
    return (
      <div className="vault-document-leading-whoop" aria-hidden="true">
        <VaultDocumentWhoopHeader
          snapshot={snapshot}
          trailing={
            <DailyGymIndicator
              date={date}
              teamId={workoutsLinearTeamId}
              enabled={enabled}
            />
          }
        />
      </div>
    );
  }

  return (
    <div className="vault-document-icon" aria-hidden="true">
      <DocumentNoteIcon size={16} />
    </div>
  );
}
