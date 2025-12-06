"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loanRepaymentSchema, type LoanRepaymentData } from "@/lib/loans/schema";
import type { Loan } from "@/lib/loans/types";
import { formatMoney } from "@/lib/utils/format";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Info, Loader2 } from "lucide-react";

type LoanRepayModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  loans: Loan[];
};

export default function LoanRepayModal({ open, onClose, onSuccess, loans }: LoanRepayModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLoanId, setSelectedLoanId] = useState<string>("");

  const form = useForm<LoanRepaymentData>({
    resolver: zodResolver(loanRepaymentSchema),
    defaultValues: {
      loanId: "",
      amount: 0,
      commission: 0,
      paymentDate: new Date().toISOString().slice(0, 10),
      note: "",
    },
  });

  const selectedLoan = loans.find(l => l.id === selectedLoanId);

  // Автоматическое заполнение суммы при выборе кредита
  const handleLoanChange = (loanId: string) => {
    setSelectedLoanId(loanId);
    form.setValue("loanId", loanId);
    
    const loan = loans.find(l => l.id === loanId);
    if (loan) {
      // Автоматически подставляем ежемесячный платёж
      form.setValue("amount", loan.monthlyPayment);
    }
  };

  const handleSubmit = async (data: LoanRepaymentData) => {
    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/loans/repay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || "Не удалось погасить кредит");
      }

      onSuccess();
      onClose();
      form.reset();
      setSelectedLoanId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setIsSaving(false);
    }
  };

  const activeLoans = loans.filter(l => l.status === "active");

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Погасить кредит</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />{error}
            </div>
          )}

          {activeLoans.length === 0 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 text-blue-700 text-sm">
              <Info className="h-4 w-4" />Нет активных кредитов для погашения
            </div>
          )}

          {activeLoans.length > 0 && (
            <>
              <div className="space-y-2">
                <Label>Кредит</Label>
                <Select value={selectedLoanId} onValueChange={handleLoanChange} disabled={isSaving}>
                  <SelectTrigger><SelectValue placeholder="Выберите кредит" /></SelectTrigger>
                  <SelectContent>{activeLoans.map((loan) => <SelectItem key={loan.id} value={loan.id}>{loan.name} — {loan.bank}</SelectItem>)}</SelectContent>
                </Select>
                {form.formState.errors.loanId && <p className="text-xs text-destructive">{form.formState.errors.loanId.message}</p>}
              </div>

              {selectedLoan && (
                <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Остаток долга:</span><strong className="text-red-600">{formatMoney(selectedLoan.remainingDebt * 100, selectedLoan.currency)}</strong></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Ежемесячный платёж:</span><strong>{formatMoney(selectedLoan.monthlyPayment * 100, selectedLoan.currency)}</strong></div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Сумма платежа (₽)</Label>
                <Input type="number" step="0.01" placeholder="Напр., 28500" {...form.register("amount", { valueAsNumber: true })} disabled={isSaving} />
                {form.formState.errors.amount && <p className="text-xs text-destructive">{form.formState.errors.amount.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Комиссия банка (₽)</Label>
                <Input type="number" step="0.01" placeholder="Напр., 100 (необязательно)" {...form.register("commission", { valueAsNumber: true })} disabled={isSaving} />
                {form.formState.errors.commission && <p className="text-xs text-destructive">{form.formState.errors.commission.message}</p>}
                <p className="text-xs text-muted-foreground">Укажите комиссию, если банк взимает плату за досрочное погашение</p>
              </div>

              <div className="space-y-2">
                <Label>Дата платежа</Label>
                <Input type="date" {...form.register("paymentDate")} disabled={isSaving} />
                {form.formState.errors.paymentDate && <p className="text-xs text-destructive">{form.formState.errors.paymentDate.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Примечание</Label>
                <Textarea rows={3} placeholder="Дополнительная информация..." {...form.register("note")} disabled={isSaving} />
              </div>

              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>Отмена</Button>
                <Button type="submit" disabled={isSaving}>{isSaving ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Сохранение...</> : "Погасить"}</Button>
              </DialogFooter>
            </>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
