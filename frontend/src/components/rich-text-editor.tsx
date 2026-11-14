import { useEffect, useRef } from "react";

interface RichTextEditorProps {
  id: string;
  value: string;
  onChange(value: string): void;
  error?: string;
  disabled?: boolean;
}

interface EditorCommand {
  command: string;
  label: string;
  title: string;
  value?: string;
}

const commands: EditorCommand[] = [
  { command: "bold", label: "B", title: "In đậm" },
  { command: "italic", label: "I", title: "In nghiêng" },
  { command: "insertUnorderedList", label: "•", title: "Danh sách" },
  { command: "formatBlock", value: "h2", label: "H2", title: "Tiêu đề phụ" },
  { command: "createLink", label: "↗", title: "Chèn liên kết" }
];

export function RichTextEditor({ id, value, onChange, error, disabled = false }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const errorId = `${id}-error`;

  useEffect(() => {
    const editor = editorRef.current;
    if (editor && editor.innerHTML !== value) editor.innerHTML = value;
  }, [value]);

  const emitValue = () => onChange(editorRef.current?.innerHTML ?? "");

  const runCommand = (command: EditorCommand) => {
    const editor = editorRef.current;
    if (!editor || disabled) return;
    editor.focus();
    let commandValue = command.value;
    if (command.command === "createLink") {
      const href = window.prompt("Dán đường liên kết (https://…)");
      if (!href) return;
      commandValue = href;
    }
    document.execCommand(command.command, false, commandValue);
    emitValue();
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const text = event.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
    emitValue();
  };

  return (
    <div className="rich-text-field">
      <div className="rich-text-toolbar" role="toolbar" aria-label="Định dạng nội dung bài viết">
        {commands.map((command) => (
          <button key={command.command} type="button" title={command.title} aria-label={command.title}
            disabled={disabled} onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand(command)}>
            {command.label}
          </button>
        ))}
      </div>
      <div
        ref={editorRef}
        id={id}
        className={`rich-text-editor ${error ? "rich-text-editor--invalid" : ""}`}
        contentEditable={!disabled}
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="Nội dung bài viết"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        data-placeholder="Chia sẻ cách làm, kết quả và bài học từ mùa vụ của bạn…"
        onInput={emitValue}
        onPaste={handlePaste}
      />
      <p className="rich-text-hint">Bạn có thể định dạng cơ bản hoặc dán văn bản. Nội dung được máy chủ làm sạch trước khi xuất bản.</p>
      {error && <span className="field-error" id={errorId}>{error}</span>}
    </div>
  );
}
