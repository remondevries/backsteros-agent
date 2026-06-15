import { isTauriRuntime } from "./runtime";

const BACKSTER_DIR = ".backsteros-agent";

export interface ProfilePaths {
  userProfilePath: string;
  agentProfilePath: string;
}

export async function resolveProfilePaths(
  fromSettings?: Partial<ProfilePaths>,
): Promise<ProfilePaths> {
  if (fromSettings?.userProfilePath && fromSettings.agentProfilePath) {
    return {
      userProfilePath: fromSettings.userProfilePath,
      agentProfilePath: fromSettings.agentProfilePath,
    };
  }

  if (isTauriRuntime()) {
    try {
      const { homeDir, join } = await import("@tauri-apps/api/path");
      const home = await homeDir();
      return {
        userProfilePath: await join(home, BACKSTER_DIR, "profile.md"),
        agentProfilePath: await join(home, BACKSTER_DIR, "agent.md"),
      };
    } catch {
      // Fall through to generic defaults.
    }
  }

  return {
    userProfilePath: `~/${BACKSTER_DIR}/profile.md`,
    agentProfilePath: `~/${BACKSTER_DIR}/agent.md`,
  };
}
