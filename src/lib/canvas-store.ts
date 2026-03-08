import { CanvasDocument, CanvasElement } from "./canvas-types";

const STORAGE_KEY = "drawboard_documents";

export function getAllDocuments(): CanvasDocument[] {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function getDocument(id: string): CanvasDocument | null {
  return getAllDocuments().find((d) => d.id === id) || null;
}

export function saveDocument(doc: CanvasDocument): void {
  const docs = getAllDocuments();
  const idx = docs.findIndex((d) => d.id === doc.id);
  if (idx >= 0) {
    docs[idx] = { ...doc, updatedAt: Date.now() };
  } else {
    docs.push(doc);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
}

export function deleteDocument(id: string): void {
  const docs = getAllDocuments().filter((d) => d.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
}

export function createNewDocument(name: string): CanvasDocument {
  return {
    id: crypto.randomUUID(),
    name,
    elements: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function generateId(): string {
  return crypto.randomUUID();
}
