"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Edit,
  Trash2,
  Pin,
  StickyNote,
  Loader2,
} from "lucide-react";
import { SupplierNote } from "@/lib/suppliers/types";
import {
  createSupplierNote,
  updateSupplierNote,
  deleteSupplierNote,
} from "@/lib/suppliers/service";

interface SupplierNotesProps {
  supplierId: string;
  notes: SupplierNote[];
}

export function SupplierNotes({ supplierId, notes }: SupplierNotesProps) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<SupplierNote | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const handleOpenForm = (note?: SupplierNote) => {
    if (note) {
      setEditingNote(note);
      setTitle(note.title || "");
      setContent(note.content);
    } else {
      setEditingNote(null);
      setTitle("");
      setContent("");
    }
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditingNote(null);
  };

  const handleSubmit = async () => {
    if (!content.trim()) return;

    setIsLoading(true);
    try {
      if (editingNote) {
        await updateSupplierNote(editingNote.id, {
          title: title || undefined,
          content,
        });
      } else {
        await createSupplierNote({
          supplier_id: supplierId,
          title: title || undefined,
          content,
        });
      }
      handleCloseForm();
      router.refresh();
    } catch (error) {
      console.error("Error saving note:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить заметку?")) return;

    const success = await deleteSupplierNote(id);
    if (success) {
      router.refresh();
    }
  };

  const handleTogglePin = async (note: SupplierNote) => {
    await updateSupplierNote(note.id, { is_pinned: !note.is_pinned });
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Заметки</h3>
        <Button size="sm" onClick={() => handleOpenForm()}>
          <Plus className="h-4 w-4 mr-1" />
          Добавить
        </Button>
      </div>

      {notes.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <StickyNote className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Нет заметок</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div
              key={note.id}
              className={`p-3 border rounded-lg ${
                note.is_pinned ? "border-yellow-300 bg-yellow-50" : ""
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {note.title && (
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{note.title}</span>
                      {note.is_pinned && (
                        <Badge variant="secondary" className="text-xs">
                          <Pin className="h-3 w-3 mr-1" />
                          Закреплено
                        </Badge>
                      )}
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(note.created_at).toLocaleDateString("ru-RU", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleTogglePin(note)}
                    className={note.is_pinned ? "text-yellow-600" : ""}
                  >
                    <Pin className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenForm(note)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(note.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Форма */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingNote ? "Редактировать заметку" : "Новая заметка"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Заголовок (необязательно)</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Заголовок заметки"
              />
            </div>
            <div className="space-y-2">
              <Label>Текст *</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Текст заметки..."
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseForm}>
              Отмена
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading || !content.trim()}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingNote ? "Сохранить" : "Добавить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
