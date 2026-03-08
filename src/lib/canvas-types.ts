export type Tool = "select" | "pen" | "line" | "rectangle" | "ellipse" | "text" | "eraser";

export interface Point {
  x: number;
  y: number;
}

export interface BaseElement {
  id: string;
  type: string;
  x: number;
  y: number;
  strokeColor: string;
  strokeWidth: number;
  selected?: boolean;
}

export interface PenElement extends BaseElement {
  type: "pen";
  points: Point[];
}

export interface LineElement extends BaseElement {
  type: "line";
  endX: number;
  endY: number;
}

export interface RectangleElement extends BaseElement {
  type: "rectangle";
  width: number;
  height: number;
  fillColor: string;
}

export interface EllipseElement extends BaseElement {
  type: "ellipse";
  radiusX: number;
  radiusY: number;
  fillColor: string;
}

export interface TextSpan {
  text: string;
  bold?: boolean;
  italic?: boolean;
  color?: string;
}

export interface TextElement extends BaseElement {
  type: "text";
  text: string;
  spans?: TextSpan[];
  fontSize: number;
  fontStyle?: "normal" | "italic";
  fontWeight?: "normal" | "bold";
  maxWidth?: number;
}

export type CanvasElement = PenElement | LineElement | RectangleElement | EllipseElement | TextElement;

export type FontSize = "small" | "medium" | "large";

export const fontSizeMap: Record<FontSize, number> = {
  small: 16,
  medium: 24,
  large: 36,
};

export interface CanvasDocument {
  id: string;
  name: string;
  elements: CanvasElement[];
  createdAt: number;
  updatedAt: number;
  thumbnail?: string;
  bgColor?: string;
}
