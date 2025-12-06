"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Trash2, X, Plus, Loader2 } from "lucide-react";
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
import { useToast } from "@/components/toast/ToastContext";

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
  const toast = useToast();
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
      toast.show(editorMode === "edit" ? "Заметка обновлена" : "Заметка создана", { type: "success" });
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
        toast.show("Ошибка при удалении заметки", { type: "error" });
        return;
      }
      toast.show("Заметка удалена", { type: "success" });
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
      toast.show("Метка создана", { type: "success" });
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

      toast.show("Метка удалена", { type: "success" });
      router.refresh();
    });
  };

  const renderLabelCheckbox = (label: NoteLabel) => {
    const checked = selectedLabelIds.includes(label.id);
    return (
      <label key={label.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-colors hover:bg-muted" style={label.color ? { backgroundColor: `${label.color}1A`, borderColor: label.color } : undefined}>
        <Checkbox checked={checked} onCheckedChange={() => toggleSelectedLabel(label.id)} />
        <span className="text-sm flex-1">{label.name}</span>
        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={(event) => { event.preventDefault(); event.stopPropagation(); handleDeleteLabel(label.id); }} disabled={isPending}><X className="h-3 w-3" /></Button>
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
    const searchVal = relationSearchQueries[index] ?? "";
    return (
      <div key={`relation-${index}`} className="flex items-center gap-2">
        <Select value={relation.entityType} onValueChange={(v) => handleRelationTypeChange(index, v as EntityKind)} disabled={isPending || relationsLoading}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="transaction">Транзакция</SelectItem><SelectItem value="plan">План</SelectItem></SelectContent></Select>
        <Input type="search" placeholder={relation.entityType === "transaction" ? "Поиск транзакции" : "Поиск плана"} value={searchVal} onChange={(e) => handleRelationSearchChange(index, relation.entityType, e.target.value)} disabled={isPending} className="flex-1" />
        <Select value={relation.entityId} onValueChange={(v) => { const opt = options.find((item) => item.id === v); handleRelationEntityChange(index, v, opt?.label ?? v); }} disabled={isPending || relationsLoading}><SelectTrigger className="w-48"><SelectValue placeholder="Не выбрано" /></SelectTrigger><SelectContent>{options.map((opt) => <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>)}</SelectContent></Select>
        <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveRelation(index)} disabled={isPending || relationsLoading}><X className="h-4 w-4" /></Button>
      </div>
    );
  };

  const renderRelationsSection = () => {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between"><Label>Связи</Label><Button type="button" variant="outline" size="sm" onClick={handleAddRelation} disabled={isPending || relationsLoading || editorState.relations.length >= relationLimit}><Plus className="h-4 w-4 mr-1" />Добавить связь</Button></div>
        {relationsLoading && <div className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Загружаем...</div>}
        {!relationsLoading && editorState.relations.length === 0 && <div className="text-sm text-muted-foreground">Пока нет связей. Добавьте транзакцию или план.</div>}
        {editorState.relations.map((relation, index) => renderRelationRow(relation, index))}
        {relationsError && <div className="text-sm text-destructive">{relationsError}</div>}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-2xl font-bold">Все заметки</h1><p className="text-sm text-muted-foreground">Управляйте заметками, метками и связями с транзакциями и планами</p></div>
        <div className="flex gap-2"><Button variant="outline" onClick={handleResetFilters} disabled={isPending}>Сбросить</Button><Button onClick={openCreateEditor} disabled={isPending}><Plus className="h-4 w-4 mr-1" />Новая заметка</Button></div>
      </div>
      {cardError && <div className="text-sm text-destructive p-3 bg-destructive/10 rounded">{cardError}</div>}

      <div className="space-y-4 p-4 border rounded-lg bg-card">
        <form className="flex flex-col sm:flex-row gap-2" onSubmit={handleApplyFilters}>
          <Input type="search" placeholder="Поиск по заголовку и тексту" value={searchValue} onChange={(e) => setSearchValue(e.target.value)} disabled={isPending} className="flex-1" />
          <div className="flex gap-2"><Button type="submit" disabled={isPending}>Применить</Button><Button type="button" variant="outline" onClick={handleResetFilters} disabled={isPending}>Очистить</Button></div>
        </form>
        <div className="space-y-2">
          <Label>Фильтр по меткам</Label>
          <div className="flex flex-wrap gap-2">{labels.length === 0 && <span className="text-sm text-muted-foreground">Метки пока не созданы</span>}{labels.map((label) => renderLabelCheckbox(label))}</div>
          <form className="flex flex-col sm:flex-row gap-2 mt-2" onSubmit={handleCreateLabel}>
            <Input type="text" placeholder="Название новой метки" value={labelName} onChange={(e) => setLabelName(e.target.value)} disabled={isPending} className="flex-1" />
            <input type="color" value={labelColor} onChange={(e) => setLabelColor(e.target.value)} disabled={isPending} className="w-12 h-9 rounded border cursor-pointer" aria-label="Цвет метки" />
            <Button type="submit" variant="outline" disabled={isPending}>Добавить метку</Button>
          </form>
          {labelError && <div className="text-sm text-destructive">{labelError}</div>}
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>Заметка</TableHead><TableHead>Метки</TableHead><TableHead>Связи</TableHead><TableHead>Обновлена</TableHead><TableHead className="w-24"></TableHead></TableRow></TableHeader>
          <TableBody>
            {notes.map((note) => {
              const snippet = note.content ? note.content.slice(0, 120) + (note.content.length > 120 ? "…" : "") : "";
              return (
                <TableRow key={note.id}>
                  <TableCell><div className="font-medium">{note.title || "Без названия"}</div>{snippet && <div className="text-sm text-muted-foreground mt-1">{snippet}</div>}</TableCell>
                  <TableCell><div className="flex flex-wrap gap-1">{note.labels.length === 0 && <span className="text-muted-foreground">—</span>}{note.labels.map((lbl) => <Badge key={lbl.id} style={lbl.color ? { backgroundColor: lbl.color } : undefined}>{lbl.name}</Badge>)}</div></TableCell>
                  <TableCell>{note.relations.length > 0 ? <div className="flex flex-wrap gap-1">{note.relations.map((rel) => <Badge key={`${rel.entity_type}-${rel.entity_id}`} variant="outline">{resolveRelationLabel(rel.entity_type as EntityKind, rel.entity_id) || (rel.entity_type === "transaction" ? "Транзакция" : "План")}</Badge>)}</div> : <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(note.updated_at ?? note.created_at).toLocaleString("ru-RU")}</TableCell>
                  <TableCell><div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => openEditEditor(note)} disabled={isPending}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteNote(note)} disabled={isPending}><Trash2 className="h-4 w-4" /></Button></div></TableCell>
                </TableRow>
              );
            })}
            {notes.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Заметок не найдено. Измените фильтры или создайте новую запись.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Страница {currentPage} из {totalPages} — всего {totalCount}</div>
        <div className="flex gap-2"><Button variant="outline" onClick={() => navigateWithFilters(Math.max(1, currentPage - 1))} disabled={isPending || currentPage <= 1}>Назад</Button><Button variant="outline" onClick={() => navigateWithFilters(Math.min(totalPages, currentPage + 1))} disabled={isPending || currentPage >= totalPages}>Вперёд</Button></div>
      </div>

      <Dialog open={isEditorOpen} onOpenChange={(o) => !o && handleEditorClose()}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editorMode === "edit" ? "Редактирование заметки" : "Новая заметка"}</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={handleEditorSubmit}>
            <div className="space-y-2"><Label htmlFor="note-title">Заголовок</Label><Input id="note-title" value={editorState.title} onChange={(e) => setEditorState((prev) => ({ ...prev, title: e.target.value }))} disabled={isPending} /></div>
            <div className="space-y-2"><Label htmlFor="note-content">Текст заметки</Label><Textarea id="note-content" value={editorState.content} onChange={(e) => setEditorState((prev) => ({ ...prev, content: e.target.value }))} disabled={isPending} rows={5} /></div>
            <div className="space-y-2">
              <Label>Метки</Label>
              <div className="flex flex-wrap gap-2">
                {labels.length === 0 && <span className="text-sm text-muted-foreground">Метки отсутствуют</span>}
                {labels.map((label) => {
                  const selected = editorState.labelIds.includes(label.id);
                  return (
                    <label key={label.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-colors hover:bg-muted" style={label.color ? { backgroundColor: `${label.color}1A`, borderColor: label.color } : undefined}>
                      <Checkbox checked={selected} onCheckedChange={() => setEditorState((prev) => ({ ...prev, labelIds: selected ? prev.labelIds.filter((id) => id !== label.id) : [...prev.labelIds, label.id] }))} disabled={isPending} />
                      <span className="text-sm">{label.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            {editorError && <div className="text-sm text-destructive">{editorError}</div>}
            {renderRelationsSection()}
            <DialogFooter><Button type="button" variant="outline" onClick={handleEditorClose} disabled={isPending}>Отмена</Button><Button type="submit" disabled={isPending}>{isPending ? "Сохраняем…" : editorMode === "edit" ? "Сохранить изменения" : "Сохранить"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
