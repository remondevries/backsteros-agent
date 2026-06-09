import type { WhoopSnapshotEntity } from "./types";
import { getObsidianNoteKindLabel, VaultNoteIcon } from "./VaultNoteIcon";
import { WhoopMetricDots } from "./WhoopMetricDots";
import { useVault } from "./VaultContext";

export function FileDiffRow({
  path,
  summary,
  whoopSnapshot,
}: {
  path: string;
  summary?: string;
  whoopSnapshot?: WhoopSnapshotEntity;
}) {
  const vault = useVault();
  const title = path.split("/").pop() ?? path;
  const row = (
    <>
      <span className="entity-icon">
        <VaultNoteIcon path={path} />
      </span>
      <span className="obsidian-note-kind">{getObsidianNoteKindLabel(path)}</span>
      <span className="entity-title">{summary ?? title}</span>
      {whoopSnapshot != null && <WhoopMetricDots snapshot={whoopSnapshot} />}
    </>
  );

  if (!vault) {
    return (
      <div className="entity-list-card entity-list-card-file-diff">
        <div className="entity-row entity-row-file-diff">{row}</div>
      </div>
    );
  }

  const href = vault.buildNoteUri(path);

  return (
    <div className="entity-list-card entity-list-card-file-diff">
      <a
        className="entity-row entity-row-file-diff obsidian-note-row-link"
        href={href}
        onClick={(event) => {
          event.preventDefault();
          void vault.openNote(path);
        }}
      >
        {row}
      </a>
    </div>
  );
}
