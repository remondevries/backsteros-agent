import { Agent, CursorAgentError } from "@cursor/sdk";
import { homedir } from "node:os";
import { join } from "node:path";
import { DEFAULT_MODEL, getCursorApiKey } from "./config.ts";
import { getLinearMcpServers } from "./mcp.ts";

const notesPath = process.env.NOTES_DIR ?? join(homedir(), "notes");
const prompt =
  process.argv.slice(2).join(" ") ||
  "List the markdown files in the current directory and summarize what you find.";

async function main() {
  const apiKey = getCursorApiKey();
  if (!apiKey) {
    console.error("Set CURSOR_API_KEY before running proof.");
    process.exit(1);
  }

  await using agent = await Agent.create({
    apiKey,
    model: { id: DEFAULT_MODEL },
    local: {
      cwd: notesPath,
    },
    mcpServers: getLinearMcpServers(),
  });

  console.log(`Agent ${agent.agentId} running in ${notesPath}`);
  console.log(`Prompt: ${prompt}\n`);

  try {
    const run = await agent.send(prompt);
    for await (const message of run.stream()) {
      if (message.type === "assistant") {
        for (const block of message.message.content) {
          if (block.type === "text") process.stdout.write(block.text);
        }
      }
      if (message.type === "tool_call") {
        console.log(`\n[tool] ${message.name} (${message.status})`);
      }
    }

    const result = await run.wait();
    console.log(`\n\nRun status: ${result.status}`);
    process.exit(result.status === "finished" ? 0 : 2);
  } catch (error) {
    if (error instanceof CursorAgentError) {
      console.error(`Startup failed: ${error.message}`);
      process.exit(1);
    }
    throw error;
  }
}

main();
