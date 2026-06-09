export function isObsidianApprovalAction(action: string): boolean {
  return (
    action === "write_workspace_file" ||
    action === "append_workspace_file" ||
    action.includes("write_workspace") ||
    action.includes("append_workspace")
  );
}
