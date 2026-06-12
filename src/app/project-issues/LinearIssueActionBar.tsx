import { useCallback, useState, type ReactNode } from "react";
import type { LinearIssueDetail } from "../../lib/api";
import { CursorIcon } from "../../chat/CursorIcon";
import { copyTextToClipboard, openLinearIssueInCursor } from "../../lib/linearIssueActions";
import { openExternalUrl } from "../../lib/openExternalUrl";

function ActionButton({
  label,
  title,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  title: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className="linear-issue-action-button"
      aria-label={label}
      title={title}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
      <path
        d="M14.78 3.653a3.936 3.936 0 1 1 5.567 5.567l-3.627 3.627a3.936 3.936 0 0 1-5.88-.353.75.75 0 0 0-1.18.928 5.436 5.436 0 0 0 8.12.486l3.628-3.628a5.436 5.436 0 1 0-7.688-7.688l-3 3a.75.75 0 0 0 1.06 1.061l3-3Z"
        fill="currentColor"
      />
      <path
        d="M7.28 11.153a3.936 3.936 0 0 1 5.88.353.75.75 0 0 0 1.18-.928 5.436 5.436 0 0 0-8.12-.486L2.592 13.72a5.436 5.436 0 1 0 7.688 7.688l3-3a.75.75 0 1 0-1.06-1.06l-3 3a3.936 3.936 0 0 1-5.567-5.568l3.627-3.627Z"
        fill="currentColor"
      />
    </svg>
  );
}

function IdIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path
        d="M10.957 1.8643C11.4444 2.31542 11.0188 3 10.3547 3c-.2436 0-.47136-.10549-.67781-.23466C9.40812 2.59719 9.09041 2.5 8.75 2.5h-4.5c-.47683 0-.90911.1907-1.22475.5H3v.02525c-.3093.31564-.5.74792-.5 1.22475v4.5c0 .34041.09719.65812.26534.92689C2.8945 9.88334 3 10.1111 3 10.3547c0 .6641-.68458 1.0897-1.1357.6023C1.32786 10.3775 1 9.60202 1 8.75v-4.5C1 2.45507 2.45507 1 4.25 1h4.5c.85202 0 1.6275.32786 2.207.8643ZM11.8284 8.34533c.3757.7514.406 1.62906.0829 2.40447l-.0815.1957c-.2018.4842-.6749.7996-1.1994.7996h-.1255V7.75506h.3685c.4044 0 .7742.22851.955.59027Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M11.7499 14.9999c1.795 0 3.25-1.455 3.25-3.25V7.24994c0-1.79492-1.455-3.25-3.25-3.25H7.24994c-1.79492 0-3.25 1.45508-3.25 3.25v4.49996c0 1.795 1.45508 3.25 3.25 3.25h4.49996ZM7.24995 6.24506c.41697 0 .755.33802.755.755v5.50004c0 .4169-.33803.755-.755.755-.41698 0-.755-.3381-.755-.755V7.00006c0-.41698.33802-.755.755-.755Zm6.05515 5.08554c.4919-1.1805.4459-2.51666-.1261-3.66056-.4366-.87332-1.3292-1.42498-2.3056-1.42498H9.74992c-.41697 0-.755.33802-.755.755v5.50004c0 .4169.33803.755.755.755h.88048c1.1341 0 2.157-.682 2.5932-1.7289l.0815-.1956Z"
        fill="currentColor"
      />
    </svg>
  );
}

function BranchIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path
        d="M9.5 3.25a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.493 2.493 0 0 1 6 7h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25Zm-6 0a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Zm8.25-.75a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5ZM4.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function LinearIssueActionBar({ issue }: { issue: LinearIssueDetail }) {
  const [copiedField, setCopiedField] = useState<"id" | "branch" | null>(null);

  const flashCopied = useCallback((field: "id" | "branch") => {
    setCopiedField(field);
    window.setTimeout(() => {
      setCopiedField((current) => (current === field ? null : current));
    }, 1500);
  }, []);

  const handleCopyIdentifier = useCallback(async () => {
    const copied = await copyTextToClipboard(issue.identifier);
    if (copied) flashCopied("id");
  }, [flashCopied, issue.identifier]);

  const handleCopyBranch = useCallback(async () => {
    if (!issue.branchName) return;
    const copied = await copyTextToClipboard(issue.branchName);
    if (copied) flashCopied("branch");
  }, [flashCopied, issue.branchName]);

  const handleOpenUrl = useCallback(() => {
    void openExternalUrl(issue.url);
  }, [issue.url]);

  const handleOpenInCursor = useCallback(() => {
    void openLinearIssueInCursor({ url: issue.url, branchName: issue.branchName });
  }, [issue.branchName, issue.url]);

  return (
    <div className="linear-issue-action-bar" aria-label="Issue actions">
      <ActionButton label="Open in Linear" title="Open Linear URL" onClick={handleOpenUrl}>
        <LinkIcon />
      </ActionButton>
      <ActionButton
        label="Copy Linear ID"
        title={copiedField === "id" ? "Copied" : `Copy ${issue.identifier}`}
        onClick={() => void handleCopyIdentifier()}
      >
        <IdIcon />
      </ActionButton>
      <ActionButton
        label="Copy git branch"
        title={
          copiedField === "branch"
            ? "Copied"
            : issue.branchName
              ? `Copy ${issue.branchName}`
              : "No git branch"
        }
        disabled={!issue.branchName}
        onClick={() => void handleCopyBranch()}
      >
        <BranchIcon />
      </ActionButton>
      <ActionButton
        label="Open in Cursor"
        title={issue.branchName ? `Open branch in Cursor` : "Open in Cursor"}
        onClick={handleOpenInCursor}
      >
        <CursorIcon size={14} />
      </ActionButton>
    </div>
  );
}
