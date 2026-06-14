import { EditorContent, useEditor } from "@tiptap/react";
import { Markdown } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useId } from "react";
import { MARKDOWN_BODY_CLASS } from "../markdown/markdownBodyClass";
import { BlockCaretExtension } from "./BlockCaretExtension";
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
}: TiptapEditorProps) {
  const isMarkdown = format === "markdown";
  const editorId = useId();

  const editor = useEditor({
    extensions: [StarterKit, BlockCaretExtension, ...(isMarkdown ? [Markdown] : [])],
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
  }, [editor, isMarkdown, value]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  return <EditorContent editor={editor} className="tiptap-editor-root" />;
}
