import { describe, expect, test } from "bun:test";
import {
  canWidenVaultChatContext,
  parentVaultFolderPath,
  resolveVaultChatContextGoUpTarget,
  vaultFolderPathFromDocumentPath,
  vaultFolderTitle,
} from "./vaultFolderContext";

describe("vaultFolderContext", () => {
  test("derives parent folder from a document path", () => {
    expect(vaultFolderPathFromDocumentPath("Daily/2026-06-12.md")).toBe("Daily");
    expect(vaultFolderTitle("Knowledge Base")).toBe("Knowledge Base");
  });

  test("detects when folder context can go up", () => {
    expect(
      canWidenVaultChatContext({
        kind: "vault_document",
        path: "Inbox/note.md",
        title: "note",
      }),
    ).toBe(true);
    expect(
      canWidenVaultChatContext({
        kind: "vault_folder",
        path: "Daily",
        name: "Daily",
      }),
    ).toBe(false);
    expect(
      canWidenVaultChatContext({
        kind: "vault_folder",
        path: "Daily/June",
        name: "June",
      }),
    ).toBe(true);
  });

  test("resolves go-up targets for documents and nested folders", () => {
    expect(
      resolveVaultChatContextGoUpTarget({
        kind: "vault_document",
        path: "Inbox/idea.md",
        title: "idea",
      }),
    ).toEqual({ path: "Inbox", title: "Inbox" });
    expect(parentVaultFolderPath("Daily/June")).toBe("Daily");
    expect(
      resolveVaultChatContextGoUpTarget({
        kind: "vault_folder",
        path: "Daily/June",
        name: "June",
      }),
    ).toEqual({ path: "Daily", title: "Daily" });
  });
});
