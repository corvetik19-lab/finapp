"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loanFormSchema, type LoanFormData } from "@/lib/loans/schema";
import type { Loan } from "@/lib/loans/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Info, Loader2 } from "lucide-react";

type LoanFormModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  loan?: Loan | null;
};

export default function LoanFormModal({ open, onClose, onSuccess, loan }: LoanFormModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const isEdit = Boolean(loan);
  
  const [paymentDay, setPaymentDay] = useState<string>("");
  const [calculatedTermMonths, setCalculatedTermMonths] = useState<number | undefined>(undefined);
  const [calculatedTotalAmount, setCalculatedTotalAmount] = useState<number | undefined>(undefined);
  
  const form = useForm<LoanFormData>({
    resolver: zodResolver(loanFormSchema),
    defaultValues: {
      name: "",
      bank: "",
      principalAmount: 0,
      interestRate: 0,
      monthlyPayment: 0,
      issueDate: new Date().toISOString().slice(0, 10),
      endDate: "",
      termMonths: undefined,
      paymentType: "annuity",
      contractNumber: "",
      nextPaymentDate: "",
    },
  });
  
  // Автоматический расчёт срока кредита при изменении дат
  const issueDate = form.watch("issueDate");
  const endDate = form.watch("endDate");
  const monthlyPayment = form.watch("monthlyPayment");
  
  useEffect(() => {
    if (issueDate && endDate) {
      const start = new Date(issueDate);
      const end = new Date(endDate);
      
      if (start < end) {
        // Рассчитываем количество месяцев между датами
        const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
        setCalculatedTermMonths(months);
        form.setValue("termMonths", months);
        
        // Рассчитываем общую сумму к оплате
        if (monthlyPayment && monthlyPayment > 0) {
          const totalAmount = monthlyPayment * months;
          setCalculatedTotalAmount(totalAmount);
        } else {
          setCalculatedTotalAmount(undefined);
        }
      } else {
        setCalculatedTermMonths(undefined);
        setCalculatedTotalAmount(undefined);
      }
    } else {
      setCalculatedTermMonths(undefined);
      setCalculatedTotalAmount(undefined);
    }
  }, [issueDate, endDate, monthlyPayment, form]);

  useEffect(() => {
    if (loan && open) {
      // Извлекаем день из даты (если есть)
      let day = "";
      if (loan.nextPaymentDate) {
        const date = new Date(loan.nextPaymentDate);
        day = date.getDate().toString();
      }
      setPaymentDay(day);
      
      form.reset({
        id: loan.id,
        name: loan.name,
        bank: loan.bank,
        principalAmount: loan.principalAmount,
        interestRate: loan.interestRate,
        monthlyPayment: loan.monthlyPayment,
        issueDate: loan.issueDate,
        endDate: loan.endDate || "",
        termMonths: loan.termMonths || undefined,
        paymentType: loan.paymentType || "annuity",
        contractNumber: loan.contractNumber || "",
        nextPaymentDate: loan.nextPaymentDate || "",
      });
    } else if (!open) {
      form.reset();
      setError(null);
      setPaymentDay("");
    }
  }, [loan, open, form]);

  const handleSubmit = async (data: LoanFormData) => {
    setIsSaving(true);
    setError(null);

    try {
      // Формируем дату платежа из дня месяца (всегда следующий месяц)
      let nextPaymentDate = data.nextPaymentDate;
      if (paymentDay) {
        const day = parseInt(paymentDay);
        if (day >= 1 && day <= 31) {
          const now = new Date();
          
          // Всегда используем следующий месяц
          let targetMonth = now.getMonth() + 1;
          let targetYear = now.getFullYear();
          
          if (targetMonth > 11) {
            targetMonth = 0;
            targetYear += 1;
          }
          
          // Проверяем максимальное количество дней в целевом месяце
          const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
          const validPaymentDay = Math.min(day, daysInMonth);
          
          // Формат: YYYY-MM-DD
          nextPaymentDate = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(validPaymentDay).padStart(2, '0')}`;
        }
      }
      
      const url = "/api/loans";
      const method = isEdit ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, nextPaymentDate }),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || "Не удалось сохранить кредит");
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Редактировать кредит" : "Добавить кредит"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />{error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Название кредита</Label>
              <Input type="text" placeholder="Напр., Ипотека" {...form.register("name")} disabled={isSaving} />
              {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Банк</Label>
              <Input type="text" placeholder="Напр., Сбербанк" {...form.register("bank")} disabled={isSaving} />
              {form.formState.errors.bank && <p className="text-xs text-destructive">{form.formState.errors.bank.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Сумма кредита (₽)</Label>
              <Input type="number" step="0.01" placeholder="Напр., 1500000" {...form.register("principalAmount", { valueAsNumber: true })} disabled={isSaving} />
              {form.formState.errors.principalAmount && <p className="text-xs text-destructive">{form.formState.errors.principalAmount.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Процентная ставка (%)</Label>
              <Input type="number" step="0.01" placeholder="Напр., 8.5" {...form.register("interestRate", { valueAsNumber: true })} disabled={isSaving} />
              {form.formState.errors.interestRate && <p className="text-xs text-destructive">{form.formState.errors.interestRate.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Ежемесячный платёж (₽)</Label>
              <Input type="number" step="0.01" placeholder="Напр., 28500" {...form.register("monthlyPayment", { valueAsNumber: true })} disabled={isSaving} />
              {form.formState.errors.monthlyPayment && <p className="text-xs text-destructive">{form.formState.errors.monthlyPayment.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Дата выдачи</Label>
              <Input type="date" {...form.register("issueDate")} disabled={isSaving} />
              {form.formState.errors.issueDate && <p className="text-xs text-destructive">{form.formState.errors.issueDate.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Срок кредита (месяцы)</Label>
              <Input type="number" placeholder="Автоматически" value={calculatedTermMonths || ""} disabled className="bg-muted/50" />
              <p className="text-xs text-muted-foreground">Рассчитывается из дат выдачи и окончания</p>
            </div>
            <div className="space-y-2">
              <Label>Дата окончания</Label>
              <Input type="date" {...form.register("endDate")} disabled={isSaving} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Общая сумма к оплате (₽)</Label>
              <Input type="text" placeholder="Автоматически" value={calculatedTotalAmount ? calculatedTotalAmount.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ""} disabled className="bg-muted/50" />
              <p className="text-xs text-muted-foreground">Ежемесячный платёж × Срок кредита</p>
            </div>
            <div className="space-y-2">
              {calculatedTotalAmount && form.watch("principalAmount") > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 text-amber-700 text-sm mt-6">
                  <Info className="h-4 w-4" />
                  <span>Переплата: {(calculatedTotalAmount - form.watch("principalAmount")).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽</span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>День следующего платежа</Label>
              <Input type="number" min="1" max="31" placeholder="Например, 25" value={paymentDay} onChange={(e) => setPaymentDay(e.target.value)} disabled={isSaving} />
              <p className="text-xs text-muted-foreground">День месяца (1-31). Дата будет на следующий месяц.</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 text-blue-700 text-sm mt-6">
                <Info className="h-4 w-4" /><span>Создаст напоминание за 10 дней до срока</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Тип платежа</Label>
              <Select value={form.watch("paymentType")} onValueChange={(v) => form.setValue("paymentType", v as "annuity" | "differentiated")} disabled={isSaving}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="annuity">Аннуитетный</SelectItem><SelectItem value="differentiated">Дифференцированный</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Номер договора</Label>
              <Input type="text" placeholder="Напр., ИП-2023-045678" {...form.register("contractNumber")} disabled={isSaving} />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>Отмена</Button>
            <Button type="submit" disabled={isSaving}>{isSaving ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Сохранение...</> : isEdit ? "Сохранить" : "Добавить"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
