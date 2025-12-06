"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import UpcomingPaymentFormModal from "@/components/dashboard/UpcomingPaymentFormModal";
import { deleteUpcomingPaymentAction } from "@/app/(protected)/finance/dashboard/upcoming-actions";
import { useToast } from "@/components/toast/ToastContext";
import { formatMoney } from "@/lib/utils/format";
import type { UpcomingPaymentFormData, UpcomingPaymentFormInput } from "@/lib/dashboard/upcoming-payments/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, CheckCheck, Calendar, Loader2 } from "lucide-react";

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

  const yearOptions = useMemo(() => (availableYears.length > 0 ? availableYears : [defaultYear]), [availableYears, defaultYear]);

  const [filterYear, setFilterYear] = useState<number>(yearOptions[0]);
  const [filterMonth, setFilterMonth] = useState<number>(defaultMonth);

  // Показываем все месяцы, чтобы можно было выбрать любой
  const monthOptions = MONTH_OPTIONS.map((option) => option.value);

  useEffect(() => {
    // Если выбранный год не в списке доступных — переключаем на первый доступный
    if (yearOptions.length > 0 && !yearOptions.includes(filterYear)) {
      setFilterYear(yearOptions[0]);
    }
  }, [yearOptions, filterYear]);

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
      // Если фильтры скрыты — не фильтруем по дате (данные уже отфильтрованы снаружи)
      if (!showFilters) {
        return true;
      }
      return date.getFullYear() === filterYear && date.getMonth() === filterMonth;
    });
  }, [sortedPayments, filterYear, filterMonth, showStatusBadges, showFilters]);

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
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {title}
              </CardTitle>
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {showFilters && (
                <div className="flex items-center gap-2">
                  <Select value={String(filterYear)} onValueChange={(v) => setFilterYear(Number(v))}>
                    <SelectTrigger className="w-24 h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {yearOptions.map((year) => (
                        <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={String(filterMonth)} onValueChange={(v) => setFilterMonth(Number(v))}>
                    <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {monthOptions.map((month) => (
                        <SelectItem key={month} value={String(month)}>{MONTH_OPTIONS[month]?.label ?? month + 1}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {showActions && (
                <div className="flex items-center gap-1">
                  {showOpenAllButton && (
                    <Button variant="ghost" size="sm" onClick={handleOpenAll} disabled={isSaving}>Все платежи</Button>
                  )}
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleAddPayment} disabled={isSaving}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {actionError && !formOpen && <div className="text-sm text-destructive">{actionError}</div>}

          {hasPayments ? (
            <div className="space-y-2">
              {filteredPayments.map((payment) => {
                const amountDirection = payment.direction ?? "expense";
                const daysLeftLabel = formatDaysLeft(payment.dueDate);
                const currency = payment.currency ?? defaultCurrency ?? "RUB";
                const paymentName = payment.name?.trim() || "Без названия";
                const isPaid = payment.status === "paid";

                return (
                  <div key={payment.id} className={`flex items-center justify-between gap-3 p-3 rounded-lg border transition-colors ${isPaid ? "bg-muted/50 opacity-60" : "hover:bg-muted/50"}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{paymentName}</span>
                        {showStatusBadges && (
                          isPaid ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Оплачено</span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">В ожидании</span>
                          )
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDueDate(payment.dueDate)}
                        {payment.accountName && ` · ${payment.accountName}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!isPaid && daysLeftLabel && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${daysLeftLabel.includes("Просрочено") ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
                          {daysLeftLabel}
                        </span>
                      )}
                      <span className={`font-medium text-sm ${amountDirection === "income" ? "text-green-600" : "text-red-600"}`}>
                        {amountDirection === "income" ? "+" : "-"}{formatMoney(Math.abs(payment.amountMinor), currency)}
                      </span>
                      <div className="flex items-center">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditPayment(payment)} disabled={isSaving}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeletePayment(payment)} disabled={isSaving || deletingId === payment.id}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                        {!isPaid && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600 hover:text-green-700" onClick={() => handleOpenTransactionPicker(payment)} disabled={isSaving}>
                            <CheckCheck className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">{emptyMessage}</div>
          )}
        </CardContent>
      </Card>

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

      <Dialog open={!!selectingPayment} onOpenChange={(open) => !open && closeTransactionPicker()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Отметить платёж как оплаченный</DialogTitle>
            {selectingPayment && <p className="text-sm text-muted-foreground">Выберите транзакцию для «{selectingPayment.name}»</p>}
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Поиск транзакции</Label>
              <form onSubmit={handleSearchTransactions} className="flex gap-2">
                <Input placeholder="Введите название, заметку или сумму" value={transactionSearch} onChange={(e) => setTransactionSearch(e.target.value)} disabled={transactionsLoading || isMarkingPaid} className="flex-1" />
                <Button type="submit" disabled={transactionsLoading || isMarkingPaid}>Найти</Button>
              </form>
            </div>
            {transactionsError && <div className="text-sm text-destructive">{transactionsError}</div>}
            <div className="space-y-2">
              <Label>Транзакция</Label>
              <Select value={selectedTransactionId} onValueChange={setSelectedTransactionId} disabled={transactionsLoading || isMarkingPaid}>
                <SelectTrigger><SelectValue placeholder="— Выберите транзакцию —" /></SelectTrigger>
                <SelectContent>
                  {transactionsOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeTransactionPicker} disabled={isMarkingPaid}>Отмена</Button>
            <Button onClick={handleMarkPaid} disabled={isMarkingPaid || transactionsLoading}>
              {isMarkingPaid ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Отмечаем…</> : "Отметить как оплаченный"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export type TransactionOption = {
  id: string;
  label: string;
  account_id: string;
};
