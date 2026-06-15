import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { isPdfLinkLabel } from "../lib/documentPdfLink";

function isPdfLinkTextNode(node: { isText: boolean; text?: string | null; marks: readonly { type: { name: string } }[] }) {
  if (!node.isText) return false;
  const linkMark = node.marks.find((mark) => mark.type.name === "link");
  if (!linkMark) return false;
  return isPdfLinkLabel(node.text ?? "");
}

export const HidePdfLinksExtension = Extension.create({
  name: "hidePdfLinks",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("hidePdfLinks"),
        props: {
          decorations(state) {
            const hidden: Decoration[] = [];

            state.doc.descendants((node, pos) => {
              if (node.type.name === "paragraph" && node.childCount === 1) {
                const child = node.firstChild;
                if (child && isPdfLinkTextNode(child)) {
                  hidden.push(
                    Decoration.node(pos, pos + node.nodeSize, {
                      class: "tiptap-hidden-pdf-link-block",
                    }),
                  );
                  return false;
                }
              }

              if (isPdfLinkTextNode(node)) {
                hidden.push(
                  Decoration.inline(pos, pos + node.nodeSize, {
                    class: "tiptap-hidden-pdf-link",
                  }),
                );
              }
            });

            return DecorationSet.create(state.doc, hidden);
          },
        },
      }),
    ];
  },
});
