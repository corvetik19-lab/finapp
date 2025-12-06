"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { NoteRecord } from "@/lib/notes/service";
import { noteFormSchema } from "@/lib/notes/schema";
import type { NoteFormInput } from "@/lib/notes/schema";
import { createNoteAction, updateNoteAction, deleteNoteAction } from "@/app/(protected)/notes/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StickyNote, Plus, X, Pencil, Trash2, Loader2 } from "lucide-react";

export type RecentNotesCardProps = {
  notes: NoteRecord[];
  onOpenAll?: () => void;
  title?: string;
  subtitle?: string;
  showOpenAllButton?: boolean;
};

const formatDate = (iso: string) => {
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch (error) {
    console.error("formatDate", error, iso);
    return iso;
  }
};

const INITIAL_VALUES: NoteFormInput = {
  title: "",
  content: "",
};

export default function RecentNotesCard({
  notes,
  onOpenAll,
  title,
  subtitle,
  showOpenAllButton,
}: RecentNotesCardProps) {
  const router = useRouter();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<NoteRecord | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [cardError, setCardError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<NoteFormInput>({
    resolver: zodResolver(noteFormSchema),
    defaultValues: INITIAL_VALUES,
  });

  const cardTitle = title ?? "Последние заметки";
  const cardSubtitle = subtitle ?? "Быстрый доступ к недавним записям";
  const canShowOpenAllButton = showOpenAllButton ?? true;

  const resetForm = (values?: NoteFormInput) => {
    form.reset(values ?? INITIAL_VALUES);
    setFormError(null);
  };

  const openCreateForm = () => {
    setEditingNote(null);
    resetForm();
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingNote(null);
    resetForm();
  };

  const handleOpenAll = () => {
    if (onOpenAll) {
      onOpenAll();
      return;
    }
    router.push("/notes");
  };

  const handleToggleCreate = () => {
    if (isFormOpen && !editingNote) {
      closeForm();
    } else {
      openCreateForm();
    }
  };

  const handleEdit = (note: NoteRecord) => {
    setCardError(null);
    setEditingNote(note);
    resetForm({
      title: note.title ?? "",
      content: note.content ?? "",
    });
    setIsFormOpen(true);
  };

  const handleSubmit = form.handleSubmit((values) => {
    setFormError(null);
    setCardError(null);
    startTransition(async () => {
      const payload: NoteFormInput = {
        title: values.title?.trim() ? values.title.trim() : undefined,
        content: values.content.trim(),
      };

      const result = editingNote
        ? await updateNoteAction({ id: editingNote.id, ...payload })
        : await createNoteAction(payload);

      if (!result.success) {
        setFormError(result.error);
        return;
      }

      closeForm();
      router.refresh();
    });
  });

  const handleDelete = (note: NoteRecord) => {
    if (!window.confirm("Удалить заметку?")) {
      return;
    }

    setCardError(null);
    startTransition(async () => {
      const result = await deleteNoteAction(note.id);
      if (!result.success) {
        setCardError(result.error);
        return;
      }

      if (editingNote?.id === note.id) {
        closeForm();
      }

      router.refresh();
    });
  };

  const hasNotes = notes.length > 0;
  const isEditing = Boolean(editingNote);
  const formTitle = isEditing ? "Редактирование заметки" : "Новая заметка";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <StickyNote className="h-4 w-4" />
              {cardTitle}
            </CardTitle>
            <p className="text-xs text-muted-foreground">{cardSubtitle}</p>
          </div>
          <div className="flex items-center gap-1">
            {canShowOpenAllButton && (
              <Button variant="ghost" size="sm" onClick={handleOpenAll}>Все заметки</Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleToggleCreate} disabled={isPending}>
              {isFormOpen && !isEditing ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {cardError && <div className="text-sm text-destructive">{cardError}</div>}

        {isFormOpen && (
          <form onSubmit={handleSubmit} noValidate className="space-y-3 p-3 rounded-lg border bg-muted/50">
            <div className="font-medium text-sm">{formTitle}</div>
            <div className="space-y-2">
              <Label htmlFor="note-title">Заголовок</Label>
              <Input id="note-title" placeholder="Без названия" {...form.register("title")} disabled={isPending} />
              {form.formState.errors.title && <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="note-content">Текст заметки</Label>
              <Textarea id="note-content" rows={4} placeholder="Введите заметку" {...form.register("content")} disabled={isPending} />
              {form.formState.errors.content && <p className="text-xs text-destructive">{form.formState.errors.content.message}</p>}
            </div>
            {formError && <div className="text-sm text-destructive">{formError}</div>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={closeForm} disabled={isPending}>Отмена</Button>
              <Button type="submit" size="sm" disabled={isPending}>
                {isPending ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Сохраняем…</> : isEditing ? "Сохранить изменения" : "Сохранить"}
              </Button>
            </div>
          </form>
        )}

        {hasNotes ? (
          <div className="space-y-2">
            {notes.map((note) => (
              <article key={note.id} className="p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{note.title || "Без названия"}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(note.updated_at)}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(note)} disabled={isPending}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(note)} disabled={isPending}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                {note.content && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{note.content}</p>}
              </article>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            Нет заметок. {isFormOpen ? "Заполните форму и сохраните первую запись." : "Создайте первую, чтобы сохранить важные идеи."}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
