import { afterEach, describe, expect, test } from "bun:test";
import {
  clearTiptapEditorFocusRestore,
  focusPageTiptapEditor,
  registerTiptapEditorFocus,
  resetTiptapEditorFocusStateForTests,
  restoreTiptapEditorFocus,
  shouldRestoreTiptapEditorFocus,
  type TiptapEditorFocusRegistration,
} from "./tiptapEditorFocus";

afterEach(() => {
  resetTiptapEditorFocusStateForTests();
});

function createMockDom(visible = true): HTMLElement {
  return {
    isConnected: true,
    offsetParent: visible ? ({} as Element) : null,
    closest: () => null,
  } as unknown as HTMLElement;
}

function createRegistration({
  id,
  focused = false,
  visible = true,
}: {
  id: string;
  focused?: boolean;
  visible?: boolean;
}): TiptapEditorFocusRegistration {
  let isFocused = focused;
  const dom = createMockDom(visible);

  return {
    id,
    getDom: () => dom,
    focus: () => {
      isFocused = true;
      return true;
    },
    isFocused: () => isFocused,
    blur: () => {
      isFocused = false;
    },
  };
}

describe("tiptapEditorFocus", () => {
  test("focusPageTiptapEditor focuses a visible editor", () => {
    const registration = createRegistration({ id: "editor-1" });
    const unregister = registerTiptapEditorFocus(registration);

    expect(focusPageTiptapEditor()).toBe(true);
    expect(registration.isFocused()).toBe(true);
    expect(shouldRestoreTiptapEditorFocus()).toBe(true);

    unregister();
  });

  test("restoreTiptapEditorFocus blurs the editor and clears restore state", () => {
    const registration = createRegistration({ id: "editor-1" });
    const unregister = registerTiptapEditorFocus(registration);
    focusPageTiptapEditor();

    expect(restoreTiptapEditorFocus()).toBe(true);
    expect(registration.isFocused()).toBe(false);
    expect(shouldRestoreTiptapEditorFocus()).toBe(false);

    unregister();
  });

  test("clearTiptapEditorFocusRestore disables escape restore", () => {
    const registration = createRegistration({ id: "editor-1" });
    const unregister = registerTiptapEditorFocus(registration);
    focusPageTiptapEditor();
    clearTiptapEditorFocusRestore();

    expect(shouldRestoreTiptapEditorFocus()).toBe(false);

    unregister();
  });

  test("focusPageTiptapEditor returns false when no visible editor is registered", () => {
    const registration = createRegistration({ id: "editor-1", visible: false });
    const unregister = registerTiptapEditorFocus(registration);

    expect(focusPageTiptapEditor()).toBe(false);

    unregister();
  });
});
