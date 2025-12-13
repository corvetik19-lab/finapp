"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Settings } from "lucide-react";
import { KanbanBoardView } from "@/components/team/kanban/KanbanBoardView";
import { CreateColumnModal } from "@/components/team/kanban/CreateColumnModal";
import { CreateCardModal } from "@/components/team/kanban/CreateCardModal";
import { BoardSettingsModal } from "@/components/team/kanban/BoardSettingsModal";
import type { KanbanBoard, KanbanColumn, KanbanCard } from "@/lib/team/types";

interface BoardData extends KanbanBoard {
  columns: (KanbanColumn & { cards: KanbanCard[] })[];
}

interface Tender {
  id: string;
  customer: string;
  number?: string;
}

export default function KanbanBoardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const boardId = params.boardId as string;

  const [board, setBoard] = useState<BoardData | null>(null);
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateColumn, setShowCreateColumn] = useState(false);
  const [showCreateCard, setShowCreateCard] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const fetchBoard = useCallback(async () => {
    try {
      const res = await fetch(`/api/team/boards/${boardId}`);
      if (!res.ok) throw new Error("Failed to fetch board");
      const data = await res.json();
      setBoard(data);
    } catch (error) {
      console.error("Error fetching board:", error);
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  const fetchTenders = useCallback(async () => {
    try {
      const res = await fetch("/api/tenders?limit=100");
      if (res.ok) {
        const data = await res.json();
        setTenders(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching tenders:", error);
    }
  }, []);

  useEffect(() => {
    fetchBoard();
    fetchTenders();
  }, [fetchBoard, fetchTenders]);

  const handleCreateColumn = async (name: string, color: string) => {
    try {
      const res = await fetch(`/api/team/boards/${boardId}/columns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color }),
      });
      if (!res.ok) throw new Error("Failed to create column");
      await fetchBoard();
      setShowCreateColumn(false);
    } catch (error) {
      console.error("Error creating column:", error);
    }
  };

  const handleCreateCard = async (columnId: string, data: Partial<KanbanCard>) => {
    try {
      const res = await fetch(`/api/team/boards/${boardId}/cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, column_id: columnId }),
      });
      if (!res.ok) throw new Error("Failed to create card");
      await fetchBoard();
      setShowCreateCard(null);
    } catch (error) {
      console.error("Error creating card:", error);
    }
  };

  const handleMoveCard = async (cardId: string, toColumnId: string, newPosition: number) => {
    try {
      const res = await fetch(`/api/team/boards/${boardId}/cards/${cardId}/move`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ column_id: toColumnId, position: newPosition }),
      });
      if (!res.ok) throw new Error("Failed to move card");
      await fetchBoard();
    } catch (error) {
      console.error("Error moving card:", error);
    }
  };

  const handleReorderColumns = async (columnId: string, newPosition: number) => {
    try {
      const res = await fetch(`/api/team/boards/${boardId}/columns/${columnId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position: newPosition }),
      });
      if (!res.ok) throw new Error("Failed to reorder column");
      await fetchBoard();
    } catch (error) {
      console.error("Error reordering column:", error);
    }
  };

  const handleDeleteColumn = async (columnId: string) => {
    if (!confirm("Удалить колонку и все карточки в ней?")) return;
    try {
      const res = await fetch(`/api/team/boards/${boardId}/columns/${columnId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete column");
      await fetchBoard();
    } catch (error) {
      console.error("Error deleting column:", error);
    }
  };

  const handleUpdateColumn = async (columnId: string, data: Partial<KanbanColumn>) => {
    try {
      const res = await fetch(`/api/team/boards/${boardId}/columns/${columnId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update column");
      await fetchBoard();
    } catch (error) {
      console.error("Error updating column:", error);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm("Удалить карточку?")) return;
    try {
      const res = await fetch(`/api/team/boards/${boardId}/cards/${cardId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete card");
      await fetchBoard();
    } catch (error) {
      console.error("Error deleting card:", error);
    }
  };

  const handleUpdateCard = async (cardId: string, data: Partial<KanbanCard>) => {
    try {
      const res = await fetch(`/api/team/boards/${boardId}/cards/${cardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update card");
      await fetchBoard();
    } catch (error) {
      console.error("Error updating card:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <p className="text-muted-foreground">Доска не найдена</p>
        <Button variant="outline" onClick={() => router.push("/tenders/team/boards")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Назад к доскам
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/tenders/team/boards")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">{board.name}</h1>
            {board.description && (
              <p className="text-sm text-muted-foreground">{board.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowCreateColumn(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Колонка
          </Button>
          <Button variant="outline" size="icon" onClick={() => setShowSettings(true)}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-auto p-4" style={{ backgroundColor: board.background_color || "#f8fafc" }}>
        <KanbanBoardView
          columns={board.columns}
          onMoveCard={handleMoveCard}
          onReorderColumns={handleReorderColumns}
          onAddCard={(columnId: string) => setShowCreateCard(columnId)}
          onDeleteColumn={handleDeleteColumn}
          onUpdateColumn={handleUpdateColumn}
          onDeleteCard={handleDeleteCard}
          onUpdateCard={handleUpdateCard}
        />
      </div>

      {/* Modals */}
      {showCreateColumn && (
        <CreateColumnModal
          onClose={() => setShowCreateColumn(false)}
          onCreate={handleCreateColumn}
        />
      )}

      {showCreateCard && (
        <CreateCardModal
          columnId={showCreateCard}
          onClose={() => setShowCreateCard(null)}
          onCreate={(data: Partial<KanbanCard>) => handleCreateCard(showCreateCard, data)}
          tenders={tenders}
        />
      )}

      {showSettings && (
        <BoardSettingsModal
          board={board}
          onClose={() => setShowSettings(false)}
          onUpdate={async (data: Partial<KanbanBoard>) => {
            try {
              const res = await fetch(`/api/team/boards/${boardId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
              });
              if (!res.ok) throw new Error("Failed to update board");
              await fetchBoard();
              setShowSettings(false);
            } catch (error) {
              console.error("Error updating board:", error);
            }
          }}
        />
      )}
    </div>
  );
}
