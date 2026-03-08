import { Tool } from "@/lib/canvas-types";
import {
  MousePointer2,
  Pencil,
  Minus,
  Square,
  Circle,
  Type,
  Eraser,
} from "lucide-react";

interface ToolbarProps {
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
  strokeColor: string;
  onStrokeColorChange: (color: string) => void;
  strokeWidth: number;
  onStrokeWidthChange: (width: number) => void;
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

export function Toolbar({
  activeTool,
  onToolChange,
  strokeColor,
  onStrokeColorChange,
  strokeWidth,
  onStrokeWidthChange,
}: ToolbarProps) {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 rounded-xl bg-toolbar px-2 py-1.5 shadow-lg">
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
    </div>
  );
}
