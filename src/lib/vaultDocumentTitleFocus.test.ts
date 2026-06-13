import { describe, expect, test } from "bun:test";
import {
  focusVaultDocumentTitle,
  registerVaultDocumentTitleFocus,
} from "./vaultDocumentTitleFocus";

describe("vaultDocumentTitleFocus", () => {
  test("focuses the registered title input", () => {
    let focused = false;
    const unregister = registerVaultDocumentTitleFocus({
      focusTitle: () => {
        focused = true;
      },
    });

    expect(focusVaultDocumentTitle()).toBe(true);
    expect(focused).toBe(true);

    unregister();
    expect(focusVaultDocumentTitle()).toBe(false);
  });
});
