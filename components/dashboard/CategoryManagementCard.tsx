"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import CategoryTransactionsModal from "@/components/dashboard/CategoryTransactionsModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tag, Plus, Settings, Trash2, EyeOff, Loader2, Eye } from "lucide-react";
import {
  loadCategorySummaryAction,
  loadCategoryTransactionsAction,
  saveCategoryWidgetPreferencesAction,
} from "@/app/(protected)/finance/dashboard/actions";
import type {
  CategorySummaryPeriod,
  CategorySummaryResult,
  CategoryTransactionItem,
} from "@/lib/dashboard/category-management";
import type { CategoryWidgetPreferencesState } from "@/lib/dashboard/preferences/shared";
import { formatMoney } from "@/lib/utils/format";

const PERIODS: { id: CategorySummaryPeriod; label: string }[] = [
  { id: "week", label: "Неделя" },
  { id: "month", label: "Месяц" },
  { id: "year", label: "Год" },
  { id: "custom", label: "Произвольно" },
];

const INITIAL_VISIBLE_COUNT = 6;
const LOCAL_STORAGE_KEY = "dashboard:categories:visible";

export type CategoryManagementCardProps = {
  initialData: CategorySummaryResult;
  initialPreferences: CategoryWidgetPreferencesState;
};

export default function CategoryManagementCard({
  initialData,
  initialPreferences,
}: CategoryManagementCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [data, setData] = useState(initialData);
  const [error, setError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [period, setPeriod] = useState<CategorySummaryPeriod>("month");
  const [customRange, setCustomRange] = useState<{ from: string; to: string }>(() => ({
    from: initialData.from.slice(0, 10),
    to: initialData.to.slice(0, 10),
  }));

  const normalizedInitial = useMemo(
    () => normalizeVisible(initialPreferences.visibleIds, initialData.items),
    [initialPreferences.visibleIds, initialData.items]
  );

  const [visibleIds, setVisibleIds] = useState<string[]>(() =>
    normalizedInitial.length > 0
      ? normalizedInitial
      : initialData.items.slice(0, INITIAL_VISIBLE_COUNT).map((item) => item.id)
  );

  const [selectedHiddenId, setSelectedHiddenId] = useState<string | null>(() => {
    const defaults = initialData.items.slice(INITIAL_VISIBLE_COUNT);
    return defaults[0]?.id ?? null;
  });

  const storageHydratedRef = useRef(false);
  const syncInitializedRef = useRef(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalCategory, setModalCategory] = useState<{ id: string; name: string } | null>(null);
  const [modalTransactions, setModalTransactions] = useState<CategoryTransactionItem[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (normalizedInitial.length > 0) {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(normalizedInitial));
      storageHydratedRef.current = true;
      return;
    }

    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      storageHydratedRef.current = true;
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      const fallback = normalizeVisible(parsed, initialData.items);
      if (fallback.length > 0) {
        setVisibleIds(fallback);
      }
    } catch (storageError) {
      console.error("CategoryManagementCard: parse visible categories", storageError);
    } finally {
      storageHydratedRef.current = true;
    }
  }, [normalizedInitial, initialData.items]);

  useEffect(() => {
    if (typeof window === "undefined" || !storageHydratedRef.current) return;
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(visibleIds));
  }, [visibleIds]);

  useEffect(() => {
    if (!storageHydratedRef.current) return;
    if (!syncInitializedRef.current) {
      syncInitializedRef.current = true;
      return;
    }

    let cancelled = false;
    setSaving(true);
    setSyncError(null);

    (async () => {
      try {
        const result = await saveCategoryWidgetPreferencesAction({ visibleIds });
        if (cancelled) return;
        if (!result.success) {
          setSyncError(result.error);
        }
      } catch (syncFailure) {
        if (!cancelled) {
          console.error("CategoryManagementCard: save preferences", syncFailure);
          setSyncError("Не удалось сохранить настройки");
        }
      } finally {
        if (!cancelled) {
          setSaving(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visibleIds]);

  useEffect(() => {
    setVisibleIds((prev) => {
      const available = new Set(data.items.map((item) => item.id));
      const filtered = prev.filter((id) => available.has(id));
      if (filtered.length > 0) {
        return arraysEqual(filtered, prev) ? prev : filtered;
      }
      return data.items.slice(0, INITIAL_VISIBLE_COUNT).map((item) => item.id);
    });
  }, [data.items]);

  useEffect(() => {
    const hidden = data.items.filter((item) => !visibleIds.includes(item.id));
    setSelectedHiddenId((prev) => {
      if (prev && hidden.some((item) => item.id === prev)) {
        return prev;
      }
      return hidden[0]?.id ?? null;
    });
  }, [data.items, visibleIds]);

  const visibleItems = useMemo(
    () => data.items.filter((item) => visibleIds.includes(item.id)),
    [data.items, visibleIds]
  );

  const hiddenItems = useMemo(
    () => data.items.filter((item) => !visibleIds.includes(item.id)),
    [data.items, visibleIds]
  );

  const totalMinor = useMemo(
    () => visibleItems.reduce((sum, item) => sum + item.totalMinor, 0),
    [visibleItems]
  );

  const handleLoad = (nextPeriod: CategorySummaryPeriod, from?: string, to?: string) => {
    startTransition(async () => {
      const result = await loadCategorySummaryAction({ period: nextPeriod, from, to });
      if (!result.success) {
        setError(result.error);
        return;
      }

      setError(null);
      setData(result.data);
    });
  };

  const handlePeriodClick = (value: CategorySummaryPeriod) => {
    setPeriod(value);
    if (value === "custom") {
      handleLoad(value, customRange.from, customRange.to);
    } else {
      handleLoad(value);
    }
  };

  const handleCustomChange = (key: "from" | "to", value: string) => {
    setCustomRange((prev) => ({ ...prev, [key]: value }));
  };

  const handleApplyCustom = () => {
    const fromDate = new Date(customRange.from);
    const toDate = new Date(customRange.to);

    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      setError("Укажите корректные даты");
      return;
    }

    if (fromDate > toDate) {
      setError("Дата начала должна быть не позже даты окончания");
      return;
    }

    setError(null);
    handleLoad("custom", customRange.from, customRange.to);
  };

  const handleHide = (id: string) => {
    setVisibleIds((prev) => prev.filter((itemId) => itemId !== id));
  };

  const handleAddHidden = () => {
    if (!selectedHiddenId) return;
    setVisibleIds((prev) => (prev.includes(selectedHiddenId) ? prev : [...prev, selectedHiddenId]));
  };

  const handleShowAll = () => {
    setVisibleIds(data.items.map((item) => item.id));
  };

  const handleOpenModal = async (categoryId: string, categoryName: string) => {
    setModalCategory({ id: categoryId, name: categoryName });
    setModalOpen(true);
    setModalError(null);
    setModalTransactions([]);
    setModalLoading(true);

    try {
      const result = await loadCategoryTransactionsAction({
        categoryId,
        from: data.from,
        to: data.to,
        limit: 50,
      });
      
      if (!result.success) {
        setModalError(result.error);
        setModalTransactions([]);
      } else {
        setModalTransactions(result.data);
      }
    } catch (loadError) {
      console.error("CategoryManagementCard: load transactions", loadError);
      setModalError("Не удалось загрузить транзакции");
      setModalTransactions([]);
    } finally {
      setModalLoading(false);
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setModalTransactions([]);
    setModalError(null);
    setModalLoading(false);
  };

  const onCardKeyDown = (event: KeyboardEvent<HTMLElement>, categoryId: string, categoryName: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      void handleOpenModal(categoryId, categoryName);
    }
  };

  const hasVisible = visibleItems.length > 0;
  const hasData = data.items.length > 0;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Управление категориями
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => router.push("/finance/settings")}>
              <Plus className="h-4 w-4 mr-1" />
              Добавить
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1">
              {PERIODS.map((option) => (
                <Button key={option.id} variant={period === option.id ? "default" : "outline"} size="sm" onClick={() => handlePeriodClick(option.id)} disabled={isPending && period !== option.id}>
                  {option.label}
                </Button>
              ))}
            </div>

            {hiddenItems.length > 0 && (
              <div className="flex items-center gap-2">
                <Select value={selectedHiddenId ?? ""} onValueChange={(v) => setSelectedHiddenId(v || null)} disabled={isPending || saving}>
                  <SelectTrigger className="w-40 h-8"><SelectValue placeholder="Скрытые" /></SelectTrigger>
                  <SelectContent>
                    {hiddenItems.map((item) => (
                      <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={handleAddHidden} disabled={isPending || saving || !selectedHiddenId}>
                  <Eye className="h-4 w-4 mr-1" />
                  Показать
                </Button>
              </div>
            )}

            {hiddenItems.length > 0 && hasVisible && (
              <Button variant="ghost" size="sm" onClick={handleShowAll} disabled={isPending || saving}>Показать все</Button>
            )}
          </div>

          {period === "custom" && (
            <div className="flex items-center gap-2 flex-wrap">
              <Input type="date" value={customRange.from} onChange={(e) => handleCustomChange("from", e.target.value)} disabled={isPending} className="w-36 h-8" />
              <span className="text-muted-foreground">—</span>
              <Input type="date" value={customRange.to} onChange={(e) => handleCustomChange("to", e.target.value)} disabled={isPending} className="w-36 h-8" />
              <Button size="sm" onClick={handleApplyCustom} disabled={isPending}>Применить</Button>
            </div>
          )}

          {error && <div className="text-sm text-destructive">{error}</div>}
          {syncError && <div className="text-sm text-destructive">{syncError}</div>}
          {saving && !syncError && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Сохраняем настройки…
            </div>
          )}

          {hasData ? (
            hasVisible ? (
              <>
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <div><span className="text-muted-foreground">Сумма:</span> <span className="font-medium">{formatMoney(totalMinor, data.currency)}</span></div>
                  <div className="text-muted-foreground">Период: {data.from.slice(0, 10)} — {data.to.slice(0, 10)}</div>
                  {hiddenItems.length > 0 && <div className="text-muted-foreground">Скрыто: {hiddenItems.length}</div>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {visibleItems.map((item) => (
                    <div key={item.id} role="button" tabIndex={0} onClick={() => void handleOpenModal(item.id, item.name)} onKeyDown={(event) => onCardKeyDown(event, item.id, item.name)}
                      className="p-3 rounded-lg border bg-card cursor-pointer transition-all hover:shadow-md hover:border-primary/30">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                          <Tag className="h-4 w-4" />
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); router.push(`/finance/settings?category=${encodeURIComponent(item.id)}`); }}>
                            <Settings className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); router.push(`/finance/settings?category=${encodeURIComponent(item.id)}#delete`); }}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleHide(item.id); }}>
                            <EyeOff className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="font-medium text-sm truncate">{item.name}</div>
                      <div className="flex items-center justify-between mt-1">
                        <span className={`font-bold ${item.totalMinor >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {formatMoney(item.totalMinor, data.currency)}
                        </span>
                        <span className="text-xs text-muted-foreground">{item.transactionCount} {pluralizeTransactions(item.transactionCount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                Все категории скрыты. Выберите категорию в списке, чтобы добавить её в виджет.
              </div>
            )
          ) : (
            <div className="text-center py-6 text-muted-foreground">Нет транзакций по категориям за выбранный период</div>
          )}
        </CardContent>
      </Card>
      <CategoryTransactionsModal open={modalOpen} onClose={handleCloseModal} categoryName={modalCategory?.name ?? null} currency={data.currency} transactions={modalTransactions} loading={modalLoading} error={modalError} />
    </>
  );
}

function pluralizeTransactions(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "транзакция";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "транзакции";
  return "транзакций";
}

function normalizeVisible(ids: unknown, items: CategorySummaryResult["items"]): string[] {
  if (!Array.isArray(ids)) {
    return [];
  }

  const allowed = new Set(items.map((item) => item.id));
  const result: string[] = [];

  for (const value of ids) {
    if (typeof value !== "string") continue;
    if (!allowed.has(value)) continue;
    if (result.includes(value)) continue;
    result.push(value);
  }

  return result;
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
