import { useRef, useEffect, useState, useCallback } from "react";
import {
  CanvasElement,
  Tool,
  Point,
  PenElement,
  LineElement,
  RectangleElement,
  EllipseElement,
  TextElement,
} from "@/lib/canvas-types";
import { generateId } from "@/lib/canvas-store";

interface CanvasBoardProps {
  elements: CanvasElement[];
  onElementsChange: (elements: CanvasElement[]) => void;
  activeTool: Tool;
  strokeColor: string;
  strokeWidth: number;
  onToolChange: (tool: Tool) => void;
}

function drawElement(ctx: CanvasRenderingContext2D, el: CanvasElement, selected: boolean) {
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
        0,
        0,
        Math.PI * 2
      );
      if (el.fillColor && el.fillColor !== "transparent") {
        ctx.fillStyle = el.fillColor;
        ctx.fill();
      }
      ctx.stroke();
      break;
    }
    case "text": {
      ctx.font = `${el.fontSize}px sans-serif`;
      ctx.fillStyle = el.strokeColor;
      ctx.fillText(el.text, el.x, el.y + el.fontSize);
      break;
    }
  }

  if (selected) {
    const bounds = getElementBounds(el);
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(bounds.x - 4, bounds.y - 4, bounds.w + 8, bounds.h + 8);
    ctx.setLineDash([]);
  }

  ctx.restore();
}

function getElementBounds(el: CanvasElement): { x: number; y: number; w: number; h: number } {
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
    case "text":
      return { x: el.x, y: el.y, w: el.text.length * el.fontSize * 0.6, h: el.fontSize };
  }
}

function hitTest(el: CanvasElement, px: number, py: number): boolean {
  const b = getElementBounds(el);
  const pad = 8;
  return (
    px >= b.x - pad &&
    px <= b.x + b.w + pad &&
    py >= b.y - pad &&
    py <= b.y + b.h + pad
  );
}

export function CanvasBoard({
  elements,
  onElementsChange,
  activeTool,
  strokeColor,
  strokeWidth,
  onToolChange,
}: CanvasBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentElement, setCurrentElement] = useState<CanvasElement | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [textInput, setTextInput] = useState<{ x: number; y: number; visible: boolean }>({
    x: 0,
    y: 0,
    visible: false,
  });
  const [textValue, setTextValue] = useState("");
  const textInputRef = useRef<HTMLInputElement>(null);

  // Resize canvas
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = container.clientWidth * dpr;
      canvas.height = container.clientHeight * dpr;
      canvas.style.width = `${container.clientWidth}px`;
      canvas.style.height = `${container.clientHeight}px`;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // Redraw
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = container.clientWidth;
    const h = container.clientHeight;

    ctx.clearRect(0, 0, w, h);

    // Draw dot grid
    ctx.fillStyle = getComputedStyle(document.documentElement)
      .getPropertyValue("--canvas-dot")
      ? "#dde1e7"
      : "#dde1e7";
    const spacing = 20;
    for (let x = spacing; x < w; x += spacing) {
      for (let y = spacing; y < h; y += spacing) {
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (const el of elements) {
      drawElement(ctx, el, selectedIds.has(el.id));
    }
    if (currentElement) {
      drawElement(ctx, currentElement, false);
    }
  }, [elements, currentElement, selectedIds]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (textInput.visible) return;
      const key = e.key.toLowerCase();
      if (key === "v") onToolChange("select");
      else if (key === "p") onToolChange("pen");
      else if (key === "l") onToolChange("line");
      else if (key === "r") onToolChange("rectangle");
      else if (key === "o") onToolChange("ellipse");
      else if (key === "t") onToolChange("text");
      else if (key === "e") onToolChange("eraser");
      else if (key === "delete" || key === "backspace") {
        if (selectedIds.size > 0) {
          e.preventDefault();
          onElementsChange(elements.filter((el) => !selectedIds.has(el.id)));
          setSelectedIds(new Set());
        }
      } else if (key === "escape") {
        setSelectedIds(new Set());
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [activeTool, selectedIds, elements, onElementsChange, onToolChange, textInput.visible]);

  const getCanvasPoint = (e: React.MouseEvent): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const point = getCanvasPoint(e);

    if (activeTool === "select") {
      // Check hit
      let hit: CanvasElement | null = null;
      for (let i = elements.length - 1; i >= 0; i--) {
        if (hitTest(elements[i], point.x, point.y)) {
          hit = elements[i];
          break;
        }
      }
      if (hit) {
        setSelectedIds(new Set([hit.id]));
        setDragStart(point);
      } else {
        setSelectedIds(new Set());
      }
      return;
    }

    if (activeTool === "eraser") {
      for (let i = elements.length - 1; i >= 0; i--) {
        if (hitTest(elements[i], point.x, point.y)) {
          onElementsChange(elements.filter((_, idx) => idx !== i));
          break;
        }
      }
      return;
    }

    if (activeTool === "text") {
      setTextInput({ x: point.x, y: point.y, visible: true });
      setTextValue("");
      setTimeout(() => textInputRef.current?.focus(), 50);
      return;
    }

    setIsDrawing(true);

    if (activeTool === "pen") {
      const el: PenElement = {
        id: generateId(),
        type: "pen",
        x: point.x,
        y: point.y,
        points: [point],
        strokeColor,
        strokeWidth,
      };
      setCurrentElement(el);
    } else if (activeTool === "line") {
      const el: LineElement = {
        id: generateId(),
        type: "line",
        x: point.x,
        y: point.y,
        endX: point.x,
        endY: point.y,
        strokeColor,
        strokeWidth,
      };
      setCurrentElement(el);
    } else if (activeTool === "rectangle") {
      const el: RectangleElement = {
        id: generateId(),
        type: "rectangle",
        x: point.x,
        y: point.y,
        width: 0,
        height: 0,
        strokeColor,
        strokeWidth,
        fillColor: "transparent",
      };
      setCurrentElement(el);
    } else if (activeTool === "ellipse") {
      const el: EllipseElement = {
        id: generateId(),
        type: "ellipse",
        x: point.x,
        y: point.y,
        radiusX: 0,
        radiusY: 0,
        strokeColor,
        strokeWidth,
        fillColor: "transparent",
      };
      setCurrentElement(el);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const point = getCanvasPoint(e);

    // Dragging selected elements
    if (activeTool === "select" && dragStart && selectedIds.size > 0) {
      const dx = point.x - dragStart.x;
      const dy = point.y - dragStart.y;
      setDragStart(point);
      onElementsChange(
        elements.map((el) => {
          if (!selectedIds.has(el.id)) return el;
          const moved = { ...el, x: el.x + dx, y: el.y + dy };
          if (moved.type === "pen") {
            return {
              ...moved,
              points: (el as PenElement).points.map((p) => ({
                x: p.x + dx,
                y: p.y + dy,
              })),
            } as PenElement;
          }
          if (moved.type === "line") {
            return {
              ...moved,
              endX: (el as LineElement).endX + dx,
              endY: (el as LineElement).endY + dy,
            } as LineElement;
          }
          return moved;
        })
      );
      return;
    }

    if (!isDrawing || !currentElement) return;

    if (currentElement.type === "pen") {
      setCurrentElement({
        ...currentElement,
        points: [...currentElement.points, point],
      });
    } else if (currentElement.type === "line") {
      setCurrentElement({
        ...currentElement,
        endX: point.x,
        endY: point.y,
      });
    } else if (currentElement.type === "rectangle") {
      setCurrentElement({
        ...currentElement,
        width: point.x - currentElement.x,
        height: point.y - currentElement.y,
      });
    } else if (currentElement.type === "ellipse") {
      setCurrentElement({
        ...currentElement,
        radiusX: (point.x - currentElement.x) / 2,
        radiusY: (point.y - currentElement.y) / 2,
      } as EllipseElement);
    }
  };

  const handleMouseUp = () => {
    if (dragStart) {
      setDragStart(null);
    }
    if (isDrawing && currentElement) {
      onElementsChange([...elements, currentElement]);
      setCurrentElement(null);
    }
    setIsDrawing(false);
  };

  const handleTextSubmit = () => {
    if (textValue.trim()) {
      const el: TextElement = {
        id: generateId(),
        type: "text",
        x: textInput.x,
        y: textInput.y,
        text: textValue,
        fontSize: 20,
        strokeColor,
        strokeWidth,
      };
      onElementsChange([...elements, el]);
    }
    setTextInput({ x: 0, y: 0, visible: false });
    setTextValue("");
  };

  return (
    <div ref={containerRef} className="w-full h-full relative bg-canvas overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          cursor:
            activeTool === "select"
              ? "default"
              : activeTool === "text"
              ? "text"
              : activeTool === "eraser"
              ? "pointer"
              : "crosshair",
        }}
      />
      {textInput.visible && (
        <input
          ref={textInputRef}
          type="text"
          value={textValue}
          onChange={(e) => setTextValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleTextSubmit();
            if (e.key === "Escape") {
              setTextInput({ x: 0, y: 0, visible: false });
              setTextValue("");
            }
          }}
          onBlur={handleTextSubmit}
          className="absolute z-30 border-2 border-primary bg-card px-2 py-1 text-foreground outline-none rounded-md text-base"
          style={{ left: textInput.x, top: textInput.y, minWidth: 120 }}
          placeholder="Type text..."
        />
      )}
    </div>
  );
}
