import { InlineDetailPill } from "./InlineDetailPill";
import { VaultNoteIcon } from "./VaultNoteIcon";
import { useVault } from "./VaultContext";

export function VaultNoteLinkLabel({
  label,
  path,
}: {
  label: string;
  path: string;
}) {
  const vault = useVault();

  if (!vault) {
    return (
      <InlineDetailPill
        icon={<VaultNoteIcon path={path} />}
        value={label}
        onClick={() => undefined}
        ariaLabel={label}
        title={path}
      />
    );
  }

  return (
    <InlineDetailPill
      icon={<VaultNoteIcon path={path} />}
      value={label}
      onClick={() => {
        void vault.openNote(path);
      }}
      ariaLabel={`${label} — open in Obsidian`}
      title="Open in Obsidian"
    />
  );
}
