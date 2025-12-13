"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ThumbsUp, ThumbsDown, Lightbulb, MessageSquare } from "lucide-react";

interface RetrospectiveModalProps {
  sprintId: string;
  sprintName: string;
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    went_well: string;
    to_improve: string;
    action_items: string;
    notes: string;
  }) => void;
  initialData?: {
    went_well?: string;
    to_improve?: string;
    action_items?: string;
    notes?: string;
  };
}

export function RetrospectiveModal({
  sprintName,
  open,
  onClose,
  onSave,
  initialData,
}: RetrospectiveModalProps) {
  const [wentWell, setWentWell] = useState(initialData?.went_well || "");
  const [toImprove, setToImprove] = useState(initialData?.to_improve || "");
  const [actionItems, setActionItems] = useState(initialData?.action_items || "");
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        went_well: wentWell.trim(),
        to_improve: toImprove.trim(),
        action_items: actionItems.trim(),
        notes: notes.trim(),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ретроспектива: {sprintName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* What went well */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-green-600">
              <ThumbsUp className="h-4 w-4" />
              Что прошло хорошо?
            </Label>
            <Textarea
              value={wentWell}
              onChange={(e) => setWentWell(e.target.value)}
              placeholder="Опишите успехи спринта, что удалось хорошо..."
              rows={4}
              className="border-green-200 focus:border-green-400"
            />
          </div>

          {/* What to improve */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-orange-600">
              <ThumbsDown className="h-4 w-4" />
              Что можно улучшить?
            </Label>
            <Textarea
              value={toImprove}
              onChange={(e) => setToImprove(e.target.value)}
              placeholder="Опишите проблемы и области для улучшения..."
              rows={4}
              className="border-orange-200 focus:border-orange-400"
            />
          </div>

          {/* Action items */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-blue-600">
              <Lightbulb className="h-4 w-4" />
              Действия на следующий спринт
            </Label>
            <Textarea
              value={actionItems}
              onChange={(e) => setActionItems(e.target.value)}
              placeholder="Конкретные шаги для улучшения (по одному на строку)..."
              rows={4}
              className="border-blue-200 focus:border-blue-400"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
              Дополнительные заметки
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Любые другие мысли или комментарии..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Сохранение..." : "Сохранить"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
