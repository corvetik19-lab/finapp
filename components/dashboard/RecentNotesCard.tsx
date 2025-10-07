"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import styles from "@/components/dashboard/Dashboard.module.css";
import type { NoteRecord } from "@/lib/notes/service";
import { noteFormSchema } from "@/lib/notes/schema";
import type { NoteFormInput } from "@/lib/notes/schema";
import {
  createNoteAction,
  updateNoteAction,
  deleteNoteAction,
} from "@/app/(protected)/notes/actions";

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
  const toggleIcon = isFormOpen && !isEditing ? "close" : "add";
  const toggleLabel = isFormOpen && !isEditing ? "Закрыть форму" : "Новая заметка";

  return (
    <section className={`${styles.chartCard} ${styles.notesCard}`}>
      <header className={styles.chartHeader}>
        <div>
          <div className={styles.chartTitle}>{cardTitle}</div>
          <div className={styles.chartSubtitle}>{cardSubtitle}</div>
        </div>
        <div className={styles.chartActions}>
          {canShowOpenAllButton && (
            <button type="button" className={styles.chartActionButton} onClick={handleOpenAll}>
              Все заметки
            </button>
          )}
          <button
            type="button"
            className={styles.chartIconButton}
            onClick={handleToggleCreate}
            aria-label={toggleLabel}
            disabled={isPending}
          >
            <span className="material-icons" aria-hidden>
              {toggleIcon}
            </span>
          </button>
        </div>
      </header>

      {cardError && <div className={`${styles.notesServerError} ${styles.notesCardError}`}>{cardError}</div>}

      {isFormOpen && (
        <form className={styles.notesForm} onSubmit={handleSubmit} noValidate>
          <div className={styles.notesFormTitle}>{formTitle}</div>
          <label className={styles.notesLabel}>
            Заголовок
            <input
              type="text"
              className={styles.notesInput}
              placeholder="Без названия"
              {...form.register("title")}
              disabled={isPending}
            />
            {form.formState.errors.title && (
              <span className={styles.notesError}>{form.formState.errors.title.message}</span>
            )}
          </label>
          <label className={styles.notesLabel}>
            Текст заметки
            <textarea
              className={styles.notesTextarea}
              rows={4}
              placeholder="Введите заметку"
              {...form.register("content")}
              disabled={isPending}
            />
            {form.formState.errors.content && (
              <span className={styles.notesError}>{form.formState.errors.content.message}</span>
            )}
          </label>
          {formError && <div className={styles.notesServerError}>{formError}</div>}
          <div className={styles.notesActions}>
            <button type="button" className={styles.notesSecondaryButton} onClick={closeForm} disabled={isPending}>
              Отмена
            </button>
            <button type="submit" className={styles.notesPrimaryButton} disabled={isPending}>
              {isPending ? "Сохраняем…" : isEditing ? "Сохранить изменения" : "Сохранить"}
            </button>
          </div>
        </form>
      )}

      {hasNotes ? (
        <div className={styles.notesList}>
          {notes.map((note) => (
            <article key={note.id} className={styles.noteItem}>
              <header className={styles.noteHeader}>
                <div className={styles.noteHeaderMain}>
                  <span className={styles.noteTitle}>{note.title || "Без названия"}</span>
                  <span className={styles.noteMeta}>{formatDate(note.updated_at)}</span>
                </div>
                <div className={styles.noteActions}>
                  <button
                    type="button"
                    className={styles.noteActionButton}
                    onClick={() => handleEdit(note)}
                    disabled={isPending}
                    aria-label="Редактировать заметку"
                  >
                    <span className="material-icons" aria-hidden>
                      edit
                    </span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.noteActionButton} ${styles.noteDeleteButton}`}
                    onClick={() => handleDelete(note)}
                    disabled={isPending}
                    aria-label="Удалить заметку"
                  >
                    <span className="material-icons" aria-hidden>
                      delete
                    </span>
                  </button>
                </div>
              </header>
              {note.content && <p className={styles.noteContent}>{note.content}</p>}
            </article>
          ))}
        </div>
      ) : (
        <div className={styles.notesEmpty}>
          Нет заметок. {isFormOpen ? "Заполните форму и сохраните первую запись." : "Создайте первую, чтобы сохранить важные идеи."}
        </div>
      )}
    </section>
  );
}
