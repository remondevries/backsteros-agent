import { EditorContent, useEditor } from "@tiptap/react";
import { Markdown } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";
import { useCallback, useEffect, useId } from "react";
import { MARKDOWN_BODY_CLASS } from "../markdown/markdownBodyClass";
import { BlockCaretExtension } from "./BlockCaretExtension";
import { HideLeadingAttachmentLinkExtension } from "./HideLeadingAttachmentLinkExtension";
import { HidePdfLinksExtension } from "./HidePdfLinksExtension";
import {
  handleTiptapEditorFocusBlur,
  noteTiptapEditorFocusRestore,
  registerTiptapEditorFocus,
} from "../lib/tiptapEditorFocus";

export type TiptapEditorProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder?: string;
  format?: "plain" | "markdown";
  /** Hide markdown links whose label ends with `.pdf` (still stored in value). */
  hidePdfLinks?: boolean;
  /** Hide the first paragraph when it is a single markdown link (still stored in value). */
  hideLeadingAttachmentLink?: boolean;
};

export function TiptapEditor({
  value,
  onChange,
  className,
  disabled = false,
  onFocus,
  onBlur,
  placeholder,
  format = "plain",
  hidePdfLinks = false,
  hideLeadingAttachmentLink = false,
}: TiptapEditorProps) {
  const isMarkdown = format === "markdown";
  const editorId = useId();

  const syncPlaceholderVisibility = useCallback(
    (editorInstance: NonNullable<ReturnType<typeof useEditor>>) => {
      if (!placeholder) return;
      const dom = editorInstance.view.dom as HTMLElement;
      const showPlaceholder = editorInstance.isEmpty && !editorInstance.isFocused;
      dom.classList.toggle("tiptap-show-placeholder", showPlaceholder);
    },
    [placeholder],
  );

  const editor = useEditor({
    extensions: [
      StarterKit,
      BlockCaretExtension,
      ...(isMarkdown ? [Markdown] : []),
      ...(hidePdfLinks ? [HidePdfLinksExtension] : []),
      ...(hideLeadingAttachmentLink ? [HideLeadingAttachmentLinkExtension] : []),
    ],
    content: value,
    ...(isMarkdown ? { contentType: "markdown" as const } : {}),
    editable: !disabled,
    editorProps: {
      attributes: {
        class: ["tiptap-editor-content", isMarkdown ? MARKDOWN_BODY_CLASS : "", className]
          .filter(Boolean)
          .join(" "),
        style: "caret-color: transparent;",
        ...(placeholder ? { "data-placeholder": placeholder } : {}),
      },
    },
    onUpdate: ({ editor: nextEditor, transaction }) => {
      if (!transaction.docChanged) return;
      onChange(isMarkdown ? nextEditor.getMarkdown() : nextEditor.getText());
    },
    onFocus,
    onBlur: () => {
      handleTiptapEditorFocusBlur();
      onBlur?.();
    },
  });

  useEffect(() => {
    if (!editor || disabled) return undefined;
    return registerTiptapEditorFocus({
      id: editorId,
      getDom: () => editor.view.dom,
      focus: () => editor.chain().focus().run(),
      isFocused: () => editor.isFocused,
      blur: () => {
        editor.commands.blur();
      },
    });
  }, [disabled, editor, editorId]);

  useEffect(() => {
    if (!editor || disabled) return undefined;

    const dom = editor.view.dom;
    let focusSource: HTMLElement | null = null;

    const handleMouseDown = () => {
      focusSource =
        typeof document !== "undefined"
          ? (document.activeElement as HTMLElement | null)
          : null;
    };

    const handleFocus = () => {
      noteTiptapEditorFocusRestore(focusSource);
      focusSource = null;
    };

    dom.addEventListener("mousedown", handleMouseDown, true);
    dom.addEventListener("focus", handleFocus, true);

    return () => {
      dom.removeEventListener("mousedown", handleMouseDown, true);
      dom.removeEventListener("focus", handleFocus, true);
    };
  }, [disabled, editor]);

  useEffect(() => {
    if (!editor) return;
    const current = isMarkdown ? editor.getMarkdown() : editor.getText();
    if (current !== value) {
      if (isMarkdown) {
        editor.commands.setContent(value, { contentType: "markdown", emitUpdate: false });
      } else {
        editor.commands.setContent(value, { emitUpdate: false });
      }
    }
    syncPlaceholderVisibility(editor);
  }, [editor, isMarkdown, syncPlaceholderVisibility, value]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  useEffect(() => {
    if (!editor || !placeholder) return undefined;

    const sync = () => {
      syncPlaceholderVisibility(editor);
    };

    sync();
    editor.on("update", sync);
    editor.on("focus", sync);
    editor.on("blur", sync);

    return () => {
      editor.off("update", sync);
      editor.off("focus", sync);
      editor.off("blur", sync);
      editor.view.dom.classList.remove("tiptap-show-placeholder");
    };
  }, [editor, placeholder, syncPlaceholderVisibility]);

  return <EditorContent editor={editor} className="tiptap-editor-root" />;
};
