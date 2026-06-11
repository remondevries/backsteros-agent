const DELETE_FILE_CONFIRM_TOKEN_RE =
  /^\{\{delete-file-confirm:([^|]+)\|([\s\S]+)\}\}$/;

export interface DeleteFileConfirmParts {
  path: string;
  message: string;
}

export function buildDeleteFileConfirmToken(path: string, message: string): string {
  return `{{delete-file-confirm:${path}|${message.trim()}}}`;
}

export function parseDeleteFileConfirmToken(text: string): DeleteFileConfirmParts | null {
  const match = text.trim().match(DELETE_FILE_CONFIRM_TOKEN_RE);
  if (!match) return null;
  return {
    path: match[1].trim(),
    message: match[2].trim(),
  };
}
