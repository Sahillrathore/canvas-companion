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
  FontSize,
  fontSizeMap,
} from "@/lib/canvas-types";
import { generateId } from "@/lib/canvas-store";
import { drawElement, hitTest, isInSelectionRect, getElementBounds } from "@/lib/canvas-drawing";

interface CanvasBoardProps {
  elements: CanvasElement[];
  onElementsChange: (elements: CanvasElement[]) => void;
  activeTool: Tool;
  strokeColor: string;
  strokeWidth: number;
  onToolChange: (tool: Tool) => void;
  onUndo: () => void;
  onRedo: () => void;
  pushHistory: () => void;
  fontBold: boolean;
  fontItalic: boolean;
  fontSize: FontSize;
  bgColor: string;
  onSelectionStyleChange?: (style: {
    strokeColor?: string;
    fontBold?: boolean;
    fontItalic?: boolean;
    fontSize?: FontSize;
  }) => void;
}

interface SelectionRect {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

const MIN_SCALE = 0.1;
const MAX_SCALE = 5;

const reverseFontSizeMap: Record<number, FontSize> = {
  16: "small",
  24: "medium",
  36: "large",
};

export function CanvasBoard({
  elements,
  onElementsChange,
  activeTool,
  strokeColor,
  strokeWidth,
  onToolChange,
  onUndo,
  onRedo,
  pushHistory,
  fontBold,
  fontItalic,
  fontSize,
  bgColor,
  onSelectionStyleChange,
}: CanvasBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentElement, setCurrentElement] = useState<CanvasElement | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null);
  const [textInput, setTextInput] = useState<{ x: number; y: number; visible: boolean; editId?: string }>({
    x: 0, y: 0, visible: false,
  });
  const [textValue, setTextValue] = useState("");
  const textInputRef = useRef<HTMLTextAreaElement>(null);

  // Zoom & Pan
  const [scale, setScale] = useState(1);
  const [panOffset, setPanOffset] = useState<Point>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point | null>(null);
  const [spaceHeld, setSpaceHeld] = useState(false);

  // Track previous style props to apply to selection
  const prevStyleRef = useRef({ strokeColor, fontBold, fontItalic, fontSize });

  // Apply style changes to selected text elements
  useEffect(() => {
    const prev = prevStyleRef.current;
    if (selectedIds.size === 0) {
      prevStyleRef.current = { strokeColor, fontBold, fontItalic, fontSize };
      return;
    }

    const changed =
      prev.strokeColor !== strokeColor ||
      prev.fontBold !== fontBold ||
      prev.fontItalic !== fontItalic ||
      prev.fontSize !== fontSize;

    if (!changed) return;
    prevStyleRef.current = { strokeColor, fontBold, fontItalic, fontSize };

    let didChange = false;
    const updated = elements.map((el) => {
      if (!selectedIds.has(el.id)) return el;
      didChange = true;
      const base = { ...el, strokeColor };
      if (el.type === "text") {
        return {
          ...base,
          fontWeight: fontBold ? "bold" : "normal",
          fontStyle: fontItalic ? "italic" : "normal",
          fontSize: fontSizeMap[fontSize],
        } as TextElement;
      }
      return base;
    });
    if (didChange) {
      pushHistory();
      onElementsChange(updated);
    }
  }, [strokeColor, fontBold, fontItalic, fontSize, selectedIds]);

  // When selection changes, sync toolbar to selected element style
  useEffect(() => {
    if (selectedIds.size !== 1 || !onSelectionStyleChange) return;
    const selId = Array.from(selectedIds)[0];
    const el = elements.find((e) => e.id === selId);
    if (!el) return;

    const style: Parameters<NonNullable<typeof onSelectionStyleChange>>[0] = {
      strokeColor: el.strokeColor,
    };
    if (el.type === "text") {
      style.fontBold = el.fontWeight === "bold";
      style.fontItalic = el.fontStyle === "italic";
      style.fontSize = reverseFontSizeMap[el.fontSize] || "medium";
    }
    onSelectionStyleChange(style);
  }, [selectedIds]);

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

    ctx.save();
    // Clear
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, w, h);

    // Dot grid (in screen space)
    ctx.fillStyle = "#dde1e7";
    const spacing = 20;
    const gridOffX = (panOffset.x % (spacing * scale) + spacing * scale) % (spacing * scale);
    const gridOffY = (panOffset.y % (spacing * scale) + spacing * scale) % (spacing * scale);
    for (let x = gridOffX; x < w; x += spacing * scale) {
      for (let y = gridOffY; y < h; y += spacing * scale) {
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Apply transform
    ctx.translate(panOffset.x, panOffset.y);
    ctx.scale(scale, scale);

    for (const el of elements) {
      drawElement(ctx, el, selectedIds.has(el.id));
    }
    if (currentElement) {
      drawElement(ctx, currentElement, false);
    }

    // Selection rectangle (in canvas coords)
    if (selectionRect) {
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 1 / scale;
      ctx.setLineDash([4 / scale, 4 / scale]);
      ctx.fillStyle = "rgba(59, 130, 246, 0.08)";
      const rx = Math.min(selectionRect.startX, selectionRect.endX);
      const ry = Math.min(selectionRect.startY, selectionRect.endY);
      const rw = Math.abs(selectionRect.endX - selectionRect.startX);
      const rh = Math.abs(selectionRect.endY - selectionRect.startY);
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeRect(rx, ry, rw, rh);
      ctx.setLineDash([]);
    }

    ctx.restore();
  }, [elements, currentElement, selectedIds, selectionRect, bgColor, scale, panOffset]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !textInput.visible) {
        e.preventDefault();
        setSpaceHeld(true);
        return;
      }
      if (textInput.visible) return;

      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault(); onUndo(); return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "Z" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault(); onRedo(); return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "=" || e.key === "+")) {
        e.preventDefault();
        setScale((s) => Math.min(MAX_SCALE, s * 1.2));
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "-") {
        e.preventDefault();
        setScale((s) => Math.max(MIN_SCALE, s / 1.2));
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "0") {
        e.preventDefault();
        setScale(1);
        setPanOffset({ x: 0, y: 0 });
        return;
      }
      if (e.ctrlKey || e.metaKey) return;

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
          pushHistory();
          onElementsChange(elements.filter((el) => !selectedIds.has(el.id)));
          setSelectedIds(new Set());
        }
      } else if (key === "escape") {
        setSelectedIds(new Set());
        setSelectionRect(null);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") setSpaceHeld(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [activeTool, selectedIds, elements, onElementsChange, onToolChange, textInput.visible, onUndo, onRedo, pushHistory]);

  // Wheel zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const rect = container.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * delta));
        const ratio = newScale / scale;
        setPanOffset({
          x: mx - ratio * (mx - panOffset.x),
          y: my - ratio * (my - panOffset.y),
        });
        setScale(newScale);
      } else {
        // Pan with wheel
        setPanOffset((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
      }
    };
    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [scale, panOffset]);

  const screenToCanvas = (e: React.MouseEvent): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    return {
      x: (sx - panOffset.x) / scale,
      y: (sy - panOffset.y) / scale,
    };
  };

  const canvasToScreen = (p: Point): Point => ({
    x: p.x * scale + panOffset.x,
    y: p.y * scale + panOffset.y,
  });

  const getCtx = () => canvasRef.current?.getContext("2d") ?? null;

  const handleMouseDown = (e: React.MouseEvent) => {
    // Space+drag = pan
    if (spaceHeld || e.button === 1) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    const point = screenToCanvas(e);
    const ctx = getCtx();

    if (activeTool === "select") {
      let hit: CanvasElement | null = null;
      for (let i = elements.length - 1; i >= 0; i--) {
        if (hitTest(elements[i], point.x, point.y, ctx ?? undefined)) {
          hit = elements[i]; break;
        }
      }
      if (hit) {
        setSelectedIds(new Set([hit.id]));
        setDragStart(point);
      } else {
        setSelectedIds(new Set());
        setSelectionRect({ startX: point.x, startY: point.y, endX: point.x, endY: point.y });
      }
      return;
    }

    if (activeTool === "eraser") {
      for (let i = elements.length - 1; i >= 0; i--) {
        if (hitTest(elements[i], point.x, point.y, ctx ?? undefined)) {
          pushHistory();
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
    pushHistory();

    if (activeTool === "pen") {
      setCurrentElement({
        id: generateId(), type: "pen", x: point.x, y: point.y,
        points: [point], strokeColor, strokeWidth,
      } as PenElement);
    } else if (activeTool === "line") {
      setCurrentElement({
        id: generateId(), type: "line", x: point.x, y: point.y,
        endX: point.x, endY: point.y, strokeColor, strokeWidth,
      } as LineElement);
    } else if (activeTool === "rectangle") {
      setCurrentElement({
        id: generateId(), type: "rectangle", x: point.x, y: point.y,
        width: 0, height: 0, strokeColor, strokeWidth, fillColor: "transparent",
      } as RectangleElement);
    } else if (activeTool === "ellipse") {
      setCurrentElement({
        id: generateId(), type: "ellipse", x: point.x, y: point.y,
        radiusX: 0, radiusY: 0, strokeColor, strokeWidth, fillColor: "transparent",
      } as EllipseElement);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Panning
    if (isPanning && panStart) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setPanStart({ x: e.clientX, y: e.clientY });
      setPanOffset((p) => ({ x: p.x + dx, y: p.y + dy }));
      return;
    }

    const point = screenToCanvas(e);

    if (activeTool === "select" && selectionRect && !dragStart) {
      setSelectionRect({ ...selectionRect, endX: point.x, endY: point.y });
      return;
    }

    if (activeTool === "select" && dragStart && selectedIds.size > 0) {
      const dx = point.x - dragStart.x;
      const dy = point.y - dragStart.y;
      setDragStart(point);
      onElementsChange(
        elements.map((el) => {
          if (!selectedIds.has(el.id)) return el;
          const moved = { ...el, x: el.x + dx, y: el.y + dy };
          if (moved.type === "pen") {
            return { ...moved, points: (el as PenElement).points.map((p) => ({ x: p.x + dx, y: p.y + dy })) } as PenElement;
          }
          if (moved.type === "line") {
            return { ...moved, endX: (el as LineElement).endX + dx, endY: (el as LineElement).endY + dy } as LineElement;
          }
          return moved;
        })
      );
      return;
    }

    if (!isDrawing || !currentElement) return;

    if (currentElement.type === "pen") {
      setCurrentElement({ ...currentElement, points: [...currentElement.points, point] });
    } else if (currentElement.type === "line") {
      setCurrentElement({ ...currentElement, endX: point.x, endY: point.y });
    } else if (currentElement.type === "rectangle") {
      setCurrentElement({ ...currentElement, width: point.x - currentElement.x, height: point.y - currentElement.y });
    } else if (currentElement.type === "ellipse") {
      setCurrentElement({ ...currentElement, radiusX: (point.x - currentElement.x) / 2, radiusY: (point.y - currentElement.y) / 2 } as EllipseElement);
    }
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      setPanStart(null);
      return;
    }
    if (selectionRect) {
      const selected = elements.filter((el) => isInSelectionRect(el, selectionRect));
      setSelectedIds(new Set(selected.map((el) => el.id)));
      setSelectionRect(null);
    }
    if (dragStart) setDragStart(null);
    if (isDrawing && currentElement) {
      onElementsChange([...elements, currentElement]);
      setCurrentElement(null);
    }
    setIsDrawing(false);
  };

  // Double-click to edit text
  const handleDoubleClick = (e: React.MouseEvent) => {
    const point = screenToCanvas(e);
    const ctx = getCtx();
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      if (el.type === "text" && hitTest(el, point.x, point.y, ctx ?? undefined)) {
        setTextInput({ x: el.x, y: el.y, visible: true, editId: el.id });
        setTextValue(el.text);
        setSelectedIds(new Set([el.id]));
        setTimeout(() => textInputRef.current?.focus(), 50);
        return;
      }
    }
  };

  const handleTextSubmit = () => {
    if (textInput.editId) {
      // Editing existing text
      if (textValue.trim()) {
        pushHistory();
        onElementsChange(
          elements.map((el) =>
            el.id === textInput.editId && el.type === "text"
              ? { ...el, text: textValue } as TextElement
              : el
          )
        );
      } else {
        // Empty = delete
        pushHistory();
        onElementsChange(elements.filter((el) => el.id !== textInput.editId));
      }
    } else if (textValue.trim()) {
      pushHistory();
      const el: TextElement = {
        id: generateId(), type: "text", x: textInput.x, y: textInput.y,
        text: textValue, fontSize: fontSizeMap[fontSize], strokeColor, strokeWidth,
        fontWeight: fontBold ? "bold" : "normal",
        fontStyle: fontItalic ? "italic" : "normal",
      };
      onElementsChange([...elements, el]);
    }
    setTextInput({ x: 0, y: 0, visible: false });
    setTextValue("");
  };

  const textScreenPos = canvasToScreen({ x: textInput.x, y: textInput.y });

  // Determine current editing text element for styling the textarea
  const editingEl = textInput.editId ? elements.find((e) => e.id === textInput.editId) as TextElement | undefined : undefined;
  const currentFontSize = editingEl ? editingEl.fontSize : fontSizeMap[fontSize];
  const currentBold = editingEl ? editingEl.fontWeight === "bold" : fontBold;
  const currentItalic = editingEl ? editingEl.fontStyle === "italic" : fontItalic;

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden" style={{ backgroundColor: bgColor }}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        style={{
          cursor:
            spaceHeld || isPanning ? "grab"
            : activeTool === "select" ? "default"
            : activeTool === "text" ? "text"
            : activeTool === "eraser" ? "pointer"
            : "crosshair",
        }}
      />
      {textInput.visible && (
        <textarea
          ref={textInputRef}
          value={textValue}
          onChange={(e) => setTextValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleTextSubmit(); }
            if (e.key === "Escape") {
              setTextInput({ x: 0, y: 0, visible: false });
              setTextValue("");
            }
          }}
          onBlur={handleTextSubmit}
          className="absolute z-30 border-2 border-primary bg-card px-2 py-1 text-foreground outline-none rounded-md resize-none"
          style={{
            left: textScreenPos.x,
            top: textScreenPos.y,
            minWidth: 150,
            maxWidth: 400,
            minHeight: 36,
            fontSize: currentFontSize * scale,
            fontWeight: currentBold ? "bold" : "normal",
            fontStyle: currentItalic ? "italic" : "normal",
            transformOrigin: "top left",
          }}
          placeholder="Type text... (Shift+Enter for new line)"
        />
      )}

      {/* Zoom indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-lg bg-toolbar px-3 py-1.5 shadow-md">
        <button
          onClick={() => setScale((s) => Math.max(MIN_SCALE, s / 1.2))}
          className="text-toolbar-foreground hover:text-toolbar-active-foreground text-sm font-bold px-1"
        >
          −
        </button>
        <button
          onClick={() => { setScale(1); setPanOffset({ x: 0, y: 0 }); }}
          className="text-toolbar-foreground hover:text-toolbar-active-foreground text-xs font-semibold min-w-[48px] text-center"
        >
          {Math.round(scale * 100)}%
        </button>
        <button
          onClick={() => setScale((s) => Math.min(MAX_SCALE, s * 1.2))}
          className="text-toolbar-foreground hover:text-toolbar-active-foreground text-sm font-bold px-1"
        >
          +
        </button>
      </div>
    </div>
  );
}
