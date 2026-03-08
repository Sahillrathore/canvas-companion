import { useCallback, useRef } from "react";
import { CanvasElement } from "@/lib/canvas-types";

const MAX_HISTORY = 50;

export function useHistory(
  elements: CanvasElement[],
  onElementsChange: (elements: CanvasElement[]) => void
) {
  const undoStack = useRef<CanvasElement[][]>([]);
  const redoStack = useRef<CanvasElement[][]>([]);

  const pushHistory = useCallback(() => {
    undoStack.current.push([...elements]);
    if (undoStack.current.length > MAX_HISTORY) undoStack.current.shift();
    redoStack.current = [];
  }, [elements]);

  const undo = useCallback(() => {
    if (undoStack.current.length === 0) return;
    const prev = undoStack.current.pop()!;
    redoStack.current.push([...elements]);
    onElementsChange(prev);
  }, [elements, onElementsChange]);

  const redo = useCallback(() => {
    if (redoStack.current.length === 0) return;
    const next = redoStack.current.pop()!;
    undoStack.current.push([...elements]);
    onElementsChange(next);
  }, [elements, onElementsChange]);

  return { pushHistory, undo, redo, canUndo: undoStack.current.length > 0, canRedo: redoStack.current.length > 0 };
}
