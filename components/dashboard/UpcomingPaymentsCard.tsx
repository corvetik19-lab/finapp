"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "@/components/dashboard/Dashboard.module.css";
import UpcomingPaymentFormModal from "@/components/dashboard/UpcomingPaymentFormModal";
import { deleteUpcomingPaymentAction } from "@/app/(protected)/finance/dashboard/upcoming-actions";
import { useToast } from "@/components/toast/ToastContext";
import { formatMoney } from "@/lib/utils/format";
import type { UpcomingPaymentFormData, UpcomingPaymentFormInput } from "@/lib/dashboard/upcoming-payments/schema";

type UpcomingPaymentDirection = "income" | "expense";

export type UpcomingPayment = {
  id: string;
  name: string;
  dueDate: string;
  amountMinor: number;
  currency?: string;
  accountName?: string;
  direction?: UpcomingPaymentDirection;
  status?: "pending" | "paid";
  paidAt?: string | null;
  paidTransactionId?: string | null;
};

export type UpcomingPaymentsCardProps = {
  payments: UpcomingPayment[];
  title?: string;
  subtitle?: string;
  emptyMessage?: string;
  onOpenAll?: () => void;
  onAddPayment?: () => void;
  showActions?: boolean;
  showOpenAllButton?: boolean;
  showFilters?: boolean;
  showStatusBadges?: boolean;
  defaultCurrency?: string;
};

const DEFAULT_TITLE = "Предстоящие платежи";
const DEFAULT_SUBTITLE = "Следующие счета и обязательства";
const DEFAULT_EMPTY_MESSAGE = "Нет запланированных платежей.";

const MONTH_OPTIONS = [
  { value: 0, label: "Январь" },
  { value: 1, label: "Февраль" },
  { value: 2, label: "Март" },
  { value: 3, label: "Апрель" },
  { value: 4, label: "Май" },
  { value: 5, label: "Июнь" },
  { value: 6, label: "Июль" },
  { value: 7, label: "Август" },
  { value: 8, label: "Сентябрь" },
  { value: 9, label: "Октябрь" },
  { value: 10, label: "Ноябрь" },
  { value: 11, label: "Декабрь" },
] as const;

const formatDueDate = (iso: string) => {
  try {
    const date = new Date(iso);
    return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(date);
  } catch (error) {
    console.error("UpcomingPaymentsCard: format date", error, iso);
    return iso;
  }
};

const formatDaysLeft = (iso: string) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(iso);
    dueDate.setHours(0, 0, 0, 0);
    const diffMs = dueDate.getTime() - today.getTime();
    const days = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (Number.isNaN(days)) return null;
    if (days < 0) return `Просрочено на ${Math.abs(days)} д.`;
    if (days === 0) return "Сегодня";
    return `Через ${days} д.`;
  } catch (error) {
    console.error("UpcomingPaymentsCard: format days", error, iso);
    return null;
  }
};

export default function UpcomingPaymentsCard({
  payments,
  title = DEFAULT_TITLE,
  subtitle = DEFAULT_SUBTITLE,
  emptyMessage = DEFAULT_EMPTY_MESSAGE,
  onOpenAll,
  onAddPayment,
  showActions = true,
  showOpenAllButton = true,
  showFilters = true,
  showStatusBadges = false,
  defaultCurrency,
}: UpcomingPaymentsCardProps) {
  const router = useRouter();
  const { show: showToast } = useToast();

  const today = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }, []);
  const defaultYear = today.getFullYear();
  const defaultMonth = today.getMonth();

  const sortedPayments = useMemo(
    () => [...payments].sort((a, b) => {
      const aIsPaid = a.status === "paid" ? 0 : 1;
      const bIsPaid = b.status === "paid" ? 0 : 1;
      if (aIsPaid !== bIsPaid) {
        return aIsPaid - bIsPaid;
      }
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }),
    [payments],
  );

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    payments.forEach((payment) => {
      const date = new Date(payment.dueDate);
      if (!Number.isNaN(date.getTime())) {
        years.add(date.getFullYear());
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [payments]);

  const monthsByYear = useMemo(() => {
    const map = new Map<number, number[]>();
    payments.forEach((payment) => {
      const date = new Date(payment.dueDate);
      if (Number.isNaN(date.getTime())) {
        return;
      }
      const year = date.getFullYear();
      const month = date.getMonth();
      const existing = map.get(year) ?? [];
      if (!existing.includes(month)) {
        map.set(year, [...existing, month].sort((a, b) => a - b));
      }
    });
    return map;
  }, [payments]);

  const yearOptions = useMemo(() => (availableYears.length > 0 ? availableYears : [defaultYear]), [availableYears, defaultYear]);

  const [filterYear, setFilterYear] = useState<number>(yearOptions[0]);
  const [filterMonth, setFilterMonth] = useState<number>(defaultMonth);

  const availableMonths = useMemo(() => monthsByYear.get(filterYear) ?? [], [monthsByYear, filterYear]);
  const monthOptions = availableMonths.length > 0 ? availableMonths : MONTH_OPTIONS.map((option) => option.value);

  useEffect(() => {
    if (yearOptions.length === 0) {
      if (filterYear !== defaultYear) {
        setFilterYear(defaultYear);
      }
      if (filterMonth !== defaultMonth) {
        setFilterMonth(defaultMonth);
      }
      return;
    }

    if (!yearOptions.includes(filterYear)) {
      setFilterYear(yearOptions[0]);
      return;
    }

    const months = monthsByYear.get(filterYear) ?? [];
    if (months.length === 0) {
      if (filterMonth !== defaultMonth) {
        setFilterMonth(defaultMonth);
      }
      return;
    }

    if (!months.includes(filterMonth)) {
      const preferredMonth = months.includes(defaultMonth) ? defaultMonth : months[0];
      if (preferredMonth !== filterMonth) {
        setFilterMonth(preferredMonth);
      }
    }
  }, [yearOptions, monthsByYear, filterYear, filterMonth, defaultMonth, defaultYear]);

  const filteredPayments = useMemo(() => {
    return sortedPayments.filter((payment) => {
      const date = new Date(payment.dueDate);
      if (Number.isNaN(date.getTime())) {
        return false;
      }
      // Скрываем оплаченные платежи только если не показываем статус-бейджи (на дашборде)
      if (!showStatusBadges && payment.status === "paid") {
        return false;
      }
      return date.getFullYear() === filterYear && date.getMonth() === filterMonth;
    });
  }, [sortedPayments, filterYear, filterMonth, showStatusBadges]);

  const handleOpenAll = () => {
    if (onOpenAll) {
      onOpenAll();
      return;
    }
    router.push("/payments");
  };

  const [isSaving, setIsSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingPayment, setEditingPayment] = useState<UpcomingPayment | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectingPayment, setSelectingPayment] = useState<UpcomingPayment | null>(null);
  const [transactionsOptions, setTransactionsOptions] = useState<TransactionOption[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string>("");
  const [transactionSearch, setTransactionSearch] = useState("");
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);
  const [isEditUnlinking, setIsEditUnlinking] = useState(false);

  const handleAddPayment = () => {
    if (onAddPayment) {
      onAddPayment();
      return;
    }
    setFormMode("create");
    setEditingPayment(null);
    setFormOpen(true);
  };

  const handleEditPayment = (payment: UpcomingPayment) => {
    setFormMode("edit");
    setEditingPayment(payment);
    setFormOpen(true);
  };

  const closeForm = () => {
    if (isSaving || isEditUnlinking) return;
    setFormOpen(false);
    setEditingPayment(null);
    setActionError(null);
    setIsEditUnlinking(false);
  };

  const closeTransactionPicker = () => {
    setSelectingPayment(null);
    setTransactionsOptions([]);
    setTransactionSearch("");
    setSelectedTransactionId("");
    setTransactionsError(null);
  };

  const loadTransactionOptions = useCallback(
    async (search?: string, includeIds?: string[]) => {
      try {
        setTransactionsLoading(true);
        setTransactionsError(null);
        const params = new URLSearchParams();
        if (search && search.trim().length > 0) params.set("search", search.trim());
        if (includeIds && includeIds.length > 0) {
          params.set("ids", includeIds.join(","));
        } else {
          // Исключаем транзакции уже привязанные к другим платежам
          params.set("excludeLinked", "true");
        }

        const queryString = params.toString();
        const url = queryString.length > 0 ? `/api/transactions/select?${queryString}` : "/api/transactions/select?excludeLinked=true";
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error("Не удалось загрузить транзакции");

        const data = (await res.json()) as { items: TransactionOption[] };
        setTransactionsOptions(data.items ?? []);
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Не удалось загрузить транзакции";
        setTransactionsError(msg);
      } finally {
        setTransactionsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!selectingPayment) return;
    const includeIds = selectingPayment?.paidTransactionId ? [selectingPayment.paidTransactionId] : undefined;
    void loadTransactionOptions(undefined, includeIds);
  }, [selectingPayment, loadTransactionOptions]);

  useEffect(() => {
    if (!selectingPayment) return;
    if (transactionsOptions.length === 0) {
      setSelectedTransactionId("");
      return;
    }
    setSelectedTransactionId((prev) => {
      const preferred = selectingPayment.paidTransactionId;
      if (preferred && transactionsOptions.some((option) => option.id === preferred)) return preferred;
      if (prev && transactionsOptions.some((option) => option.id === prev)) return prev;
      return transactionsOptions[0]?.id ?? "";
    });
  }, [transactionsOptions, selectingPayment]);

  const handleSubmit = async (values: UpcomingPaymentFormInput) => {
    setActionError(null);
    setIsSaving(true);
    try {
      const amountMajorNumber = Number(values.amountMajor);
      if (!Number.isFinite(amountMajorNumber) || amountMajorNumber <= 0) {
        const message = "Сумма должна быть больше нуля";
        setActionError(message);
        showToast(message, { type: "error" });
        return;
      }

      const isEdit = formMode === "edit" && Boolean(values.id && values.id.length > 0);
      const payload: UpcomingPaymentFormData = {
        id: isEdit ? (values.id as string) : undefined,
        name: values.name,
        dueDate: values.dueDate,
        amountMajor: amountMajorNumber,
        direction: values.direction,
        accountName: values.accountName,
      };

      const res = await fetch("/api/upcoming-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await res.json()) as { success: boolean; error?: string };

      if (!res.ok || !result.success) {
        const message = result.error || "Не удалось сохранить платёж";
        setActionError(message);
        showToast(message, { type: "error" });
        return;
      }

      setFormOpen(false);
      setEditingPayment(null);
      router.refresh();
      showToast(isEdit ? "Обновлено" : "Сохранено", { type: "success" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Ошибка сети при сохранении. Попробуйте ещё раз.";
      setActionError(message);
      showToast(message, { type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePayment = (payment: UpcomingPayment) => {
    if (isSaving) return;
    if (!window.confirm(`Вы действительно хотите удалить платёж «${payment.name}»?`)) return;

    setDeletingId(payment.id);
    void (async () => {
      try {
        const result = await deleteUpcomingPaymentAction(payment.id);
        if (!result?.success) {
          showToast(result?.error ?? `Не удалось удалить платёж «${payment.name}»`, { type: "error" });
          return;
        }
        showToast(`Платёж «${payment.name}» удалён`, { type: "success" });
        router.refresh();
      } finally {
        setDeletingId(null);
      }
    })();
  };

  const handleOpenTransactionPicker = (payment: UpcomingPayment) => {
    setSelectingPayment(payment);
    setSelectedTransactionId(payment.paidTransactionId ?? "");
  };

  const handleSearchTransactions = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await loadTransactionOptions(transactionSearch);
  };

  const handleEditUnlinkTransaction = async () => {
    if (!editingPayment) return;

    setIsEditUnlinking(true);
    try {
      const res = await fetch("/api/upcoming-payments/unlink-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: editingPayment.id }),
      });
      const result = (await res.json()) as { success: boolean; error?: string };

      if (!res.ok || !result.success) {
        throw new Error(result.error || "Не удалось отменить связь");
      }

      setEditingPayment((prev) =>
        prev
          ? {
              ...prev,
              status: "pending",
              paidAt: null,
              paidTransactionId: null,
            }
          : prev,
      );
      router.refresh();
      showToast("Связь с транзакцией удалена", { type: "success" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось отменить связь";
      showToast(message, { type: "error" });
    } finally {
      setIsEditUnlinking(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!selectingPayment || !selectedTransactionId) {
      setTransactionsError("Выберите транзакцию");
      return;
    }

    // Находим выбранную транзакцию чтобы получить account_id
    const selectedTransaction = transactionsOptions.find(opt => opt.id === selectedTransactionId);
    const accountId = selectedTransaction?.account_id;

    setIsMarkingPaid(true);
    setTransactionsError(null);
    try {
      const res = await fetch("/api/upcoming-payments/mark-paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          paymentId: selectingPayment.id, 
          transactionId: selectedTransactionId,
          accountId: accountId 
        }),
      });
      const result = (await res.json()) as { success: boolean; error?: string };

      if (!res.ok || !result.success) {
        throw new Error(result.error || "Не удалось отметить платёж");
      }

      setEditingPayment((prev) =>
        prev && prev.id === selectingPayment.id
          ? { ...prev, status: "paid", paidAt: new Date().toISOString(), paidTransactionId: selectedTransactionId }
          : prev,
      );

      closeTransactionPicker();
      router.refresh();
      showToast("Платёж отмечен как оплаченный", { type: "success" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось отметить платёж";
      setTransactionsError(message);
      showToast(message, { type: "error" });
    } finally {
      setIsMarkingPaid(false);
    }
  };

  const modalDefaults: Partial<UpcomingPaymentFormData> | undefined = useMemo(() => {
    if (formMode === "edit" && editingPayment) {
      return {
        id: editingPayment.id,
        name: editingPayment.name,
        dueDate: editingPayment.dueDate.slice(0, 10),
        amountMajor: Math.abs(editingPayment.amountMinor) / 100,
        direction: editingPayment.direction ?? "expense",
        accountName: editingPayment.accountName ?? undefined,
      };
    }
    return undefined;
  }, [formMode, editingPayment]);

  const hasPayments = filteredPayments.length > 0;

  return (
    <section className={styles.upcomingCard}>
      <header className={styles.upcomingHeader}>
        <div className={styles.upcomingTitleGroup}>
          <div>
            <div className={styles.upcomingTitle}>{title}</div>
            <div className={styles.upcomingSubtitle}>{subtitle}</div>
          </div>
        </div>
        <div className={styles.upcomingControls}>
          {showFilters && (
            <div className={styles.upcomingFilters}>
              <label className={styles.upcomingFilter}>
                <span className={styles.upcomingFilterLabel}>Год</span>
                <select
                  className={styles.upcomingFilterSelect}
                  value={filterYear}
                  onChange={(event) => setFilterYear(Number(event.target.value))}
                >
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.upcomingFilter}>
                <span className={styles.upcomingFilterLabel}>Месяц</span>
                <select
                  className={styles.upcomingFilterSelect}
                  value={filterMonth}
                  onChange={(event) => setFilterMonth(Number(event.target.value))}
                >
                  {monthOptions.map((month) => (
                    <option key={month} value={month}>
                      {MONTH_OPTIONS[month]?.label ?? month + 1}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
          {showActions && (
            <div className={styles.upcomingActions}>
              {showOpenAllButton && (
                <button type="button" className={styles.upcomingActionButton} onClick={handleOpenAll} disabled={isSaving}>
                  Все платежи
                </button>
              )}
              <button
                type="button"
                className={`${styles.upcomingIconButton} ${styles.upcomingAddButton}`}
                onClick={handleAddPayment}
                aria-label="Создать напоминание о платеже"
                disabled={isSaving}
              >
                <span className="material-icons" aria-hidden>
                  add
                </span>
              </button>
            </div>
          )}
        </div>
      </header>

      {actionError && !formOpen && <div className={styles.upcomingError}>{actionError}</div>}

      {hasPayments ? (
        <div className={styles.upcomingList}>
          {filteredPayments.map((payment) => {
            const amountDirection = payment.direction ?? "expense";
            const amountClass =
              amountDirection === "income" ? styles.upcomingAmountIncome : styles.upcomingAmountExpense;
            const daysLeftLabel = formatDaysLeft(payment.dueDate);
            const currency = payment.currency ?? defaultCurrency ?? "RUB";
            const paymentName = payment.name?.trim() || "Без названия";
            const isPaid = payment.status === "paid";

            return (
              <article key={payment.id} className={`${styles.upcomingItem} ${!showStatusBadges && (isPaid ? styles.upcomingItemPaid : styles.upcomingItemPending)}`}>
                <div className={styles.upcomingDetails}>
                  <div className={styles.upcomingNameRow}>
                    <div className={styles.upcomingName}>{paymentName}</div>
                    {showStatusBadges && (
                      isPaid ? (
                        <span className={`${styles.upcomingStatusChip} ${styles.upcomingStatusPaid}`}>Оплачено</span>
                      ) : (
                        <span className={`${styles.upcomingStatusChip} ${styles.upcomingStatusPending}`}>В ожидании</span>
                      )
                    )}
                  </div>
                  <div className={styles.upcomingMeta}>
                    <span>{formatDueDate(payment.dueDate)}</span>
                    {payment.accountName && <span>· {payment.accountName}</span>}
                  </div>
                </div>
                <div className={styles.upcomingAmountGroup}>
                  {!isPaid && daysLeftLabel && <span className={styles.upcomingChip}>{daysLeftLabel}</span>}
                  <div className={`${styles.upcomingAmount} ${amountClass}`}>
                    {amountDirection === "income" ? "+" : "-"}
                    {formatMoney(Math.abs(payment.amountMinor), currency)}
                  </div>
                  <div className={styles.upcomingItemActions}>
                    <button
                      type="button"
                      className={styles.upcomingItemButton}
                      onClick={() => handleEditPayment(payment)}
                      aria-label="Редактировать платёж"
                      disabled={isSaving}
                    >
                      <span className="material-icons" aria-hidden>
                        edit
                      </span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.upcomingItemButton} ${styles.upcomingItemDeleteButton}`}
                      onClick={() => handleDeletePayment(payment)}
                      aria-label="Удалить платёж"
                      disabled={isSaving || deletingId === payment.id}
                    >
                      <span className="material-icons" aria-hidden>
                        delete
                      </span>
                    </button>
                    {!isPaid && (
                      <button
                        type="button"
                        className={`${styles.upcomingItemButton} ${styles.upcomingMarkPaidButton}`}
                        onClick={() => handleOpenTransactionPicker(payment)}
                        aria-label="Отметить как оплаченный"
                        disabled={isSaving}
                      >
                        <span className="material-icons" aria-hidden>
                          done_all
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className={styles.upcomingEmpty}>{emptyMessage}</div>
      )}

      <UpcomingPaymentFormModal
        open={formOpen}
        onClose={closeForm}
        onSubmit={handleSubmit}
        pending={isSaving}
        title={formMode === "edit" ? "Редактирование платежа" : "Новый платёж"}
        subtitle={formMode === "edit" ? "Обновите данные предстоящего платежа" : "Создайте напоминание о платеже"}
        defaultValues={modalDefaults}
        error={formOpen ? actionError : null}
        isPaid={formMode === "edit" && (editingPayment?.status ?? "pending") === "paid"}
        hasLinkedTransaction={Boolean(editingPayment?.paidTransactionId)}
        onUnlinkTransaction={formMode === "edit" ? handleEditUnlinkTransaction : undefined}
        unlinkPending={isEditUnlinking}
      />

      {selectingPayment && (
        <div className={styles.modalRoot} role="presentation" onClick={closeTransactionPicker}>
          <div className={styles.modal} role="dialog" aria-modal onClick={(e) => e.stopPropagation()}>
            <header className={styles.modalHeader}>
              <div>
                <div className={styles.modalTitle}>Отметить платёж как оплаченный</div>
                <div className={styles.modalSubtitle}>{`Выберите транзакцию для «${selectingPayment.name}»`}</div>
              </div>
              <button type="button" className={styles.modalClose} onClick={closeTransactionPicker} aria-label="Закрыть">
                <span className="material-icons" aria-hidden>
                  close
                </span>
              </button>
            </header>

            <div className={styles.modalContent}>
              <div className={styles.modalForm}>
                <div className={styles.formGroup}>
                  <span className={styles.formLabel}>Поиск транзакции</span>
                  <form onSubmit={handleSearchTransactions} style={{ display: "flex", gap: "10px" }}>
                    <input
                      type="text"
                      className={styles.formInput}
                      placeholder="Введите название, заметку или сумму"
                      value={transactionSearch}
                      onChange={(event) => setTransactionSearch(event.target.value)}
                      disabled={transactionsLoading || isMarkingPaid}
                      style={{ flex: 1 }}
                    />
                    <button type="submit" className={styles.btnPrimary} disabled={transactionsLoading || isMarkingPaid}>
                      Найти
                    </button>
                  </form>
                </div>

                {transactionsError && <div className={styles.modalError}>{transactionsError}</div>}

                <div className={styles.formGroup}>
                  <span className={styles.formLabel}>Транзакция</span>
                  <select
                    className={styles.formSelect}
                    value={selectedTransactionId}
                    onChange={(event) => {
                      const txnId = event.target.value;
                      setSelectedTransactionId(txnId);
                    }}
                    disabled={transactionsLoading || isMarkingPaid}
                  >
                    <option value="">— Выберите транзакцию —</option>
                    {transactionsOptions.map((option) => (
                      <option key={option.id} value={option.id} data-account-id={option.account_id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={closeTransactionPicker}
                  disabled={isMarkingPaid}
                >
                  Отмена
                </button>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={handleMarkPaid}
                  disabled={isMarkingPaid || transactionsLoading}
                >
                  {isMarkingPaid ? "Отмечаем…" : "Отметить как оплаченный"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export type TransactionOption = {
  id: string;
  label: string;
  account_id: string;
};
