import type { ReactNode } from "react";

type VaultNoteKind =
  | "project"
  | "letter"
  | "meeting"
  | "daily"
  | "inbox"
  | "organization"
  | "contact"
  | "default";

function SvgShell({
  className,
  children,
  size = 16,
}: {
  className?: string;
  children: ReactNode;
  size?: number;
}) {
  return (
    <svg
      className={className ?? "note-icon"}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function resolveVaultNoteKind(path: string): VaultNoteKind {
  const normalized = path.replace(/\\/g, "/").toLowerCase();
  const topFolder = normalized.split("/").filter(Boolean)[0] ?? "";

  switch (topFolder) {
    case "projects":
    case "project":
      return "project";
    case "letters":
    case "letter":
      return "letter";
    case "meetings":
    case "meeting":
      return "meeting";
    case "daily":
      return "daily";
    case "inbox":
      return "inbox";
    case "organizations":
    case "organisation":
    case "organisations":
      return "organization";
    case "contacts":
    case "contact":
      return "contact";
    default:
      return "default";
  }
}

export function getObsidianNoteKindLabel(path: string): string {
  switch (resolveVaultNoteKind(path)) {
    case "project":
      return "Project";
    case "letter":
      return "Letter";
    case "meeting":
      return "Meetings";
    case "daily":
      return "Daily";
    case "inbox":
      return "Inbox";
    case "organization":
      return "Organization";
    case "contact":
      return "Contact";
    default:
      return "Note";
  }
}

export function ProjectNoteIcon({ className }: { className?: string }) {
  return (
    <SvgShell className={className}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10.25 10.5C10.664 10.5 11 10.836 11 11.25C11 11.664 10.664 12 10.25 12H5.75C5.336 12 5 11.664 5 11.25C5 10.836 5.336 10.5 5.75 10.5H10.25Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10.25 7.5C10.664 7.5 11 7.836 11 8.25C11 8.664 10.664 9 10.25 9H5.75C5.336 9 5 8.664 5 8.25C5 7.836 5.336 7.5 5.75 7.5H10.25Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6 4C6.232 4 6.349 4 6.444 4.025C6.703 4.095 6.905 4.297 6.975 4.556C7 4.651 7 4.768 7 5C7 5.232 7 5.349 6.975 5.444C6.905 5.703 6.703 5.905 6.444 5.975C6.349 6 6.232 6 6 6C5.768 6 5.651 6 5.556 5.975C5.297 5.905 5.095 5.703 5.025 5.444C5 5.349 5 5.232 5 5C5 4.768 5 4.651 5.025 4.556C5.095 4.297 5.297 4.095 5.556 4.025C5.651 4 5.768 4 6 4Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10 1C11.4 1 12.1 1 12.635 1.272C13.105 1.512 13.488 1.895 13.727 2.365C14 2.9 14 3.6 14 5V11C14 12.4 14 13.1 13.727 13.635L13.631 13.808C13.391 14.199 13.046 14.518 12.635 14.727L12.426 14.817C12.06 14.948 11.604 14.986 10.927 14.996L10 15H6L5.073 14.996C4.396 14.986 3.94 14.948 3.574 14.817L3.365 14.727C2.895 14.488 2.512 14.105 2.272 13.635C2.068 13.234 2.017 12.739 2.004 11.927L2 11V5C2 3.775 2 3.086 2.183 2.574L2.272 2.365C2.482 1.954 2.801 1.609 3.192 1.369L3.365 1.272C3.9 1 4.6 1 6 1H10ZM6 2.5C5.275 2.5 4.822 2.501 4.48 2.529C4.156 2.556 4.067 2.599 4.046 2.609C3.858 2.705 3.705 2.858 3.609 3.046C3.599 3.067 3.556 3.156 3.529 3.48C3.501 3.822 3.5 4.275 3.5 5V11C3.5 11.725 3.501 12.178 3.529 12.520C3.556 12.844 3.599 12.933 3.609 12.954C3.705 13.142 3.858 13.295 4.046 13.391C4.067 13.401 4.156 13.444 4.48 13.471C4.822 13.499 5.275 13.5 6 13.5H10C10.725 13.5 11.178 13.499 11.52 13.471C11.844 13.444 11.933 13.401 11.954 13.391C12.142 13.295 12.295 13.142 12.391 12.954C12.401 12.933 12.444 12.844 12.471 12.52C12.499 12.178 12.5 11.725 12.5 11V5C12.5 4.275 12.499 3.822 12.471 3.48C12.444 3.156 12.401 3.067 12.391 3.046C12.295 2.858 12.142 2.705 11.954 2.609C11.933 2.599 11.844 2.556 11.520 2.529C11.178 2.501 10.725 2.5 10 2.5H6Z"
        fill="currentColor"
      />
    </SvgShell>
  );
}

function LetterNoteIcon({ className }: { className?: string }) {
  return (
    <SvgShell className={className}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M13.433 7.269C13.791 6.91 14.373 6.91 14.731 7.269C15.09 7.627 15.09 8.209 14.731 8.567L9.237 14.062C8.681 14.618 7.94 14.952 7.155 15C7.068 15.005 6.995 14.932 7 14.845C7.048 14.06 7.382 13.319 7.939 12.763L13.433 7.269Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10.754 1C12.546 1 14 2.454 14 4.246C14 4.66 13.664 4.996 13.25 4.996C12.836 4.996 12.5 4.66 12.5 4.246C12.5 3.282 11.718 2.5 10.754 2.5H4.25C3.284 2.5 2.5 3.284 2.5 4.25V11.739C2.5 12.133 2.799 12.457 3.183 12.496L4.338 12.504C4.716 12.543 5.011 12.862 5.011 13.25C5.011 13.638 4.716 13.957 4.338 13.996L3.261 14L3.029 13.988C1.889 13.872 1 12.91 1 11.739V4.25C1 2.455 2.455 1 4.25 1H10.754Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6.75 8C7.164 8 7.5 8.336 7.5 8.75C7.5 9.164 7.164 9.5 6.75 9.5H5.25C4.836 9.5 4.5 9.164 4.5 8.75C4.5 8.336 4.836 8 5.25 8H6.75Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9.75 5C10.164 5 10.5 5.336 10.5 5.75C10.5 6.164 10.164 6.5 9.75 6.5H5.25C4.836 6.5 4.5 6.164 4.5 5.75C4.5 5.336 4.836 5 5.25 5H9.75Z"
        fill="currentColor"
      />
    </SvgShell>
  );
}

export function MeetingNoteIcon({
  className,
  size = 16,
  color,
}: {
  className?: string;
  size?: number;
  color?: string;
}) {
  return (
    <SvgShell className={className} size={size}>
      <path
        d="M11 1C13.209 1 15 2.791 15 5V11C15 13.209 13.209 15 11 15H5C2.791 15 1 13.209 1 11V5C1 2.791 2.791 1 5 1H11ZM13.5 6H2.5V11C2.5 12.381 3.619 13.5 5 13.5H11C12.381 13.5 13.5 12.381 13.5 11V6Z"
        fill={color ?? "currentColor"}
      />
    </SvgShell>
  );
}

function DailyNoteIcon({ className }: { className?: string }) {
  return (
    <SvgShell className={className}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3.45 2.792C3.526 2.427 3.726 2.099 4.016 1.864C4.305 1.629 4.667 1.5 5.04 1.5H11.714C11.816 1.5 11.917 1.522 12.01 1.566C12.102 1.609 12.184 1.672 12.25 1.751C12.315 1.829 12.362 1.921 12.388 2.02C12.414 2.119 12.418 2.223 12.399 2.323L10.774 11.144C10.741 11.324 10.638 11.483 10.489 11.588C10.339 11.693 10.154 11.734 9.974 11.704C9.935 11.71 9.896 11.713 9.857 11.714H3.59C3.405 11.714 3.228 11.787 3.097 11.918C2.967 12.049 2.893 12.226 2.893 12.411C2.893 12.595 2.967 12.772 3.097 12.903C3.228 13.034 3.405 13.107 3.59 13.107H10.41C10.68 13.107 10.942 13.013 11.15 12.841C11.358 12.669 11.499 12.429 11.55 12.164L13.12 3.924C13.155 3.742 13.26 3.582 13.412 3.478C13.488 3.427 13.573 3.39 13.663 3.372C13.752 3.353 13.845 3.352 13.934 3.369C14.024 3.387 14.11 3.421 14.187 3.471C14.263 3.522 14.329 3.586 14.38 3.662C14.432 3.738 14.468 3.823 14.487 3.912C14.505 4.002 14.506 4.094 14.489 4.184L12.919 12.424C12.808 13.008 12.496 13.535 12.038 13.914C11.58 14.293 11.004 14.5 10.41 14.5H3.59C3.303 14.5 3.019 14.441 2.756 14.327C2.493 14.212 2.257 14.045 2.061 13.835C1.865 13.625 1.715 13.377 1.619 13.107C1.524 12.836 1.485 12.549 1.505 12.263C1.496 12.187 1.499 12.111 1.515 12.036L3.45 2.792ZM5.548 3.357C5.348 3.357 5.171 3.485 5.108 3.675L4.953 4.139C4.853 4.439 5.076 4.75 5.393 4.75H9.057C9.257 4.75 9.435 4.622 9.497 4.433L9.653 3.968C9.676 3.898 9.682 3.824 9.671 3.752C9.66 3.679 9.632 3.61 9.589 3.551C9.546 3.491 9.489 3.443 9.424 3.409C9.359 3.376 9.286 3.358 9.213 3.358L5.548 3.357Z"
        fill="currentColor"
      />
    </SvgShell>
  );
}

function InboxNoteIcon({ className }: { className?: string }) {
  return (
    <SvgShell className={className}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M11.007 1.009C12.024 1.092 12.897 1.79 13.194 2.78L14.891 8.429C15.003 8.804 15.026 9.201 14.957 9.587L14.507 12.114L14.438 12.422C14.054 13.831 12.831 14.856 11.378 14.986L11.063 15H4.929L4.614 14.986C3.161 14.856 1.938 13.831 1.555 12.422L1.485 12.114L1.034 9.587C0.974 9.249 0.984 8.903 1.064 8.57L1.102 8.429L2.797 2.78C3.095 1.789 3.969 1.092 4.985 1.009L5.19 1H10.802L11.007 1.009ZM2.961 11.852C3.131 12.805 3.96 13.5 4.929 13.5H11.063C12.031 13.5 12.861 12.805 13.031 11.852L13.271 10.5H11.621C11.225 10.5 10.851 10.674 10.596 10.97L10.493 11.104C10.12 11.663 9.492 12 8.819 12H7.172C6.542 12 5.95 11.704 5.571 11.206L5.498 11.104C5.247 10.727 4.824 10.5 4.371 10.5H2.72L2.961 11.852ZM5.19 2.5C4.804 2.5 4.457 2.722 4.292 3.061L4.232 3.212L2.537 8.86C2.523 8.906 2.514 8.953 2.507 9H4.371C5.325 9 6.217 9.477 6.746 10.271L6.784 10.322C6.881 10.434 7.022 10.5 7.172 10.5H8.819C8.991 10.5 9.151 10.414 9.246 10.271L9.35 10.126C9.887 9.419 10.727 9 11.621 9H13.485C13.479 8.953 13.469 8.906 13.455 8.86L11.759 3.212C11.632 2.789 11.243 2.5 10.802 2.5H5.19Z"
        fill="currentColor"
      />
    </SvgShell>
  );
}

function OrganizationNoteIcon({ className }: { className?: string }) {
  return (
    <SvgShell className={className}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M11.025 12.333C13.673 12.333 14.623 13.529 14.961 14.319C15.112 14.674 14.806 15 14.405 15H7.595C7.188 15 6.882 14.664 7.045 14.307C7.407 13.517 8.39 12.333 11.025 12.333Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M11 7C12.104 7 13 7.895 13 9C13 10.105 12.104 11 11 11C9.896 11 9 10.105 9 9C9 7.895 9.896 7 11 7Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10 4.25V3.75C10 3.06 9.44 2.5 8.75 2.5H3.75C3.06 2.5 2.5 3.06 2.5 3.75V13.25C2.5 13.388 2.612 13.5 2.75 13.5H4.25C4.664 13.5 5 13.836 5 14.25C5 14.664 4.664 15 4.25 15H2.75C1.784 15 1 14.216 1 13.25V3.75C1 2.231 2.231 1 3.75 1H8.75C10.269 1 11.5 2.231 11.5 3.75V4.25C11.5 4.664 11.164 5 10.75 5C10.336 5 10 4.664 10 4.25Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7.75 4.25C8.164 4.25 8.5 4.586 8.5 5C8.5 5.414 8.164 5.75 7.75 5.75H4.75C4.336 5.75 4 5.414 4 5C4 4.586 4.336 4.25 4.75 4.25H7.75Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6.5 7.25C6.914 7.25 7.25 7.586 7.25 8C7.25 8.414 6.914 8.75 6.5 8.75H4.75C4.336 8.75 4 8.414 4 8C4 7.586 4.336 7.25 4.75 7.25H6.5Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6.5 10.25C6.914 10.25 7.25 10.586 7.25 11C7.25 11.414 6.914 11.75 6.5 11.75H4.75C4.336 11.75 4 11.414 4 11C4 10.586 4.336 10.25 4.75 10.25H6.5Z"
        fill="currentColor"
      />
    </SvgShell>
  );
}

function ContactNoteIcon({ className }: { className?: string }) {
  return (
    <SvgShell className={className}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10.25 6.75C10.25 7.993 9.243 9 8 9C6.757 9 5.75 7.993 5.75 6.75C5.75 5.507 6.757 4.5 8 4.5C9.243 4.5 10.25 5.507 10.25 6.75Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8.575 10C9.972 10 11.261 10.611 12.144 11.614C12.156 11.6 12.17 11.586 12.183 11.571C12.452 11.257 12.925 11.22 13.24 11.489C13.555 11.758 13.591 12.232 13.322 12.547C13.095 12.812 12.848 13.059 12.584 13.288C12.548 13.325 12.511 13.359 12.467 13.389C11.391 14.281 10.044 14.857 8.567 14.976C8.561 14.976 8.555 14.978 8.549 14.979C8.514 14.981 8.479 14.982 8.444 14.984C8.389 14.988 8.333 14.991 8.277 14.993C8.185 14.997 8.093 15 8 15C7.907 15 7.814 14.997 7.722 14.993C7.666 14.991 7.61 14.988 7.555 14.984C7.52 14.982 7.486 14.981 7.451 14.979C7.445 14.978 7.438 14.976 7.432 14.976C5.95 14.856 4.597 14.277 3.52 13.379C3.506 13.368 3.494 13.356 3.481 13.344C3.472 13.336 3.462 13.33 3.453 13.322C3.175 13.084 2.916 12.825 2.678 12.547C2.409 12.232 2.445 11.758 2.76 11.489C3.075 11.22 3.548 11.257 3.817 11.571C3.83 11.586 3.843 11.601 3.856 11.616C4.739 10.612 6.027 10 7.425 10H8.575ZM7.425 11.5C6.471 11.5 5.591 11.917 4.987 12.602C5.853 13.17 6.887 13.5 8 13.5C9.113 13.5 10.147 13.169 11.013 12.601C10.409 11.916 9.529 11.5 8.575 11.5H7.425Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M1.827 6.762C2.24 6.794 2.549 7.155 2.517 7.567C2.506 7.71 2.5 7.854 2.5 8C2.5 8.146 2.506 8.29 2.517 8.433C2.549 8.846 2.24 9.206 1.827 9.238C1.414 9.27 1.054 8.962 1.021 8.549C1.007 8.368 1 8.185 1 8C1 7.816 1.007 7.633 1.021 7.451C1.054 7.038 1.414 6.73 1.827 6.762Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M14.173 6.762C14.586 6.73 14.946 7.038 14.979 7.451C14.993 7.633 15 7.816 15 8C15 8.185 14.993 8.368 14.979 8.549C14.946 8.962 14.586 9.27 14.173 9.238C13.76 9.206 13.451 8.846 13.483 8.433C13.495 8.29 13.5 8.146 13.5 8C13.5 7.854 13.495 7.71 13.483 7.567C13.451 7.155 13.76 6.794 14.173 6.762Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3.453 2.678C3.768 2.409 4.242 2.445 4.511 2.76C4.78 3.074 4.743 3.548 4.429 3.817C4.21 4.005 4.005 4.209 3.817 4.429C3.548 4.743 3.075 4.78 2.76 4.511C2.445 4.242 2.409 3.768 2.678 3.453C2.916 3.175 3.175 2.916 3.453 2.678Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M11.489 2.76C11.758 2.445 12.232 2.409 12.547 2.678C12.825 2.916 13.084 3.175 13.322 3.453C13.591 3.768 13.555 4.242 13.24 4.511C12.925 4.78 12.452 4.743 12.183 4.429C11.995 4.209 11.79 4.005 11.571 3.817C11.257 3.548 11.22 3.074 11.489 2.76Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8 1C8.185 1 8.368 1.007 8.549 1.021C8.962 1.054 9.27 1.414 9.238 1.827C9.206 2.24 8.846 2.549 8.433 2.517C8.29 2.506 8.146 2.5 8 2.5C7.854 2.5 7.71 2.506 7.567 2.517C7.154 2.549 6.794 2.24 6.762 1.827C6.73 1.414 7.038 1.054 7.451 1.021C7.632 1.007 7.815 1 8 1Z"
        fill="currentColor"
      />
    </SvgShell>
  );
}

export function VaultNoteIcon({ path, className }: { path: string; className?: string }) {
  switch (resolveVaultNoteKind(path)) {
    case "letter":
      return <LetterNoteIcon className={className} />;
    case "meeting":
      return <MeetingNoteIcon className={className} />;
    case "daily":
      return <DailyNoteIcon className={className} />;
    case "inbox":
      return <InboxNoteIcon className={className} />;
    case "organization":
      return <OrganizationNoteIcon className={className} />;
    case "contact":
      return <ContactNoteIcon className={className} />;
    case "project":
    default:
      return <ProjectNoteIcon className={className} />;
  }
}
