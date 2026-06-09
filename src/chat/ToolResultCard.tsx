export function ToolResultCard({
  toolName,
  result,
}: {
  toolName: string;
  result?: unknown;
}) {
  return (
    <details className="tool-result-card">
      <summary>{toolName}</summary>
      <pre>{JSON.stringify(result, null, 2)}</pre>
    </details>
  );
}
