import { Tool, FontSize } from "@/lib/canvas-types";
import {
  MousePointer2,
  Pencil,
  Minus,
  Square,
  Circle,
  Type,
  Eraser,
  Undo2,
  Redo2,
  Bold,
  Italic,
  Paintbrush,
} from "lucide-react";

interface ToolbarProps {
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
  strokeColor: string;
  onStrokeColorChange: (color: string) => void;
  strokeWidth: number;
  onStrokeWidthChange: (width: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  fontBold: boolean;
  onFontBoldChange: (v: boolean) => void;
  fontItalic: boolean;
  onFontItalicChange: (v: boolean) => void;
  fontSize: FontSize;
  onFontSizeChange: (s: FontSize) => void;
  bgColor: string;
  onBgColorChange: (c: string) => void;
}

const tools: { tool: Tool; icon: React.ElementType; label: string; shortcut: string }[] = [
  { tool: "select", icon: MousePointer2, label: "Select", shortcut: "V" },
  { tool: "pen", icon: Pencil, label: "Pen", shortcut: "P" },
  { tool: "line", icon: Minus, label: "Line", shortcut: "L" },
  { tool: "rectangle", icon: Square, label: "Rectangle", shortcut: "R" },
  { tool: "ellipse", icon: Circle, label: "Ellipse", shortcut: "O" },
  { tool: "text", icon: Type, label: "Text", shortcut: "T" },
  { tool: "eraser", icon: Eraser, label: "Eraser", shortcut: "E" },
];

const colors = [
  "#1e293b", "#ef4444", "#f97316", "#eab308",
  "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899",
];

const bgColors = [
  "#ffffff", "#f8fafc", "#fef3c7", "#d1fae5",
  "#dbeafe", "#fce7f3", "#1e293b", "#0f172a",
];

const fontSizes: { label: string; value: FontSize }[] = [
  { label: "S", value: "small" },
  { label: "M", value: "medium" },
  { label: "L", value: "large" },
];

export function Toolbar({
  activeTool,
  onToolChange,
  strokeColor,
  onStrokeColorChange,
  strokeWidth,
  onStrokeWidthChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  fontBold,
  onFontBoldChange,
  fontItalic,
  onFontItalicChange,
  fontSize,
  onFontSizeChange,
  bgColor,
  onBgColorChange,
}: ToolbarProps) {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 rounded-xl bg-toolbar px-2 py-1.5 shadow-lg">
      {/* Undo/Redo */}
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className="flex items-center justify-center w-9 h-9 rounded-lg text-toolbar-foreground hover:text-toolbar-active-foreground hover:bg-toolbar-active/20 transition-colors disabled:opacity-30 disabled:pointer-events-none"
        title="Undo (Ctrl+Z)"
      >
        <Undo2 className="w-[18px] h-[18px]" />
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        className="flex items-center justify-center w-9 h-9 rounded-lg text-toolbar-foreground hover:text-toolbar-active-foreground hover:bg-toolbar-active/20 transition-colors disabled:opacity-30 disabled:pointer-events-none"
        title="Redo (Ctrl+Shift+Z)"
      >
        <Redo2 className="w-[18px] h-[18px]" />
      </button>

      <div className="w-px h-6 bg-toolbar-foreground/20 mx-1" />

      {tools.map(({ tool, icon: Icon, label, shortcut }) => (
        <button
          key={tool}
          onClick={() => onToolChange(tool)}
          className={`relative flex items-center justify-center w-9 h-9 rounded-lg transition-colors ${
            activeTool === tool
              ? "bg-toolbar-active text-toolbar-active-foreground"
              : "text-toolbar-foreground hover:text-toolbar-active-foreground hover:bg-toolbar-active/20"
          }`}
          title={`${label} (${shortcut})`}
        >
          <Icon className="w-[18px] h-[18px]" />
        </button>
      ))}

      <div className="w-px h-6 bg-toolbar-foreground/20 mx-1" />

      {/* Color picker */}
      <div className="flex items-center gap-1">
        {colors.map((c) => (
          <button
            key={c}
            onClick={() => onStrokeColorChange(c)}
            className={`w-5 h-5 rounded-full border-2 transition-transform ${
              strokeColor === c ? "border-toolbar-active-foreground scale-125" : "border-transparent"
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      <div className="w-px h-6 bg-toolbar-foreground/20 mx-1" />

      {/* Stroke width */}
      <div className="flex items-center gap-1">
        {[2, 4, 6].map((w) => (
          <button
            key={w}
            onClick={() => onStrokeWidthChange(w)}
            className={`flex items-center justify-center w-7 h-7 rounded-md transition-colors ${
              strokeWidth === w
                ? "bg-toolbar-active text-toolbar-active-foreground"
                : "text-toolbar-foreground hover:text-toolbar-active-foreground hover:bg-toolbar-active/20"
            }`}
          >
            <div
              className="rounded-full bg-current"
              style={{ width: w + 2, height: w + 2 }}
            />
          </button>
        ))}
      </div>

      <div className="w-px h-6 bg-toolbar-foreground/20 mx-1" />

      {/* Text style controls */}
      <button
        onClick={() => onFontBoldChange(!fontBold)}
        className={`flex items-center justify-center w-8 h-8 rounded-md transition-colors ${
          fontBold
            ? "bg-toolbar-active text-toolbar-active-foreground"
            : "text-toolbar-foreground hover:text-toolbar-active-foreground hover:bg-toolbar-active/20"
        }`}
        title="Bold"
      >
        <Bold className="w-4 h-4" />
      </button>
      <button
        onClick={() => onFontItalicChange(!fontItalic)}
        className={`flex items-center justify-center w-8 h-8 rounded-md transition-colors ${
          fontItalic
            ? "bg-toolbar-active text-toolbar-active-foreground"
            : "text-toolbar-foreground hover:text-toolbar-active-foreground hover:bg-toolbar-active/20"
        }`}
        title="Italic"
      >
        <Italic className="w-4 h-4" />
      </button>
      <div className="flex items-center gap-0.5">
        {fontSizes.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => onFontSizeChange(value)}
            className={`flex items-center justify-center w-7 h-7 rounded-md text-xs font-semibold transition-colors ${
              fontSize === value
                ? "bg-toolbar-active text-toolbar-active-foreground"
                : "text-toolbar-foreground hover:text-toolbar-active-foreground hover:bg-toolbar-active/20"
            }`}
            title={`Font size: ${label}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="w-px h-6 bg-toolbar-foreground/20 mx-1" />

      {/* Background color */}
      <div className="flex items-center gap-1">
        <Paintbrush className="w-3.5 h-3.5 text-toolbar-foreground mr-0.5" />
        {bgColors.map((c) => (
          <button
            key={c}
            onClick={() => onBgColorChange(c)}
            className={`w-4 h-4 rounded border transition-transform ${
              bgColor === c ? "border-toolbar-active-foreground scale-125" : "border-toolbar-foreground/30"
            }`}
            style={{ backgroundColor: c }}
            title="Canvas background"
          />
        ))}
      </div>
    </div>
  );
}
