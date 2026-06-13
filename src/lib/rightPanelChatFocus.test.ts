import { describe, expect, test } from "bun:test";
import {
  clearRightPanelComposerFocusState,
  registerRightPanelComposerFocus,
  requestRightPanelComposerFocus,
} from "./rightPanelChatFocus";

describe("rightPanelChatFocus", () => {
  test("flushes a pending focus request when the composer registers", () => {
    clearRightPanelComposerFocusState();

    let focused = false;
    requestRightPanelComposerFocus();

    const unregister = registerRightPanelComposerFocus({
      focusComposer: () => {
        focused = true;
      },
    });

    expect(focused).toBe(true);

    unregister();
    clearRightPanelComposerFocusState();
  });
});
