"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Info } from "lucide-react";
import {
  upcomingPaymentFormSchema,
  type UpcomingPaymentFormInput,
} from "@/lib/dashboard/upcoming-payments/schema";

type Account = {
  id: string;
  name: string;
  type: string;
  credit_limit?: number | null;
};

const getAccountTypeLabel = (account: Account): string => {
  if (account.type === "card") {
    // Различаем дебетовые и кредитные карты
    if (account.credit_limit && account.credit_limit > 0) {
      return "💳 Кредитная карта";
    }
    return "💳 Дебетовая карта";
  }
  
  const accountTypeLabels: Record<string, string> = {
    cash: "💵 Наличные",
    bank: "🏦 Банковский счёт",
    savings: "🏦 Накопительный счёт",
    investment: "📈 Инвестиционный счёт",
    loan: "💰 Кредит",
    other: "📊 Другой счёт",
  };
  return accountTypeLabels[account.type] || "📊 Счёт";
};

export type UpcomingPaymentFormModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: UpcomingPaymentFormInput) => void;
  pending?: boolean;
  title?: string;
  subtitle?: string;
  defaultValues?: Partial<UpcomingPaymentFormInput>;
  error?: string | null;
  isPaid?: boolean;
  hasLinkedTransaction?: boolean;
  onUnlinkTransaction?: () => Promise<void> | void;
  unlinkPending?: boolean;
};

const DEFAULT_VALUES: Partial<UpcomingPaymentFormInput> = {
  id: undefined,
  name: "",
  dueDate: new Date().toISOString().slice(0, 10),
  direction: "expense",
  accountName: undefined,
};

export default function UpcomingPaymentFormModal({
  open,
  onClose,
  onSubmit,
  pending = false,
  title = "Новый платёж",
  subtitle = "Создайте напоминание о предстоящем платеже",
  defaultValues,
  error,
  isPaid = false,
  hasLinkedTransaction = false,
  onUnlinkTransaction,
  unlinkPending = false,
}: UpcomingPaymentFormModalProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);

  const form = useForm<UpcomingPaymentFormInput>({
    resolver: zodResolver(upcomingPaymentFormSchema),
    defaultValues: {
      ...DEFAULT_VALUES,
      ...defaultValues,
    },
  });

  // Загружаем список счетов
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const response = await fetch("/api/accounts");
        if (response.ok) {
          const data = await response.json();
          setAccounts(data.accounts || []);
        }
      } catch (error) {
        console.error("Failed to load accounts:", error);
      }
    };

    if (open) {
      loadAccounts();
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      form.reset({
        ...DEFAULT_VALUES,
        ...defaultValues,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultValues?.id, defaultValues?.dueDate]);

  const handleSubmitClick = () => {
    form.handleSubmit((values) => {
      const normalized: UpcomingPaymentFormInput = {
        ...values,
        id: values.id && values.id.length > 0 ? values.id : undefined,
      };
      onSubmit(normalized);
    })();
  };

  const handleFormSubmit = form.handleSubmit((values) => {
    const normalized: UpcomingPaymentFormInput = {
      ...values,
      id: values.id && values.id.length > 0 ? values.id : undefined,
    };
    onSubmit(normalized);
  });

  const handleClose = () => {
    if (pending || unlinkPending) return;
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{subtitle}</DialogDescription></DialogHeader>
        {error && <div className="text-sm text-destructive p-3 bg-destructive/10 rounded">{error}</div>}
        <form id="upcomingPaymentForm" className="space-y-4" onSubmit={handleFormSubmit} noValidate>
          <input type="hidden" {...form.register("id")} />
          <div className="space-y-2"><Label>Название</Label><Input type="text" placeholder="Например, аренда" {...form.register("name")} autoFocus disabled={pending} />{form.formState.errors.name && <span className="text-sm text-destructive">{form.formState.errors.name.message}</span>}</div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Дата</Label><Input type="date" {...form.register("dueDate")} disabled={pending} />{form.formState.errors.dueDate && <span className="text-sm text-destructive">{form.formState.errors.dueDate.message}</span>}</div>
            <div className="space-y-2"><Label>Сумма</Label><Input type="number" step="0.01" min="0.01" placeholder="Введите сумму" {...form.register("amountMajor")} disabled={pending} />{form.formState.errors.amountMajor && <span className="text-sm text-destructive">{form.formState.errors.amountMajor.message}</span>}</div>
          </div>
          <div className="space-y-2"><Label>Тип</Label><Select onValueChange={(v) => form.setValue("direction", v as "income" | "expense")} defaultValue={form.getValues("direction")} disabled={pending}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="expense">Расход</SelectItem><SelectItem value="income">Доход</SelectItem></SelectContent></Select>{form.formState.errors.direction && <span className="text-sm text-destructive">{form.formState.errors.direction.message}</span>}</div>
          {isPaid && hasLinkedTransaction && (
            <div className="space-y-2"><Label>Счёт</Label><Select value={form.watch("accountName") || ""} disabled><SelectTrigger><SelectValue placeholder="Не выбран" /></SelectTrigger><SelectContent>{accounts.map((account) => <SelectItem key={account.id} value={account.name}>{getAccountTypeLabel(account)} — {account.name}</SelectItem>)}</SelectContent></Select><span className="flex items-center gap-1 text-xs text-primary"><Info className="h-3 w-3" />Счёт указан из связанной транзакции</span></div>
          )}
        </form>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={handleClose} disabled={pending}>Отмена</Button>
          {isPaid && <Button type="button" variant="destructive" onClick={() => onUnlinkTransaction?.()} disabled={pending || unlinkPending || !onUnlinkTransaction || !hasLinkedTransaction}>{unlinkPending ? "Отменяем..." : "Убрать связь"}</Button>}
          <Button type="button" onClick={handleSubmitClick} disabled={pending || unlinkPending}>{pending ? "Сохраняем..." : "Сохранить"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
