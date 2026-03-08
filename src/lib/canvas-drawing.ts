import { CanvasElement, PenElement, TextElement } from "./canvas-types";

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
      const weight = el.fontWeight === "bold" ? "bold" : "normal";
      const style = el.fontStyle === "italic" ? "italic" : "normal";
      ctx.font = `${style} ${weight} ${el.fontSize}px sans-serif`;
      ctx.fillStyle = el.strokeColor;
      const maxW = el.maxWidth || TEXT_MAX_WIDTH;
      const lines = wrapText(ctx, el.text, maxW);
      const lineHeight = el.fontSize * 1.3;
      for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], el.x, el.y + el.fontSize + i * lineHeight);
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
        const weight = el.fontWeight === "bold" ? "bold" : "normal";
        const style = el.fontStyle === "italic" ? "italic" : "normal";
        ctx.save();
        ctx.font = `${style} ${weight} ${el.fontSize}px sans-serif`;
        const maxW = el.maxWidth || TEXT_MAX_WIDTH;
        const lines = wrapText(ctx, el.text, maxW);
        let maxLineW = 0;
        for (const line of lines) {
          maxLineW = Math.max(maxLineW, ctx.measureText(line).width);
        }
        ctx.restore();
        const lineHeight = el.fontSize * 1.3;
        return { x: el.x, y: el.y, w: maxLineW, h: lines.length * lineHeight };
      }
      return { x: el.x, y: el.y, w: el.text.length * el.fontSize * 0.6, h: el.fontSize };
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
