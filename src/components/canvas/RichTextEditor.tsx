import { useRef, useEffect, useCallback } from "react";
import { TextSpan } from "@/lib/canvas-types";
import { spansToHtml, htmlToSpans } from "@/lib/canvas-drawing";

interface RichTextEditorProps {
  spans: TextSpan[];
  defaultColor: string;
  defaultBold: boolean;
  defaultItalic: boolean;
  fontSize: number;
  scale: number;
  screenX: number;
  screenY: number;
  onSave: (spans: TextSpan[], plainText: string) => void;
  onCancel: () => void;
  /** Called when toolbar formatting is applied externally */
  editorRef?: React.MutableRefObject<HTMLDivElement | null>;
}

export function RichTextEditor({
  spans,
  defaultColor,
  defaultBold,
  defaultItalic,
  fontSize,
  scale,
  screenX,
  screenY,
  onSave,
  onCancel,
  editorRef,
}: RichTextEditorProps) {
  const innerRef = useRef<HTMLDivElement>(null);
  const ref = editorRef || innerRef;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = spansToHtml(spans, defaultColor);
    el.focus();
    // Move cursor to end
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }, []); // only on mount

  const save = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const html = el.innerHTML;
    const parsed = htmlToSpans(html, defaultColor, defaultBold, defaultItalic);
    const plainText = parsed.map(s => s.text).join("");
    onSave(parsed, plainText);
  }, [defaultColor, defaultBold, defaultItalic, onSave, ref]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
      return;
    }
    // Don't submit on Enter - allow multiline. Use Escape to cancel, click away to save.
    // But we can use Ctrl+Enter to save
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      save();
      return;
    }
    // Prevent canvas shortcuts while editing
    e.stopPropagation();
  };

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onKeyDown={handleKeyDown}
      onBlur={save}
      className="absolute z-30 border-2 border-primary bg-card text-foreground outline-none rounded-md px-2 py-1"
      style={{
        left: screenX,
        top: screenY,
        minWidth: 150,
        maxWidth: 400,
        minHeight: 36,
        fontSize: fontSize * scale,
        lineHeight: 1.3,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        transformOrigin: "top left",
        color: defaultColor,
      }}
    />
  );
}
