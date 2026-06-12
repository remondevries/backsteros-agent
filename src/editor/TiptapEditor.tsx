import { EditorContent, useEditor } from "@tiptap/react";
import { Markdown } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";

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

  const editor = useEditor({
    extensions: [StarterKit, ...(isMarkdown ? [Markdown] : [])],
    content: value,
    ...(isMarkdown ? { contentType: "markdown" as const } : {}),
    editable: !disabled,
    editorProps: {
      attributes: {
        class: ["tiptap-editor-content", className].filter(Boolean).join(" "),
        ...(placeholder ? { "data-placeholder": placeholder } : {}),
      },
    },
    onUpdate: ({ editor: nextEditor, transaction }) => {
      if (!transaction.docChanged) return;
      onChange(isMarkdown ? nextEditor.getMarkdown() : nextEditor.getText());
    },
    onFocus,
    onBlur,
  });

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
