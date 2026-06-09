export function isDestructiveShellCommand(command: string): boolean {
  return /\brm\b|\bunlink\b|\bmv\b.*archive|\bdelete\b/i.test(command);
}
