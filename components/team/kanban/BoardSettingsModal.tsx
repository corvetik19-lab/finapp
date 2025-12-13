"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { KanbanBoard } from "@/lib/team/types";

interface BoardSettingsModalProps {
  board: KanbanBoard;
  onClose: () => void;
  onUpdate: (data: Partial<KanbanBoard>) => void;
}

const presetColors = [
  "#f8fafc", // slate-50
  "#fef3c7", // amber-100
  "#dcfce7", // green-100
  "#dbeafe", // blue-100
  "#fce7f3", // pink-100
  "#ede9fe", // violet-100
  "#f3f4f6", // gray-100
  "#e0e7ff", // indigo-100
];

export function BoardSettingsModal({ board, onClose, onUpdate }: BoardSettingsModalProps) {
  const [name, setName] = useState(board.name);
  const [description, setDescription] = useState(board.description || "");
  const [backgroundColor, setBackgroundColor] = useState(board.background_color || "#f8fafc");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      await onUpdate({
        name: name.trim(),
        description: description.trim() || null,
        background_color: backgroundColor,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Настройки доски</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Название</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Название доски"
            />
          </div>
          <div>
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Описание доски..."
              rows={3}
            />
          </div>
          <div>
            <Label>Цвет фона</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {presetColors.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`w-10 h-10 rounded border-2 transition-transform ${
                    backgroundColor === c
                      ? "border-primary scale-110"
                      : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                  onClick={() => setBackgroundColor(c)}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" disabled={!name.trim() || loading}>
              {loading ? "Сохранение..." : "Сохранить"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
