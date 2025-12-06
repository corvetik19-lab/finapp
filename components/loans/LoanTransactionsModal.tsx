"use client";

import { useEffect, useState } from "react";
import { formatMoney } from "@/lib/utils/format";
import type { Loan } from "@/lib/loans/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Landmark, ArrowUp, ArrowDown, Receipt, Loader2, AlertCircle, Trash2 } from "lucide-react";

type Transaction = {
  id: string;
  direction: "income" | "expense" | "transfer";
  amount: number;
  currency: string;
  occurred_at: string;
  note: string | null;
  counterparty: string | null;
  category_name?: string | null;
};

type LoanTransactionsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  loan: Loan;
};

export default function LoanTransactionsModal({
  isOpen,
  onClose,
  loan,
}: LoanTransactionsModalProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && loan) {
      loadTransactions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, loan]);

  const loadTransactions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/loans/${loan.id}/transactions`);
      if (!response.ok) {
        throw new Error("Не удалось загрузить транзакции");
      }
      const data = await response.json();
      setTransactions(data.transactions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки транзакций");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (transactionId: string) => {
    if (!confirm("Удалить эту транзакцию? Это отменит погашение кредита.")) {
      return;
    }

    setDeletingId(transactionId);
    try {
      const formData = new FormData();
      formData.append("id", transactionId);

      const response = await fetch("/api/transactions/delete", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Не удалось удалить транзакцию");
      }

      // Обновляем список транзакций
      await loadTransactions();
      
      // Перезагружаем страницу чтобы обновить баланс кредита
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Ошибка удаления транзакции");
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {
      return dateString;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Landmark className="h-5 w-5" />Транзакции: {loan.name} ({loan.bank})</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-2" /><p>Загрузка транзакций...</p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />{error}
            </div>
          )}

          {!isLoading && !error && transactions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Receipt className="h-12 w-12 mb-3 opacity-50" /><p>Нет транзакций по этому кредиту</p>
            </div>
          )}

          {!isLoading && !error && transactions.length > 0 && (
            <div className="space-y-2">
              {transactions.map((txn) => (
                <div key={txn.id} className={cn("flex items-center gap-3 p-3 rounded-lg border", txn.direction === "income" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200")}>
                  <div className={cn("p-2 rounded-full", txn.direction === "income" ? "bg-green-100" : "bg-red-100")}>
                    {txn.direction === "income" ? <ArrowDown className="h-4 w-4 text-green-600" /> : <ArrowUp className="h-4 w-4 text-red-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{txn.counterparty || txn.note || "Без описания"}</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatDate(txn.occurred_at)}</span>
                      {txn.category_name && <span className="px-1.5 py-0.5 rounded bg-muted">{txn.category_name}</span>}
                    </div>
                  </div>
                  <div className={cn("font-bold", txn.direction === "income" ? "text-green-600" : "text-red-600")}>
                    {txn.direction === "income" ? "+" : "−"}{formatMoney(txn.amount, txn.currency)}
                  </div>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(txn.id)} disabled={deletingId === txn.id}>
                    {deletingId === txn.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter><Button variant="outline" onClick={onClose}>Закрыть</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
