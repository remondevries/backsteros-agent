import { useState } from "react";

export function LinearAssigneeAvatar({
  name,
  avatarUrl,
}: {
  name?: string;
  avatarUrl?: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  if (avatarUrl && !imageFailed) {
    return (
      <img
        src={avatarUrl}
        alt={name ?? "Assignee"}
        className="linear-assignee-avatar"
        loading="lazy"
        onError={() => setImageFailed(true)}
      />
    );
  }

  if (!name) return null;

  return (
    <span className="linear-assignee-avatar linear-assignee-avatar-fallback" aria-hidden="true">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
