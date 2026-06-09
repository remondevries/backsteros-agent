import { getLinearApiKey } from "./config.ts";
import type { LinearIssueEntity } from "./types.ts";

const avatarCache = new Map<string, string | null>();

export async function fetchLinearUserAvatar(userId: string): Promise<string | undefined> {
  const cached = avatarCache.get(userId);
  if (cached !== undefined) {
    return cached ?? undefined;
  }

  const apiKey = getLinearApiKey();
  if (!apiKey) {
    avatarCache.set(userId, null);
    return undefined;
  }

  try {
    const response = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: "query UserAvatar($id: String!) { user(id: $id) { avatarUrl } }",
        variables: { id: userId },
      }),
    });

    if (!response.ok) {
      avatarCache.set(userId, null);
      return undefined;
    }

    const body = (await response.json()) as {
      data?: { user?: { avatarUrl?: string | null } | null };
    };
    const avatarUrl = body.data?.user?.avatarUrl ?? null;
    avatarCache.set(userId, avatarUrl);
    return avatarUrl ?? undefined;
  } catch {
    avatarCache.set(userId, null);
    return undefined;
  }
}

export async function resolveLinearIssueAvatars(
  items: LinearIssueEntity[],
): Promise<LinearIssueEntity[]> {
  const pendingIds = [
    ...new Set(
      items
        .filter((item) => item.assigneeId && !item.assigneeAvatarUrl)
        .map((item) => item.assigneeId as string),
    ),
  ];

  await Promise.all(pendingIds.map((userId) => fetchLinearUserAvatar(userId)));

  return items.map((item) => {
    if (item.assigneeAvatarUrl || !item.assigneeId) return item;
    const avatarUrl = avatarCache.get(item.assigneeId) ?? undefined;
    if (!avatarUrl) return item;
    return { ...item, assigneeAvatarUrl: avatarUrl };
  });
}
