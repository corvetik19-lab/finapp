"use client";

import { useState, FormEvent, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import type { CreditCard } from "./CreditCardsList";

export type CreateCreditCardModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingCard?: CreditCard | null;
};

export default function CreateCreditCardModal({
  isOpen,
  onClose,
  onSuccess,
  editingCard,
}: CreateCreditCardModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    credit_limit: "",
    balance: "",
    interest_rate: "",
    grace_period: "",
    payment_day: "", // День платежа (1-31)
    min_payment: "",
  });

  const isEditMode = Boolean(editingCard);

  // Заполняем форму при редактировании
  useEffect(() => {
    if (editingCard && isOpen) {
      // Извлекаем день из даты (если есть)
      let paymentDay = "";
      if (editingCard.nextPaymentDate) {
        const date = new Date(editingCard.nextPaymentDate);
        paymentDay = date.getDate().toString();
      }
      
      // Вычисляем задолженность из доступного остатка
      const debt = editingCard.debt ?? (editingCard.limit - editingCard.available);
      
      setFormData({
        name: editingCard.bank,
        credit_limit: (editingCard.limit / 100).toString(),
        balance: (debt / 100).toString(), // показываем задолженность
        interest_rate: editingCard.interestRate ? editingCard.interestRate.toString() : "",
        grace_period: editingCard.gracePeriod ? editingCard.gracePeriod.toString() : "",
        payment_day: paymentDay,
        min_payment: (editingCard.minPayment / 100).toString(),
      });
    } else if (!editingCard && isOpen) {
      setFormData({
        name: "",
        credit_limit: "",
        balance: "",
        interest_rate: "",
        grace_period: "",
        payment_day: "",
        min_payment: "",
      });
    }
  }, [editingCard, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const creditLimitMinor = Math.round(parseFloat(formData.credit_limit) * 100);
      // balance - это задолженность, которую вводит пользователь
      // Нужно конвертировать в доступный остаток: available = limit - debt
      const debtMinor = formData.balance ? Math.round(parseFloat(formData.balance) * 100) : 0;
      const balanceMinor = creditLimitMinor - debtMinor; // доступный остаток
      const interestRate = formData.interest_rate ? parseFloat(formData.interest_rate) : null;
      const gracePeriod = formData.grace_period ? parseInt(formData.grace_period) : null;
      const minPaymentMinor = formData.min_payment ? Math.round(parseFloat(formData.min_payment) * 100) : 0;

      // Формируем дату платежа из дня месяца (всегда следующий месяц)
      let nextPaymentDate = null;
      if (formData.payment_day) {
        const paymentDay = parseInt(formData.payment_day);
        if (paymentDay >= 1 && paymentDay <= 31) {
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
          const validPaymentDay = Math.min(paymentDay, daysInMonth);
          
          // Формат: YYYY-MM-DD (месяцы в JavaScript 0-based, но в дате 1-based)
          nextPaymentDate = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(validPaymentDay).padStart(2, '0')}`;
        }
      }

      const url = isEditMode ? `/api/credit-cards/${editingCard?.id}` : "/api/credit-cards";
      const method = isEditMode ? "PATCH" : "POST";

      const bodyData: Record<string, unknown> = {
        name: formData.name,
        credit_limit: creditLimitMinor,
        interest_rate: interestRate,
        grace_period: gracePeriod,
        next_payment_date: nextPaymentDate,
        min_payment: minPaymentMinor,
      };

      // Баланс отправляем только при создании
      if (!isEditMode) {
        bodyData.balance = balanceMinor;
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData),
      });

      if (!response.ok) {
        const data = await response.json();
        const errorMessage = data.details 
          ? `${data.error}: ${data.details}`
          : data.error || `Ошибка при ${isEditMode ? "обновлении" : "создании"} карты`;
        throw new Error(errorMessage);
      }

      setFormData({
        name: "",
        credit_limit: "",
        balance: "",
        interest_rate: "",
        grace_period: "",
        payment_day: "",
        min_payment: "",
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving) {
      onClose();
      setError(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{isEditMode ? "Редактировать кредитную карту" : "Добавить кредитную карту"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 rounded bg-destructive/10 text-destructive text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label htmlFor="card-name">Название <span className="text-destructive">*</span></Label><Input id="card-name" placeholder="Тинькофф Платинум" value={formData.name} onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))} required disabled={isSaving} /></div>
            <div className="space-y-2"><Label htmlFor="card-limit">Лимит (₽) <span className="text-destructive">*</span></Label><Input id="card-limit" type="number" step="0.01" placeholder="250000" value={formData.credit_limit} onChange={(e) => setFormData((prev) => ({ ...prev, credit_limit: e.target.value }))} required disabled={isSaving} /></div>
            <div className="space-y-2"><Label htmlFor="card-balance">Задолженность (₽)</Label><Input id="card-balance" type="number" step="0.01" min="0" placeholder="15000" value={formData.balance} onChange={(e) => setFormData((prev) => ({ ...prev, balance: e.target.value }))} disabled={isEditMode || isSaving} />{isEditMode && <p className="text-xs text-muted-foreground">Изменяется через транзакции</p>}</div>
            <div className="space-y-2"><Label htmlFor="card-rate">Ставка (%)</Label><Input id="card-rate" type="number" step="0.1" placeholder="25.9" value={formData.interest_rate} onChange={(e) => setFormData((prev) => ({ ...prev, interest_rate: e.target.value }))} disabled={isSaving} /></div>
            <div className="space-y-2"><Label htmlFor="card-grace">Льготный период (дн.)</Label><Input id="card-grace" type="number" placeholder="55" value={formData.grace_period} onChange={(e) => setFormData((prev) => ({ ...prev, grace_period: e.target.value }))} disabled={isSaving} /></div>
            <div className="space-y-2"><Label htmlFor="card-payment-day">День платежа</Label><Input id="card-payment-day" type="number" min="1" max="31" placeholder="25" value={formData.payment_day} onChange={(e) => setFormData((prev) => ({ ...prev, payment_day: e.target.value }))} disabled={isSaving} /><p className="text-xs text-muted-foreground">День месяца (1-31)</p></div>
            <div className="col-span-2 space-y-2"><Label htmlFor="card-min-payment">Мин. платеж (₽)</Label><Input id="card-min-payment" type="number" step="0.01" min="0" placeholder="1000" value={formData.min_payment} onChange={(e) => setFormData((prev) => ({ ...prev, min_payment: e.target.value }))} disabled={isSaving} /></div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSaving}>Отмена</Button>
            <Button type="submit" disabled={isSaving}>{isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}{isSaving ? (isEditMode ? "Сохранение..." : "Создание...") : (isEditMode ? "Сохранить" : "Создать")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
