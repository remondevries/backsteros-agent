import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

function isSingleLinkParagraph(node: {
  type: { name: string };
  childCount: number;
  firstChild?: {
    isText: boolean;
    text?: string | null;
    marks: readonly { type: { name: string } }[];
  } | null;
}) {
  if (node.type.name !== "paragraph" || node.childCount !== 1) {
    return false;
  }
  const child = node.firstChild;
  if (!child?.isText) return false;
  return child.marks.some((mark) => mark.type.name === "link");
}

export const HideLeadingAttachmentLinkExtension = Extension.create({
  name: "hideLeadingAttachmentLink",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("hideLeadingAttachmentLink"),
        props: {
          decorations(state) {
            const firstBlock = state.doc.firstChild;
            if (!firstBlock || !isSingleLinkParagraph(firstBlock)) {
              return DecorationSet.empty;
            }

            return DecorationSet.create(state.doc, [
              Decoration.node(0, firstBlock.nodeSize, {
                class: "tiptap-hidden-pdf-link-block",
              }),
            ]);
          },
        },
      }),
    ];
  },
});
