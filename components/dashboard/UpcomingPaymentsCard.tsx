"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "@/components/dashboard/Dashboard.module.css";
import { formatMoney } from "@/lib/utils/format";
import UpcomingPaymentFormModal from "@/components/dashboard/UpcomingPaymentFormModal";
import {
  deleteUpcomingPaymentAction,
} from "@/app/(protected)/dashboard/upcoming-actions";
import type {
  UpcomingPaymentFormData,
  UpcomingPaymentFormInput,
} from "@/lib/dashboard/upcoming-payments/schema";
import { useToast } from "@/components/toast/ToastContext";

type UpcomingPaymentDirection = "income" | "expense";

export type UpcomingPayment = {
  id: string;
  name: string;
  dueDate: string;
  amountMinor: number;
  currency?: string;
  accountName?: string;
  direction?: UpcomingPaymentDirection;
  description?: string | null;
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
  defaultCurrency?: string;
};

const DEFAULT_TITLE = "Предстоящие платежи";
const DEFAULT_SUBTITLE = "Следующие счета и обязательства";
const DEFAULT_EMPTY_MESSAGE = "Нет запланированных платежей.";

const formatDueDate = (iso: string) => {
  try {
    const date = new Date(iso);
    return new Intl.DateTimeFormat("ru-RU", {
      day: "numeric",
      month: "long",
    }).format(date);
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
    if (Number.isNaN(days)) {
      return null;
    }
    if (days < 0) {
      return `Просрочено на ${Math.abs(days)} д.`;
    }
    if (days === 0) {
      return "Сегодня";
    }
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
  defaultCurrency,
}: UpcomingPaymentsCardProps) {
  const router = useRouter();
  const { show: showToast } = useToast();

  const sortedPayments = useMemo(
    () =>
      [...payments].sort((a, b) => {
        const left = new Date(a.dueDate).getTime();
        const right = new Date(b.dueDate).getTime();
        return left - right;
      }),
    [payments]
  );

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
    if (isSaving) return;
    setFormOpen(false);
    setEditingPayment(null);
    setActionError(null);
  };

  const handleSubmit = async (values: UpcomingPaymentFormInput) => {
    console.info("[UpcomingPaymentsCard] submit clicked", { values, formMode });
    setActionError(null);
    setIsSaving(true);
    try {
      const amountMajorNumber = Number(values.amountMajor);

      if (!Number.isFinite(amountMajorNumber) || amountMajorNumber <= 0) {
        setActionError("Сумма должна быть больше нуля");
        showToast("Сумма должна быть больше нуля", { type: "error" });
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
        description: values.description,
      };

      const res = await fetch("/api/upcoming-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await res.json()) as { success: boolean; error?: string };
      console.info("[UpcomingPaymentsCard] fetch result", { status: res.status, ok: res.ok, result });
      if (!res.ok || !result.success) {
        setActionError(result.error || "Не удалось сохранить платёж");
        showToast(result.error || "Ошибка сохранения", { type: "error" });
        return;
      }
      setFormOpen(false);
      setEditingPayment(null);
      router.refresh();
      showToast(isEdit ? "Обновлено" : "Сохранено", { type: "success" });
    } catch {
      setActionError("Ошибка сети при сохранении. Попробуйте ещё раз.");
      showToast("Ошибка сети при сохранении", { type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePayment = (payment: UpcomingPayment) => {
    if (!window.confirm(`Удалить платёж «${payment.name}»?`)) {
      return;
    }
    setActionError(null);
    setDeletingId(payment.id);
    void (async () => {
      const result = await deleteUpcomingPaymentAction(payment.id);
      if (!result.success) {
        setActionError(result.error);
        setDeletingId(null);
        showToast(result.error || "Ошибка удаления", { type: "error" });
        return;
      }
      setDeletingId(null);
      router.refresh();
      showToast("Удалено", { type: "success" });
    })();
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
        description:
          editingPayment.description && editingPayment.description.length > 10
            ? `${editingPayment.description.slice(0, 10)}`
            : editingPayment.description ?? undefined,
      };
    }
    return undefined;
  }, [formMode, editingPayment]);

  const hasPayments = sortedPayments.length > 0;

  return (
    <section className={styles.upcomingCard}>
      <header className={styles.upcomingHeader}>
        <div className={styles.upcomingTitleGroup}>
          <div>
            <div className={styles.upcomingTitle}>{title}</div>
            <div className={styles.upcomingSubtitle}>{subtitle}</div>
          </div>
        </div>
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
      </header>

      {actionError && !formOpen && <div className={styles.upcomingError}>{actionError}</div>}

      {hasPayments ? (
        <div className={styles.upcomingList}>
          {sortedPayments.map((payment) => {
            const amountDirection = payment.direction ?? "expense";
            const amountClass =
              amountDirection === "income"
                ? styles.upcomingAmountIncome
                : styles.upcomingAmountExpense;
            const daysLeftLabel = formatDaysLeft(payment.dueDate);
            const currency = payment.currency ?? defaultCurrency ?? "RUB";
            const paymentName = payment.name?.trim() || "Без названия";
            const descriptionText = payment.description?.trim() ?? "";
            const truncatedDescription =
              descriptionText.length > 10 ? `${descriptionText.slice(0, 10)}…` : descriptionText;
            return (
              <article key={payment.id} className={styles.upcomingItem}>
                <div className={styles.upcomingInfo}>
                  <div className={styles.upcomingDetails}>
                    <div className={styles.upcomingName}>{paymentName}</div>
                    <div className={styles.upcomingMeta}>
                      <span>{formatDueDate(payment.dueDate)}</span>
                      {payment.accountName && <span>· {payment.accountName}</span>}
                    </div>
                  </div>
                </div>
                <div className={styles.upcomingAmountGroup}>
                  {daysLeftLabel && <span className={styles.upcomingChip}>{daysLeftLabel}</span>}
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
                  </div>
                </div>
                {truncatedDescription && (
                  <div className={styles.upcomingDescription}>{truncatedDescription}</div>
                )}
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
      />
    </section>
  );
}
