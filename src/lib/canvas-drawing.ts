import { CanvasElement, TextElement, TextSpan } from "./canvas-types";

interface SelectionRect {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

const TEXT_MAX_WIDTH = 400;

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const paragraphs = text.split("\n");
  const lines: string[] = [];
  for (const para of paragraphs) {
    const words = para.split(" ");
    let currentLine = "";
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (ctx.measureText(testLine).width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    lines.push(currentLine);
  }
  return lines;
}

/** Get spans from a TextElement, falling back to legacy text field */
export function getSpans(el: TextElement): TextSpan[] {
  if (el.spans && el.spans.length > 0) return el.spans;
  return [{
    text: el.text,
    bold: el.fontWeight === "bold",
    italic: el.fontStyle === "italic",
    color: el.strokeColor,
  }];
}

/** Flatten spans into plain text */
export function spansToPlainText(spans: TextSpan[]): string {
  return spans.map(s => s.text).join("");
}

/** Convert spans to HTML for contenteditable */
export function spansToHtml(spans: TextSpan[], defaultColor: string): string {
  return spans.map(span => {
    const styles: string[] = [];
    if (span.bold) styles.push("font-weight:bold");
    if (span.italic) styles.push("font-style:italic");
    if (span.color && span.color !== defaultColor) styles.push(`color:${span.color}`);
    const styleAttr = styles.length ? ` style="${styles.join(";")}"` : "";
    const escaped = span.text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
    return `<span${styleAttr}>${escaped}</span>`;
  }).join("");
}

/** Parse HTML from contenteditable back into spans */
export function htmlToSpans(html: string, defaultColor: string, defaultBold: boolean, defaultItalic: boolean): TextSpan[] {
  const div = document.createElement("div");
  div.innerHTML = html;
  const spans: TextSpan[] = [];

  function processNode(node: Node, inheritBold: boolean, inheritItalic: boolean, inheritColor: string) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || "";
      if (text) {
        spans.push({ text, bold: inheritBold, italic: inheritItalic, color: inheritColor });
      }
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    let bold = inheritBold;
    let italic = inheritItalic;
    let color = inheritColor;

    if (tag === "b" || tag === "strong") bold = true;
    if (tag === "i" || tag === "em") italic = true;
    if (tag === "br") { spans.push({ text: "\n", bold, italic, color }); return; }

    const style = el.style;
    if (style.fontWeight === "bold" || style.fontWeight === "700") bold = true;
    if (style.fontWeight === "normal" || style.fontWeight === "400") bold = false;
    if (style.fontStyle === "italic") italic = true;
    if (style.fontStyle === "normal") italic = false;
    if (style.color) color = style.color;

    if (el.childNodes.length === 0 && tag !== "br") {
      // Empty element, skip
      return;
    }

    for (const child of Array.from(el.childNodes)) {
      processNode(child, bold, italic, color);
    }

    // Add newline after block elements
    if (tag === "div" || tag === "p") {
      if (spans.length > 0 && spans[spans.length - 1].text !== "\n") {
        spans.push({ text: "\n", bold: false, italic: false, color: defaultColor });
      }
    }
  }

  for (const child of Array.from(div.childNodes)) {
    processNode(child, defaultBold, defaultItalic, defaultColor);
  }

  // Remove trailing newline
  if (spans.length > 0 && spans[spans.length - 1].text === "\n") {
    spans.pop();
  }

  // Merge adjacent spans with same style
  const merged: TextSpan[] = [];
  for (const span of spans) {
    const last = merged[merged.length - 1];
    if (last && last.bold === span.bold && last.italic === span.italic && last.color === span.color) {
      last.text += span.text;
    } else {
      merged.push({ ...span });
    }
  }

  return merged.length > 0 ? merged : [{ text: "", bold: defaultBold, italic: defaultItalic, color: defaultColor }];
}

/** Word-wrapped rich text line layout for canvas rendering */
interface RichTextWord {
  text: string;
  bold: boolean;
  italic: boolean;
  color: string;
  width: number;
}

interface RichTextLine {
  words: RichTextWord[];
  totalWidth: number;
}

function layoutRichText(
  ctx: CanvasRenderingContext2D,
  spans: TextSpan[],
  fontSize: number,
  maxWidth: number,
  defaultColor: string,
): RichTextLine[] {
  const lines: RichTextLine[] = [];
  let currentLine: RichTextWord[] = [];
  let lineWidth = 0;

  function getFont(bold: boolean, italic: boolean) {
    return `${italic ? "italic" : "normal"} ${bold ? "bold" : "normal"} ${fontSize}px sans-serif`;
  }

  function pushLine() {
    lines.push({ words: currentLine, totalWidth: lineWidth });
    currentLine = [];
    lineWidth = 0;
  }

  for (const span of spans) {
    const bold = span.bold ?? false;
    const italic = span.italic ?? false;
    const color = span.color || defaultColor;
    ctx.font = getFont(bold, italic);

    // Split by newlines first
    const parts = span.text.split("\n");
    for (let pi = 0; pi < parts.length; pi++) {
      if (pi > 0) pushLine(); // newline

      const words = parts[pi].split(/( )/); // keep spaces
      for (const word of words) {
        if (!word) continue;
        const w = ctx.measureText(word).width;
        if (lineWidth + w > maxWidth && currentLine.length > 0 && word.trim()) {
          pushLine();
        }
        currentLine.push({ text: word, bold, italic, color, width: w });
        lineWidth += w;
      }
    }
  }
  if (currentLine.length > 0) pushLine();
  return lines;
}

export function drawElement(ctx: CanvasRenderingContext2D, el: CanvasElement, selected: boolean) {
  ctx.save();
  ctx.strokeStyle = el.strokeColor;
  ctx.lineWidth = el.strokeWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  switch (el.type) {
    case "pen": {
      if (el.points.length < 2) break;
      ctx.beginPath();
      ctx.moveTo(el.points[0].x, el.points[0].y);
      for (let i = 1; i < el.points.length; i++) {
        ctx.lineTo(el.points[i].x, el.points[i].y);
      }
      ctx.stroke();
      break;
    }
    case "line": {
      ctx.beginPath();
      ctx.moveTo(el.x, el.y);
      ctx.lineTo(el.endX, el.endY);
      ctx.stroke();
      break;
    }
    case "rectangle": {
      if (el.fillColor && el.fillColor !== "transparent") {
        ctx.fillStyle = el.fillColor;
        ctx.fillRect(el.x, el.y, el.width, el.height);
      }
      ctx.strokeRect(el.x, el.y, el.width, el.height);
      break;
    }
    case "ellipse": {
      ctx.beginPath();
      ctx.ellipse(
        el.x + el.radiusX,
        el.y + el.radiusY,
        Math.abs(el.radiusX),
        Math.abs(el.radiusY),
        0, 0, Math.PI * 2
      );
      if (el.fillColor && el.fillColor !== "transparent") {
        ctx.fillStyle = el.fillColor;
        ctx.fill();
      }
      ctx.stroke();
      break;
    }
    case "text": {
      const spans = getSpans(el);
      const maxW = el.maxWidth || TEXT_MAX_WIDTH;
      const lines = layoutRichText(ctx, spans, el.fontSize, maxW, el.strokeColor);
      const lineHeight = el.fontSize * 1.3;

      for (let i = 0; i < lines.length; i++) {
        let x = el.x;
        const y = el.y + el.fontSize + i * lineHeight;
        for (const word of lines[i].words) {
          ctx.font = `${word.italic ? "italic" : "normal"} ${word.bold ? "bold" : "normal"} ${el.fontSize}px sans-serif`;
          ctx.fillStyle = word.color;
          ctx.fillText(word.text, x, y);
          x += word.width;
        }
      }
      break;
    }
  }

  if (selected) {
    const bounds = getElementBounds(el, ctx);
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(bounds.x - 4, bounds.y - 4, bounds.w + 8, bounds.h + 8);
    ctx.setLineDash([]);
  }

  ctx.restore();
}

export function getElementBounds(el: CanvasElement, ctx?: CanvasRenderingContext2D): { x: number; y: number; w: number; h: number } {
  switch (el.type) {
    case "pen": {
      if (el.points.length === 0) return { x: el.x, y: el.y, w: 0, h: 0 };
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const p of el.points) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      }
      return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    }
    case "line": {
      const minX = Math.min(el.x, el.endX);
      const minY = Math.min(el.y, el.endY);
      return { x: minX, y: minY, w: Math.abs(el.endX - el.x), h: Math.abs(el.endY - el.y) };
    }
    case "rectangle":
      return { x: el.x, y: el.y, w: el.width, h: el.height };
    case "ellipse":
      return { x: el.x, y: el.y, w: el.radiusX * 2, h: el.radiusY * 2 };
    case "text": {
      if (ctx) {
        const spans = getSpans(el);
        const maxW = el.maxWidth || TEXT_MAX_WIDTH;
        const lines = layoutRichText(ctx, spans, el.fontSize, maxW, el.strokeColor);
        let maxLineW = 0;
        for (const line of lines) {
          maxLineW = Math.max(maxLineW, line.totalWidth);
        }
        const lineHeight = el.fontSize * 1.3;
        return { x: el.x, y: el.y, w: maxLineW, h: lines.length * lineHeight };
      }
      const plainText = el.spans ? spansToPlainText(el.spans) : el.text;
      return { x: el.x, y: el.y, w: plainText.length * el.fontSize * 0.6, h: el.fontSize };
    }
  }
}

export function hitTest(el: CanvasElement, px: number, py: number, ctx?: CanvasRenderingContext2D): boolean {
  const b = getElementBounds(el, ctx);
  const pad = 8;
  return px >= b.x - pad && px <= b.x + b.w + pad && py >= b.y - pad && py <= b.y + b.h + pad;
}

export function isInSelectionRect(el: CanvasElement, rect: SelectionRect): boolean {
  const b = getElementBounds(el);
  const sx = Math.min(rect.startX, rect.endX);
  const sy = Math.min(rect.startY, rect.endY);
  const sw = Math.abs(rect.endX - rect.startX);
  const sh = Math.abs(rect.endY - rect.startY);
  return !(b.x + b.w < sx || b.x > sx + sw || b.y + b.h < sy || b.y > sy + sh);
}
