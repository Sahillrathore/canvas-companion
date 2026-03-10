import { useRef, useEffect, useCallback, useState } from "react";
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
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = spansToHtml(spans, defaultColor);

    // Delay focus slightly to avoid immediate blur from canvas mouseup
    const timer = setTimeout(() => {
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      setReady(true);
    }, 50);

    return () => clearTimeout(timer);
  }, []); // only on mount

  const save = useCallback(() => {
    if (!ready) return; // Ignore blur before editor is ready
    const el = ref.current;
    if (!el) return;
    const html = el.innerHTML;
    const parsed = htmlToSpans(html, defaultColor, defaultBold, defaultItalic);
    const plainText = parsed.map(s => s.text).join("");
    onSave(parsed, plainText);
  }, [defaultColor, defaultBold, defaultItalic, onSave, ref, ready]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
      return;
    }
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      save();
      return;
    }
    e.stopPropagation();
  };

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onKeyDown={handleKeyDown}
      onBlur={save}
      className="absolute z-30 outline-none"
      style={{
        left: screenX,
        top: screenY,
        minWidth: 2,
        maxWidth: 400,
        minHeight: fontSize * scale * 1.3,
        fontSize: fontSize * scale,
        lineHeight: 1.3,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        transformOrigin: "top left",
        color: defaultColor,
        caretColor: defaultColor,
        background: "transparent",
        border: `1.5px dashed hsl(var(--primary) / 0.4)`,
        borderRadius: 2,
        padding: "1px 2px",
      }}
    />
  );
}
