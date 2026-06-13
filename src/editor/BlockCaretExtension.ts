import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";

const BLOCK_CARET_WIDTH_PX = 3;

function collectScrollTargets(editorView: EditorView): Array<HTMLElement | Window> {
  const targets = new Set<HTMLElement | Window>();
  targets.add(window);
  targets.add(editorView.dom);

  let node: HTMLElement | null = editorView.dom.parentElement;
  while (node) {
    const { overflowY, overflow } = getComputedStyle(node);
    if (/(auto|scroll)/.test(`${overflow} ${overflowY}`)) {
      targets.add(node);
    }
    node = node.parentElement;
  }

  return [...targets];
}

function updateBlockCaretPosition(editorView: EditorView, caret: HTMLElement) {
  if (!editorView.hasFocus() || !editorView.editable) {
    caret.hidden = true;
    return;
  }

  const { from, to } = editorView.state.selection;
  if (from !== to) {
    caret.hidden = true;
    return;
  }

  const coords = editorView.coordsAtPos(from, -1);
  const height = Math.max(coords.bottom - coords.top, 14);

  caret.hidden = false;
  caret.style.left = `${coords.left}px`;
  caret.style.top = `${coords.top}px`;
  caret.style.height = `${height}px`;
  caret.style.width = `${BLOCK_CARET_WIDTH_PX}px`;
}

function createBlockCaretPlugin() {
  return new Plugin({
    key: new PluginKey("blockCaret"),
    view(editorView) {
      const root = editorView.dom.parentElement;
      root?.classList.add("tiptap-editor-root--block-caret");

      const caret = document.createElement("span");
      caret.className = "tiptap-block-caret";
      caret.setAttribute("aria-hidden", "true");
      document.body.append(caret);

      const scheduleUpdate = () => {
        updateBlockCaretPosition(editorView, caret);
      };

      const handleFocus = () => scheduleUpdate();
      const handleBlur = () => {
        caret.hidden = true;
      };
      const handleScroll = () => scheduleUpdate();

      editorView.dom.addEventListener("focus", handleFocus);
      editorView.dom.addEventListener("blur", handleBlur);
      const scrollTargets = collectScrollTargets(editorView);
      for (const target of scrollTargets) {
        target.addEventListener("scroll", handleScroll, { passive: true });
      }
      window.addEventListener("resize", handleScroll, { passive: true });

      scheduleUpdate();

      return {
        update() {
          scheduleUpdate();
        },
        destroy() {
          editorView.dom.removeEventListener("focus", handleFocus);
          editorView.dom.removeEventListener("blur", handleBlur);
          for (const target of scrollTargets) {
            target.removeEventListener("scroll", handleScroll);
          }
          window.removeEventListener("resize", handleScroll);
          caret.remove();
          root?.classList.remove("tiptap-editor-root--block-caret");
        },
      };
    },
  });
}

export const BlockCaretExtension = Extension.create({
  name: "blockCaret",
  addProseMirrorPlugins() {
    return [createBlockCaretPlugin()];
  },
});
