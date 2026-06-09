import type { SDKUserMessage } from "@cursor/sdk";
import { loadAgentIdentityContext } from "./context/agent.ts";
import { buildRuntimeContext } from "./context/index.ts";
import { truncateContextSection } from "./context/limits.ts";
import { loadNowContext } from "./context/now.ts";
import { loadUserIdentityContext } from "./context/profile.ts";
import type { ToolSelection } from "./tool-routing.ts";

export function augmentUserMessage(
  message: SDKUserMessage,
  tools: ToolSelection,
  notesPath: string,
  vaultName?: string | null,
): SDKUserMessage {
  const sections = [
    loadAgentIdentityContext(),
    loadUserIdentityContext(),
    loadNowContext(),
    ...buildRuntimeContext(message.text ?? "", tools, notesPath, vaultName),
  ].filter((section): section is string => Boolean(section));

  if (sections.length === 0) {
    return message;
  }

  const preamble = `[System: ${sections.map((section) => truncateContextSection(section)).join("\n\n")}]`;
  return {
    ...message,
    text: `${preamble}\n\n${message.text}`,
  };
}
