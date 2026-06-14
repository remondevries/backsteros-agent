import { describe, expect, test } from "bun:test";
import { parseChatCommand, parseLinearThreadChatCommand } from "./chatCommands";

describe("parseChatCommand", () => {
  test("treats /clear and bare /delete as clear chat", () => {
    expect(parseChatCommand("/clear")).toBe("clear");
    expect(parseChatCommand("/delete")).toBe("clear");
    expect(parseChatCommand("  /DELETE  ")).toBe("clear");
  });

  test("ignores delete-file shortcuts with a target", () => {
    expect(parseChatCommand("/delete Inbox/note.md")).toBeNull();
    expect(parseChatCommand("/d")).toBeNull();
  });
});

describe("parseLinearThreadChatCommand", () => {
  test("treats /delete, /d, and /clear as delete thread", () => {
    expect(parseLinearThreadChatCommand("/delete")).toBe("delete-thread");
    expect(parseLinearThreadChatCommand("/d")).toBe("delete-thread");
    expect(parseLinearThreadChatCommand("/clear")).toBe("delete-thread");
    expect(parseLinearThreadChatCommand("  /D  ")).toBe("delete-thread");
  });

  test("ignores paths and other chat commands", () => {
    expect(parseLinearThreadChatCommand("/delete Inbox/note.md")).toBeNull();
    expect(parseLinearThreadChatCommand("/dc")).toBeNull();
  });
});
