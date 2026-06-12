export type LinearWorkspaceSelection =
  | {
      kind: "team";
      id: string;
      name: string;
    }
  | {
      kind: "project";
      id: string;
      name: string;
    };

export function linearWorkspaceSelectionId(selection: LinearWorkspaceSelection): string {
  return `${selection.kind}-${selection.id}`;
}
