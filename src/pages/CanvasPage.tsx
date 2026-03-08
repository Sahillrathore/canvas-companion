import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Download } from "lucide-react";
import { getDocument, saveDocument } from "@/lib/canvas-store";
import { CanvasDocument, CanvasElement, Tool, FontSize } from "@/lib/canvas-types";
import { CanvasBoard } from "@/components/canvas/CanvasBoard";
import { Toolbar } from "@/components/canvas/Toolbar";
import { useHistory } from "@/hooks/use-history";

const CanvasPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<CanvasDocument | null>(null);
  const [activeTool, setActiveTool] = useState<Tool>("pen");
  const [strokeColor, setStrokeColor] = useState("#1e293b");
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [fontBold, setFontBold] = useState(false);
  const [fontItalic, setFontItalic] = useState(false);
  const [fontSize, setFontSize] = useState<FontSize>("medium");
  const [bgColor, setBgColor] = useState("#ffffff");

  useEffect(() => {
    if (!id) return;
    const loaded = getDocument(id);
    if (!loaded) {
      navigate("/");
      return;
    }
    setDoc(loaded);
    if (loaded.bgColor) setBgColor(loaded.bgColor);
  }, [id, navigate]);

  const handleElementsChange = useCallback(
    (elements: CanvasElement[]) => {
      if (!doc) return;
      const updated = { ...doc, elements, updatedAt: Date.now() };
      setDoc(updated);
      saveDocument(updated);
    },
    [doc]
  );

  const { pushHistory, undo, redo, canUndo, canRedo } = useHistory(
    doc?.elements ?? [],
    handleElementsChange
  );

  const handleBgColorChange = (c: string) => {
    setBgColor(c);
    if (doc) {
      const updated = { ...doc, bgColor: c, updatedAt: Date.now() };
      setDoc(updated);
      saveDocument(updated);
    }
  };

  const handleExport = () => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `${doc?.name || "canvas"}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  if (!doc) return null;

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden" style={{ backgroundColor: bgColor }}>
      {/* Top bar */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        <button
          onClick={() => navigate("/")}
          className="flex items-center justify-center w-9 h-9 rounded-lg bg-toolbar text-toolbar-foreground hover:text-toolbar-active-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="px-3 py-1.5 rounded-lg bg-toolbar text-toolbar-foreground text-sm font-medium">
          {doc.name}
        </div>
      </div>

      {/* Export button */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-toolbar text-toolbar-foreground hover:text-toolbar-active-foreground text-sm transition-colors"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      {/* Toolbar */}
      <Toolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        strokeColor={strokeColor}
        onStrokeColorChange={setStrokeColor}
        strokeWidth={strokeWidth}
        onStrokeWidthChange={setStrokeWidth}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        fontBold={fontBold}
        onFontBoldChange={setFontBold}
        fontItalic={fontItalic}
        onFontItalicChange={setFontItalic}
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        bgColor={bgColor}
        onBgColorChange={handleBgColorChange}
      />

      {/* Canvas */}
      <CanvasBoard
        elements={doc.elements}
        onElementsChange={handleElementsChange}
        activeTool={activeTool}
        strokeColor={strokeColor}
        strokeWidth={strokeWidth}
        onToolChange={setActiveTool}
        onUndo={undo}
        onRedo={redo}
        pushHistory={pushHistory}
        fontBold={fontBold}
        fontItalic={fontItalic}
        fontSize={fontSize}
        bgColor={bgColor}
      />
    </div>
  );
};

export default CanvasPage;
