import type { MarkdownFileEntity } from "./types";
import { getObsidianNoteKindLabel, VaultNoteIcon } from "./VaultNoteIcon";
import { useVault } from "./VaultContext";

export function ObsidianNoteRow({ item }: { item: MarkdownFileEntity }) {
  const vault = useVault();
  const kindLabel = getObsidianNoteKindLabel(item.path);
  const row = (
    <>
      <span className="entity-icon">
        <VaultNoteIcon path={item.path} />
      </span>
      <span className="obsidian-note-kind">{kindLabel}</span>
      <span className="entity-title">{item.title ?? item.path}</span>
    </>
  );

  if (!vault) {
    return <div className="entity-row obsidian-note-row">{row}</div>;
  }

  const href = vault.buildNoteUri(item.path);

  return (
    <a
      className="entity-row obsidian-note-row obsidian-note-row-link"
      href={href}
      onClick={(event) => {
        event.preventDefault();
        void vault.openNote(item.path);
      }}
    >
      {row}
    </a>
  );
}
