"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import styles from "./NotesPage.module.css";
import type { NoteLabel, NoteListItem } from "@/lib/notes/service";
import {
  createNoteAction,
  updateNoteAction,
  deleteNoteAction,
  createNoteLabelAction,
  deleteNoteLabelAction,
} from "@/app/(protected)/personal/notes/actions";
import type { NoteFormInput } from "@/lib/notes/schema";
import { fetchTransactionsForSelectAction } from "@/app/(protected)/finance/transactions/actions";
import { fetchPlansForSelectAction } from "@/app/(protected)/finance/plans/actions";
import type { TransactionSelectItem } from "@/lib/transactions/service";
import type { PlanSelectItem } from "@/lib/plans/service";

const PAGE_SIZE_FALLBACK = 10;

type NotesPageClientProps = {
  notes: NoteListItem[];
  labels: NoteLabel[];
  totalCount: number;
  pageSize?: number;
  currentPage: number;
  initialQuery: string;
  initialLabelIds: string[];
};

type EditorMode = "create" | "edit";

type EntityKind = "transaction" | "plan";

type NoteEditorRelation = {
  entityType: EntityKind;
  entityId: string;
  label: string;
};

type EditorState = {
  title: string;
  content: string;
  labelIds: string[];
  relations: NoteEditorRelation[];
};

const defaultEditorState: EditorState = {
  title: "",
  content: "",
  labelIds: [],
  relations: [],
};

export default function NotesPageClient({
  notes,
  labels,
  totalCount,
  pageSize = PAGE_SIZE_FALLBACK,
  currentPage,
  initialQuery,
  initialLabelIds,
}: NotesPageClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [searchValue, setSearchValue] = useState(initialQuery);
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>(initialLabelIds);
  const [cardError, setCardError] = useState<string | null>(null);

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>("create");
  const [editorNoteId, setEditorNoteId] = useState<string | null>(null);
  const [editorState, setEditorState] = useState<EditorState>(defaultEditorState);
  const [editorError, setEditorError] = useState<string | null>(null);

  const [labelName, setLabelName] = useState("");
  const [labelColor, setLabelColor] = useState("#2563eb");
  const [labelError, setLabelError] = useState<string | null>(null);

  const [relationsLoading, setRelationsLoading] = useState(false);
  const [relationsError, setRelationsError] = useState<string | null>(null);
  const [relationSearchQueries, setRelationSearchQueries] = useState<string[]>([]);

  const relationSearchTimers = useRef<Record<number, number>>({});

  const [transactionOptionsMap, setTransactionOptionsMap] = useState<Record<string, TransactionSelectItem>>({});
  const [planOptionsMap, setPlanOptionsMap] = useState<Record<string, PlanSelectItem>>({});

  const transactionOptions = useMemo(() => Object.values(transactionOptionsMap), [transactionOptionsMap]);
  const planOptions = useMemo(() => Object.values(planOptionsMap), [planOptionsMap]);

  const totalPages = useMemo(() => {
    if (pageSize <= 0) return 1;
    return Math.max(1, Math.ceil(totalCount / pageSize));
  }, [pageSize, totalCount]);

  const resolveRelationLabel = useCallback(
    (entityType: EntityKind, entityId: string) => {
      if (!entityId) return "";
      if (entityType === "transaction") {
        return transactionOptionsMap[entityId]?.label ?? entityId;
      }
      return planOptionsMap[entityId]?.label ?? entityId;
    },
    [planOptionsMap, transactionOptionsMap]
  );

  const mergeTransactionOptions = useCallback((items: TransactionSelectItem[]) => {
    if (!items || items.length === 0) return;
    setTransactionOptionsMap((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const item of items) {
        const existing = next[item.id];
        if (!existing || existing.label !== item.label) {
          next[item.id] = item;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, []);

  const mergePlanOptions = useCallback((items: PlanSelectItem[]) => {
    if (!items || items.length === 0) return;
    setPlanOptionsMap((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const item of items) {
        const existing = next[item.id];
        if (!existing || existing.label !== item.label) {
          next[item.id] = item;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, []);

  const ensureOptionsForRelations = useCallback(
    async (relationList: { entityType: EntityKind; entityId: string }[]) => {
      if (!relationList || relationList.length === 0) return;

      const missingTransactionIds = Array.from(
        new Set(
          relationList
            .filter((item) => item.entityType === "transaction")
            .map((item) => item.entityId)
            .filter((id) => id && !(id in transactionOptionsMap))
        )
      );

      const missingPlanIds = Array.from(
        new Set(
          relationList
            .filter((item) => item.entityType === "plan")
            .map((item) => item.entityId)
            .filter((id) => id && !(id in planOptionsMap))
        )
      );

      const tasks: Promise<void>[] = [];

      if (missingTransactionIds.length > 0) {
        tasks.push(
          fetchTransactionsForSelectAction({
            ids: missingTransactionIds,
            limit: missingTransactionIds.length,
          })
            .then(mergeTransactionOptions)
            .catch((error) => {
              console.error("ensureOptionsForRelations:transactions", error);
            })
        );
      }

      if (missingPlanIds.length > 0) {
        tasks.push(
          fetchPlansForSelectAction({
            ids: missingPlanIds,
            limit: missingPlanIds.length,
          })
            .then(mergePlanOptions)
            .catch((error) => {
              console.error("ensureOptionsForRelations:plans", error);
            })
        );
      }

      if (tasks.length > 0) {
        await Promise.allSettled(tasks);
      }
    },
    [mergePlanOptions, mergeTransactionOptions, planOptionsMap, transactionOptionsMap]
  );

  const clearRelationSearchTimers = useCallback(() => {
    Object.values(relationSearchTimers.current).forEach((timerId) => {
      window.clearTimeout(timerId);
    });
    relationSearchTimers.current = {};
  }, []);

  const scheduleRelationSearch = useCallback(
    (index: number, entityType: EntityKind, rawQuery: string) => {
      if (relationSearchTimers.current[index]) {
        window.clearTimeout(relationSearchTimers.current[index]);
        delete relationSearchTimers.current[index];
      }

      const query = rawQuery.trim();
      if (query.length === 0) {
        return;
      }

      relationSearchTimers.current[index] = window.setTimeout(async () => {
        setRelationsError(null);
        setRelationsLoading(true);
        try {
          if (entityType === "transaction") {
            const items = await fetchTransactionsForSelectAction({ search: query, limit: 20 });
            mergeTransactionOptions(items);
          } else {
            const items = await fetchPlansForSelectAction({ search: query, limit: 20 });
            mergePlanOptions(items);
          }
        } catch (error) {
          console.error("scheduleRelationSearch", error);
          setRelationsError("Не удалось выполнить поиск. Попробуйте позже.");
        } finally {
          setRelationsLoading(false);
          if (relationSearchTimers.current[index]) {
            window.clearTimeout(relationSearchTimers.current[index]);
            delete relationSearchTimers.current[index];
          }
        }
      }, 350);
    },
    [mergePlanOptions, mergeTransactionOptions]
  );

  useEffect(() => {
    return () => clearRelationSearchTimers();
  }, [clearRelationSearchTimers]);

  useEffect(() => {
    setEditorState((prev) => {
      let changed = false;
      const nextRelations = prev.relations.map((relation) => {
        const label = resolveRelationLabel(relation.entityType, relation.entityId);
        if (label && label !== relation.label) {
          changed = true;
          return { ...relation, label };
        }
        return relation;
      });
      return changed ? { ...prev, relations: nextRelations } : prev;
    });
  }, [resolveRelationLabel]);

  useEffect(() => {
    const relationList = notes.flatMap((note) =>
      note.relations.map((relation) => ({
        entityType: relation.entity_type as EntityKind,
        entityId: relation.entity_id,
      }))
    );

    if (relationList.length === 0) return;

    ensureOptionsForRelations(relationList).catch((error) => {
      console.error("ensureOptionsForNotes", error);
    });
  }, [ensureOptionsForRelations, notes]);

  useEffect(() => {
    setRelationSearchQueries((prev) => {
      const next = [...prev];
      return editorState.relations.map((relation, index) => {
        const base = resolveRelationLabel(relation.entityType, relation.entityId);
        const current = next[index];
        if (!relation.entityId) {
          return current ?? "";
        }
        if (!current || current === relation.label || current === relation.entityId) {
          return base;
        }
        return current;
      });
    });
  }, [editorState.relations, resolveRelationLabel]);

  useEffect(() => {
    if (!isEditorOpen) return;

    setRelationsError(null);
    setRelationsLoading(true);

    const relationList = editorState.relations
      .filter((relation) => relation.entityId)
      .map((relation) => ({ entityType: relation.entityType, entityId: relation.entityId }));

    const load = async () => {
      try {
        const [transactions, plans] = await Promise.all([
          fetchTransactionsForSelectAction({ limit: 20 }),
          fetchPlansForSelectAction({ limit: 20 }),
        ]);
        mergeTransactionOptions(transactions);
        mergePlanOptions(plans);
        await ensureOptionsForRelations(relationList);
      } catch (error) {
        console.error("loadRelationsOptions", error);
        setRelationsError("Не удалось загрузить связи. Попробуйте позже.");
      } finally {
        setRelationsLoading(false);
      }
    };

    load();

    return () => {
      clearRelationSearchTimers();
    };
  }, [ensureOptionsForRelations, clearRelationSearchTimers, isEditorOpen, editorState.relations, mergeTransactionOptions, mergePlanOptions]);

  const buildSearchParams = (page: number, queryValue: string, labelIds: string[]) => {
    const params = new URLSearchParams();
    if (queryValue.trim().length > 0) {
      params.set("q", queryValue.trim());
    }
    if (labelIds.length > 0) {
      params.set("labels", labelIds.join(","));
    }
    if (page > 1) {
      params.set("page", String(page));
    }
    return params.toString();
  };

  const navigateWithFilters = (page: number) => {
    const query = buildSearchParams(page, searchValue, selectedLabelIds);
    startTransition(() => {
      router.push(query.length > 0 ? `/notes?${query}` : "/notes");
    });
  };

  const handleApplyFilters = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigateWithFilters(1);
  };

  const handleResetFilters = () => {
    setSearchValue("");
    setSelectedLabelIds([]);
    startTransition(() => {
      router.push("/notes");
    });
  };

  const toggleSelectedLabel = (id: string) => {
    setSelectedLabelIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const openCreateEditor = () => {
    setEditorMode("create");
    setEditorNoteId(null);
    setEditorState(defaultEditorState);
    setEditorError(null);
    setRelationsError(null);
    setRelationSearchQueries([]);
    setIsEditorOpen(true);
  };

  const openEditEditor = (note: NoteListItem) => {
    setEditorMode("edit");
    setEditorNoteId(note.id);
    setEditorState({
      title: note.title ?? "",
      content: note.content ?? "",
      labelIds: note.labels.map((label) => label.id),
      relations: note.relations.map((relation) => ({
        entityType: relation.entity_type as EntityKind,
        entityId: relation.entity_id,
        label: relation.entity_id,
      })),
    });
    setRelationSearchQueries(note.relations.map((relation) => relation.entity_id));
    setEditorError(null);
    setIsEditorOpen(true);
  };

  const handleEditorClose = () => {
    setIsEditorOpen(false);
    setEditorNoteId(null);
    setEditorState(defaultEditorState);
    setEditorError(null);
  };

  const handleEditorSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEditorError(null);

    if (editorState.content.trim().length === 0) {
      setEditorError("Введите текст заметки");
      return;
    }

    const relationsPayload = editorState.relations
      .filter((relation) => relation.entityId.trim().length > 0)
      .map((relation) => ({ entityType: relation.entityType, entityId: relation.entityId }));

    const payload: NoteFormInput & {
      labels?: string[];
      relations?: { entityType: EntityKind; entityId: string }[];
    } = {
      title: editorState.title,
      content: editorState.content,
      labels: editorState.labelIds,
      relations: relationsPayload,
    };

    startTransition(async () => {
      const result = editorMode === "edit" && editorNoteId
        ? await updateNoteAction({ id: editorNoteId, ...payload })
        : await createNoteAction(payload);

      if (!result.success) {
        setEditorError(result.error);
        return;
      }

      handleEditorClose();
      router.refresh();
    });
  };

  const handleDeleteNote = (note: NoteListItem) => {
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
      router.refresh();
    });
  };

  const handleCreateLabel = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLabelError(null);

    if (labelName.trim().length === 0) {
      setLabelError("Введите название метки");
      return;
    }

    const formData = new FormData();
    formData.append("name", labelName.trim());
    formData.append("color", labelColor ?? "");

    startTransition(async () => {
      const result = await createNoteLabelAction(formData);
      if (!result.success) {
        setLabelError(result.error);
        return;
      }

      setLabelName("");
      router.refresh();
    });
  };

  const handleDeleteLabel = (id: string) => {
    if (!window.confirm("Удалить метку?")) {
      return;
    }

    setLabelError(null);
    startTransition(async () => {
      const result = await deleteNoteLabelAction(id);
      if (!result.success) {
        setLabelError(result.error);
        return;
      }

      if (selectedLabelIds.includes(id)) {
        setSelectedLabelIds((prev) => prev.filter((item) => item !== id));
      }

      router.refresh();
    });
  };

  const renderLabelCheckbox = (label: NoteLabel) => {
    const checked = selectedLabelIds.includes(label.id);
    const labelStyle = label.color
      ? {
          backgroundColor: `${label.color}1A`,
          borderColor: label.color,
        }
      : undefined;
    return (
      <label key={label.id} className={styles.labelItem} style={labelStyle}>
        <input
          type="checkbox"
          className={styles.labelCheckbox}
          checked={checked}
          onChange={() => toggleSelectedLabel(label.id)}
        />
        <span className={styles.labelName}>
          {label.name}
        </span>
        <button
          type="button"
          className={`${styles.iconButton} ${styles.iconButtonDelete}`}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            handleDeleteLabel(label.id);
          }}
          aria-label={`Удалить метку ${label.name}`}
          disabled={isPending}
        >
          <span className="material-icons" aria-hidden>
            close
          </span>
        </button>
      </label>
    );
  };

  const relationLimit = 3;

  const handleAddRelation = () => {
    if (editorState.relations.length >= relationLimit) {
      setRelationsError(`Можно добавить не более ${relationLimit} связей`);
      return;
    }

    setEditorState((prev) => ({
      ...prev,
      relations: [...prev.relations, { entityType: "transaction", entityId: "", label: "" }],
    }));
    setRelationSearchQueries((prev) => [...prev, ""]);
  };

  const handleRemoveRelation = (index: number) => {
    setEditorState((prev) => ({
      ...prev,
      relations: prev.relations.filter((_, idx) => idx !== index),
    }));

    setRelationSearchQueries((prev) => prev.filter((_, idx) => idx !== index));

    if (relationSearchTimers.current[index]) {
      window.clearTimeout(relationSearchTimers.current[index]);
      delete relationSearchTimers.current[index];
    }
  };

  const handleRelationTypeChange = (index: number, nextType: EntityKind) => {
    setEditorState((prev) => ({
      ...prev,
      relations: prev.relations.map((relation, idx) =>
        idx === index
          ? {
              entityType: nextType,
              entityId: "",
              label: "",
            }
          : relation
      ),
    }));

    setRelationSearchQueries((prev) => {
      const next = [...prev];
      next[index] = "";
      return next;
    });
  };

  const handleRelationEntityChange = (index: number, entityId: string, label: string) => {
    setEditorState((prev) => ({
      ...prev,
      relations: prev.relations.map((relation, idx) =>
        idx === index
          ? {
              ...relation,
              entityId,
              label,
            }
          : relation
      ),
    }));

    setRelationSearchQueries((prev) => {
      const next = [...prev];
      next[index] = label;
      return next;
    });
  };

  const handleRelationSearchChange = (index: number, entityType: EntityKind, value: string) => {
    setRelationSearchQueries((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });

    scheduleRelationSearch(index, entityType, value);
  };

  const renderRelationRow = (relation: NoteEditorRelation, index: number) => {
    const options = relation.entityType === "transaction" ? transactionOptions : planOptions;
    const searchValue = relationSearchQueries[index] ?? "";

    return (
      <div key={`relation-${index}`} className={styles.relationRow}>
        <select
          className={styles.relationTypeSelect}
          value={relation.entityType}
          onChange={(event) => handleRelationTypeChange(index, event.target.value as EntityKind)}
          disabled={isPending || relationsLoading}
        >
          <option value="transaction">Транзакция</option>
          <option value="plan">План</option>
        </select>

        <input
          className={styles.relationSearchInput}
          type="search"
          placeholder={relation.entityType === "transaction" ? "Поиск транзакции" : "Поиск плана"}
          value={searchValue}
          onChange={(event) => handleRelationSearchChange(index, relation.entityType, event.target.value)}
          disabled={isPending}
        />

        <select
          className={styles.relationEntitySelect}
          value={relation.entityId}
          onChange={(event) => {
            const nextId = event.target.value;
            const option = options.find((item) => item.id === nextId);
            handleRelationEntityChange(index, nextId, option?.label ?? nextId);
          }}
          disabled={isPending || relationsLoading}
        >
          <option value="">Не выбрано</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          className={styles.relationRemoveButton}
          onClick={() => handleRemoveRelation(index)}
          disabled={isPending || relationsLoading}
          aria-label="Удалить связь"
        >
          <span className="material-icons" aria-hidden>
            close
          </span>
        </button>
      </div>
    );
  };

  const renderRelationsSection = () => {
    return (
      <div className={styles.modalRelations}>
        <div className={styles.modalRelationsHeader}>
          <span className={styles.modalLabel}>Связи</span>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={handleAddRelation}
            disabled={isPending || relationsLoading || editorState.relations.length >= relationLimit}
          >
            Добавить связь
          </button>
        </div>
        {relationsLoading && <div className={styles.relationsHint}>Загружаем доступные элементы…</div>}
        {!relationsLoading && editorState.relations.length === 0 && (
          <div className={styles.relationsHint}>Пока нет связей. Добавьте транзакцию или план.</div>
        )}
        {editorState.relations.map((relation, index) => renderRelationRow(relation, index))}
        {relationsError && <div className={styles.errorMessage}>{relationsError}</div>}
      </div>
    );
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div>
            <h1 className={styles.pageTitle}>Все заметки</h1>
            <p className={styles.pageSubtitle}>Управляйте заметками, метками и связями с транзакциями и планами</p>
          </div>
          <div className={styles.headerActions}>
            <button type="button" className={styles.secondaryButton} onClick={handleResetFilters} disabled={isPending}>
              Сбросить фильтры
            </button>
            <button type="button" className={styles.primaryButton} onClick={openCreateEditor} disabled={isPending}>
              Новая заметка
            </button>
          </div>
        </div>
        {cardError && <div className={styles.cardError}>{cardError}</div>}
      </div>

      <div className={styles.filters}>
        <form className={styles.searchRow} onSubmit={handleApplyFilters}>
          <input
            className={styles.searchInput}
            type="search"
            placeholder="Поиск по заголовку и тексту"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            disabled={isPending}
          />
          <div className={styles.filterActions}>
            <button type="submit" className={styles.primaryButton} disabled={isPending}>
              Применить
            </button>
            <button type="button" className={styles.secondaryButton} onClick={handleResetFilters} disabled={isPending}>
              Очистить
            </button>
          </div>
        </form>

        <div className={styles.labelsSection}>
          <div className={styles.labelsTitle}>Фильтр по меткам</div>
          <div className={styles.labelsList}>
            {labels.length === 0 && <span className={styles.labelName}>Метки пока не созданы</span>}
            {labels.map((label) => renderLabelCheckbox(label))}
          </div>
          <form className={styles.searchRow} onSubmit={handleCreateLabel}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Название новой метки"
              value={labelName}
              onChange={(event) => setLabelName(event.target.value)}
              disabled={isPending}
            />
            <input
              type="color"
              value={labelColor}
              onChange={(event) => setLabelColor(event.target.value)}
              disabled={isPending}
              style={{ width: 48, height: 36, borderRadius: 10, border: "1px solid rgba(148, 163, 184, 0.45)", padding: 0 }}
              aria-label="Цвет метки"
            />
            <button type="submit" className={styles.secondaryButton} disabled={isPending}>
              Добавить метку
            </button>
          </form>
          {labelError && <div className={styles.errorMessage}>{labelError}</div>}
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Заметка</th>
              <th>Метки</th>
              <th>Связи</th>
              <th>Обновлена</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {notes.map((note) => {
              const snippet = note.content ? note.content.slice(0, 120) + (note.content.length > 120 ? "…" : "") : "";
              return (
                <tr key={note.id}>
                  <td>
                    <div className={styles.titleCell}>{note.title || "Без названия"}</div>
                    {snippet && <div className={styles.snippet}>{snippet}</div>}
                  </td>
                  <td>
                    <div className={styles.noteLabels}>
                      {note.labels.length === 0 && <span className={styles.labelName}>—</span>}
                      {note.labels.map((label) => (
                        <span
                          key={label.id}
                          className={styles.labelBadge}
                          style={label.color ? { backgroundColor: label.color, color: "#ffffff" } : undefined}
                        >
                          {label.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    {note.relations.length > 0 ? (
                      <div className={styles.noteLabels}>
                        {note.relations.map((relation) => {
                          const label = resolveRelationLabel(relation.entity_type as EntityKind, relation.entity_id) ||
                            (relation.entity_type === "transaction" ? "Транзакция" : "План");
                          return (
                            <span key={`${relation.entity_type}-${relation.entity_id}`} className={styles.labelBadge}>
                              {label}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <span className={styles.labelName}>—</span>
                    )}
                  </td>
                  <td>{new Date(note.updated_at ?? note.created_at).toLocaleString("ru-RU")}</td>
                  <td>
                    <div className={styles.noteActions}>
                      <button
                        type="button"
                        className={styles.iconButton}
                        onClick={() => openEditEditor(note)}
                        disabled={isPending}
                        aria-label="Редактировать"
                      >
                        <span className="material-icons" aria-hidden>
                          edit
                        </span>
                      </button>
                      <button
                        type="button"
                        className={`${styles.iconButton} ${styles.iconButtonDelete}`}
                        onClick={() => handleDeleteNote(note)}
                        disabled={isPending}
                        aria-label="Удалить"
                      >
                        <span className="material-icons" aria-hidden>
                          delete
                        </span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {notes.length === 0 && (
              <tr>
                <td colSpan={5} className={styles.emptyState}>
                  Заметок не найдено. Измените фильтры или создайте новую запись.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className={styles.pagination}>
        <div className={styles.paginationInfo}>
          Страница {currentPage} из {totalPages} — всего {totalCount}
        </div>
        <div className={styles.paginationButtons}>
          <button
            type="button"
            className={styles.paginationButton}
            onClick={() => navigateWithFilters(Math.max(1, currentPage - 1))}
            disabled={isPending || currentPage <= 1}
          >
            Назад
          </button>
          <button
            type="button"
            className={styles.paginationButton}
            onClick={() => navigateWithFilters(Math.min(totalPages, currentPage + 1))}
            disabled={isPending || currentPage >= totalPages}
          >
            Вперёд
          </button>
        </div>
      </div>

      {isEditorOpen && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {editorMode === "edit" ? "Редактирование заметки" : "Новая заметка"}
              </h2>
            </div>
            <form className={styles.modalBody} onSubmit={handleEditorSubmit}>
              <div className={styles.modalField}>
                <label className={styles.modalLabel} htmlFor="note-title">
                  Заголовок
                </label>
                <input
                  id="note-title"
                  className={styles.modalInput}
                  type="text"
                  value={editorState.title}
                  onChange={(event) => setEditorState((prev) => ({ ...prev, title: event.target.value }))}
                  disabled={isPending}
                />
              </div>

              <div className={styles.modalField}>
                <label className={styles.modalLabel} htmlFor="note-content">
                  Текст заметки
                </label>
                <textarea
                  id="note-content"
                  className={styles.modalTextarea}
                  value={editorState.content}
                  onChange={(event) => setEditorState((prev) => ({ ...prev, content: event.target.value }))}
                  disabled={isPending}
                />
              </div>

              <div className={styles.modalField}>
                <span className={styles.modalLabel}>Метки</span>
                <div className={styles.modalLabels}>
                  {labels.length === 0 && <span className={styles.labelName}>Метки отсутствуют</span>}
                  {labels.map((label) => {
                    const selected = editorState.labelIds.includes(label.id);
                    const labelStyle = label.color
                      ? {
                          backgroundColor: `${label.color}1A`,
                          borderColor: label.color,
                        }
                      : undefined;
                    return (
                      <label key={label.id} className={styles.modalLabelItem} style={labelStyle}>
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => {
                            setEditorState((prev) => ({
                              ...prev,
                              labelIds: selected
                                ? prev.labelIds.filter((id) => id !== label.id)
                                : [...prev.labelIds, label.id],
                            }));
                          }}
                          disabled={isPending}
                        />
                        <span>{label.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {editorError && <div className={styles.errorMessage}>{editorError}</div>}

              {renderRelationsSection()}

              <div className={styles.modalFooter}>
                <button type="button" className={styles.secondaryButton} onClick={handleEditorClose} disabled={isPending}>
                  Отмена
                </button>
                <button type="submit" className={styles.primaryButton} disabled={isPending}>
                  {isPending
                    ? "Сохраняем…"
                    : editorMode === "edit"
                    ? "Сохранить изменения"
                    : "Сохранить"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
