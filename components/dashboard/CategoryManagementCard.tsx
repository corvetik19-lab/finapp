"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";

import CategoryTransactionsModal from "@/components/dashboard/CategoryTransactionsModal";
import styles from "@/components/dashboard/Dashboard.module.css";
import {
  loadCategorySummaryAction,
  loadCategoryTransactionsAction,
  saveCategoryWidgetPreferencesAction,
} from "@/app/(protected)/dashboard/actions";
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

const ICON_FALLBACK = "category";

const KIND_LABEL: Record<"income" | "expense", string> = {
  income: "доход",
  expense: "расход",
};

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
      <section className={styles.categoryCardContainer}>
        <header className={styles.categoryCardHeader}>
          <div className={styles.categoryTitleGroup}>
            <span className="material-icons" aria-hidden>
              category
            </span>
            <div>
              <div className={styles.categoryTitle}>Управление категориями</div>
            </div>
          </div>
          <button type="button" className={styles.categoryAddButton} onClick={() => router.push("/settings")}>
            <span className="material-icons" aria-hidden>
              add
            </span>
            Добавить
          </button>
        </header>

        <div className={styles.categoryToolbar}>
          <div className={styles.categoryPeriodTabs}>
            {PERIODS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`${styles.categoryPeriodTab} ${
                  period === option.id ? styles.categoryPeriodTabActive : ""
                }`}
                onClick={() => handlePeriodClick(option.id)}
                disabled={isPending && period !== option.id}
              >
                {option.label}
              </button>
            ))}
          </div>

          {hiddenItems.length > 0 && (
            <div className={styles.categoryManageControls}>
              <select
                value={selectedHiddenId ?? ""}
                onChange={(event) => setSelectedHiddenId(event.target.value || null)}
                className={styles.categorySelect}
                disabled={isPending || saving}
              >
                {hiddenItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={styles.categoryAddHiddenButton}
                onClick={handleAddHidden}
                disabled={isPending || saving || !selectedHiddenId}
              >
                Добавить в виджет
              </button>
            </div>
          )}

          {hiddenItems.length > 0 && hasVisible && (
            <button
              type="button"
              className={styles.categoryResetButton}
              onClick={handleShowAll}
              disabled={isPending || saving}
            >
              Показать все
            </button>
          )}

          {period === "custom" && (
            <div className={styles.categoryCustomRange}>
              <label className={styles.categoryCustomField}>
                От
                <input
                  type="date"
                  value={customRange.from}
                  onChange={(event) => handleCustomChange("from", event.target.value)}
                  disabled={isPending}
                />
              </label>
              <label className={styles.categoryCustomField}>
                До
                <input
                  type="date"
                  value={customRange.to}
                  onChange={(event) => handleCustomChange("to", event.target.value)}
                  disabled={isPending}
                />
              </label>
              <button
                type="button"
                className={styles.categoryApplyButton}
                onClick={handleApplyCustom}
                disabled={isPending}
              >
                Применить
              </button>
            </div>
          )}
        </div>

        {error && <div className={styles.categoryError}>{error}</div>}
        {syncError && <div className={styles.categoryError}>{syncError}</div>}
        {saving && !syncError && (
          <div className={styles.categorySavingIndicator} role="status" aria-live="polite">
            <span className="material-icons" aria-hidden>
              sync
            </span>
            Сохраняем настройки…
          </div>
        )}

        {hasData ? (
          hasVisible ? (
            <>
              <div className={styles.categorySummaryRow}>
                <div className={styles.categorySummaryLabel}>Сумма выбранных</div>
                <div className={styles.categorySummaryValue}>{formatMoney(totalMinor, data.currency)}</div>
                <div className={styles.categorySummaryPeriod}>
                  Период: {data.from.slice(0, 10)} — {data.to.slice(0, 10)}
                </div>
                {hiddenItems.length > 0 && (
                  <div className={styles.categorySummaryHidden}>Скрыто: {hiddenItems.length}</div>
                )}
              </div>

              <div className={styles.categoryGrid}>
                {visibleItems.map((item) => (
                  <article
                    key={item.id}
                    className={`${styles.categoryCard} ${
                      item.kind === "income" ? styles.categoryCardIncome : styles.categoryCardExpense
                    }`}
                    role="button"
                    tabIndex={0}
                    onClick={() => void handleOpenModal(item.id, item.name)}
                    onKeyDown={(event) => onCardKeyDown(event, item.id, item.name)}
                  >
                    <div className={styles.categoryCardHeaderRow}>
                      <div className={styles.categoryIconWrapper}>
                        <span className="material-icons" aria-hidden>
                          {ICON_FALLBACK}
                        </span>
                      </div>
                      <div className={styles.categoryCardActions}>
                        <button
                          type="button"
                          className={styles.categoryIconButton}
                          onClick={(event) => {
                            event.stopPropagation();
                            router.push(`/settings?category=${encodeURIComponent(item.id)}`);
                          }}
                          title="Редактировать категорию"
                        >
                          <span className="material-icons" aria-hidden>
                            edit
                          </span>
                        </button>
                        <button
                          type="button"
                          className={styles.categoryIconButton}
                          onClick={(event) => {
                            event.stopPropagation();
                            router.push(`/settings?category=${encodeURIComponent(item.id)}#delete`);
                          }}
                          title="Удалить категорию"
                        >
                          <span className="material-icons" aria-hidden>
                            delete
                          </span>
                        </button>
                        <button
                          type="button"
                          className={styles.categoryIconButton}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleHide(item.id);
                          }}
                          title="Скрыть из виджета"
                        >
                          <span className="material-icons" aria-hidden>
                            visibility_off
                          </span>
                        </button>
                      </div>
                    </div>
                    <div className={styles.categoryName}>{item.name}</div>
                    <div className={styles.categoryStats}>
                      <div className={styles.categoryAmount}>
                        {item.kind === "income" ? "+" : "-"}
                        {formatMoney(item.totalMinor, data.currency)}
                      </div>
                      <div className={styles.categoryMeta}>
                        {item.transactionCount} {pluralizeTransactions(item.transactionCount)} · {KIND_LABEL[item.kind]}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <div className={styles.categoryEmpty}>
              Все категории скрыты. Выберите категорию в списке, чтобы добавить её в виджет.
            </div>
          )
        ) : (
          <div className={styles.categoryEmpty}>Нет транзакций по категориям за выбранный период</div>
        )}
      </section>
      <CategoryTransactionsModal
        open={modalOpen}
        onClose={handleCloseModal}
        categoryName={modalCategory?.name ?? null}
        currency={data.currency}
        transactions={modalTransactions}
        loading={modalLoading}
        error={modalError}
      />
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
