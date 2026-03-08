import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, FileEdit } from "lucide-react";
import { getAllDocuments, deleteDocument, createNewDocument, saveDocument } from "@/lib/canvas-store";
import { CanvasDocument } from "@/lib/canvas-types";
import { format } from "date-fns";

const Dashboard = () => {
  const [documents, setDocuments] = useState<CanvasDocument[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    setDocuments(getAllDocuments().sort((a, b) => b.updatedAt - a.updatedAt));
  }, []);

  const handleCreate = () => {
    const doc = createNewDocument(`Untitled ${documents.length + 1}`);
    saveDocument(doc);
    navigate(`/canvas/${doc.id}`);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteDocument(id);
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <FileEdit className="w-4 h-4 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">DrawBoard</h1>
          </div>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            New Canvas
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <h2 className="text-lg font-semibold text-foreground mb-6">Recent Canvases</h2>

        {documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <FileEdit className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-4">No canvases yet. Create your first one!</p>
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              Create Canvas
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* New canvas card */}
            <button
              onClick={handleCreate}
              className="group flex flex-col items-center justify-center h-48 rounded-xl border-2 border-dashed border-border hover:border-primary/50 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-muted group-hover:bg-primary/10 flex items-center justify-center mb-2 transition-colors">
                <Plus className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
              </div>
              <span className="text-sm text-muted-foreground group-hover:text-foreground">New Canvas</span>
            </button>

            {documents.map((doc) => (
              <div
                key={doc.id}
                onClick={() => navigate(`/canvas/${doc.id}`)}
                className="group relative flex flex-col h-48 rounded-xl border bg-card hover:shadow-md transition-all cursor-pointer overflow-hidden"
              >
                {/* Preview area */}
                <div className="flex-1 bg-muted/30 flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">
                    {doc.elements.length} element{doc.elements.length !== 1 ? "s" : ""}
                  </span>
                </div>
                {/* Info */}
                <div className="px-3 py-2.5 border-t">
                  <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(doc.updatedAt, "MMM d, yyyy")}
                  </p>
                </div>
                {/* Delete button */}
                <button
                  onClick={(e) => handleDelete(e, doc.id)}
                  className="absolute top-2 right-2 w-7 h-7 rounded-md bg-card/80 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
