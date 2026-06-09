export function ContextChip({
  id,
  title,
}: {
  id: string;
  title: string;
}) {
  return (
    <span className="context-chip">
      <span className="context-chip-icon">◎</span>
      {id} {title !== id ? title : "added to context"}
    </span>
  );
}
