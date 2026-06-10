export type LookupOutputFormat = "default" | "bullets" | "action-items" | "outline";

export function normalizeLookupOutputFormat(value: string | undefined): LookupOutputFormat {
  if (value === "bullets" || value === "action-items" || value === "outline") {
    return value;
  }
  return "default";
}

export function lookupOutputFormatLabel(format: LookupOutputFormat): string {
  switch (format) {
    case "bullets":
      return "Bullet summary";
    case "action-items":
      return "Action items";
    case "outline":
      return "Outline";
    default:
      return "Default";
  }
}

export function buildLookupOutputInstruction(format: LookupOutputFormat): string | null {
  switch (format) {
    case "bullets":
      return "Format the answer as a concise bullet list. Lead with the most important points.";
    case "action-items":
      return "Format the answer as actionable checklist items using markdown checkboxes (`- [ ] item`). Group related items under short headings when helpful.";
    case "outline":
      return "Format the answer as a structured outline with markdown headings (`##`, `###`) and short sections.";
    default:
      return null;
  }
}

export function appendOutputFormatInstruction(
  baseInstruction: string,
  format: LookupOutputFormat,
): string {
  const addition = buildLookupOutputInstruction(format);
  if (!addition) return baseInstruction;
  return `${baseInstruction}\n- ${addition}`;
}
