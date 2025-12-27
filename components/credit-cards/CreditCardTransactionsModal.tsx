"use client";

import { useEffect, useState, useCallback } from "react";
import { formatMoney } from "@/lib/utils/format";
import type { CreditCard } from "./CreditCardsList";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CreditCard as CreditCardIcon, AlertCircle, Receipt, ArrowDown, ArrowUp, ArrowLeftRight, Loader2 } from "lucide-react";

type Transaction = {
  id: string;
  direction: "income" | "expense" | "transfer";
  amount: number;
  currency: string;
  occurred_at: string;
  note: string | null;
  counterparty: string | null;
  category_name?: string | null;
  transfer_from_account_id?: string | null;
  transfer_to_account_id?: string | null;
  transfer_from_account_name?: string | null;
  transfer_to_account_name?: string | null;
  principal_amount?: number | null; // основной долг
  interest_amount?: number | null;  // проценты
};

type CreditCardTransactionsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  card: CreditCard;
};

export default function CreditCardTransactionsModal({
  isOpen,
  onClose,
  card,
}: CreditCardTransactionsModalProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTransactions = useCallback(async () => {
    if (!card) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/credit-cards/${card.id}/transactions`);
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
  }, [card]);

  useEffect(() => {
    if (isOpen && card) {
      loadTransactions();
    }
  }, [isOpen, card, loadTransactions]);

  if (!isOpen) return null;

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><CreditCardIcon className="h-5 w-5" />Транзакции: {card.bank}</DialogTitle>
        </DialogHeader>

        <div className="max-h-[400px] overflow-y-auto space-y-2">
          {isLoading && <div className="flex flex-col items-center py-8"><Loader2 className="h-8 w-8 animate-spin" /><p className="text-muted-foreground mt-2">Загрузка...</p></div>}
          {error && <div className="flex items-center gap-2 text-destructive p-4 bg-destructive/10 rounded-lg"><AlertCircle className="h-5 w-5" />{error}</div>}
          {!isLoading && !error && transactions.length === 0 && <div className="text-center py-8"><Receipt className="h-12 w-12 mx-auto text-muted-foreground" /><p className="mt-2 text-muted-foreground">Нет транзакций</p></div>}
          
          {!isLoading && !error && transactions.length > 0 && transactions.map((txn) => {
            // Проверяем, является ли это пополнением карты (погашение долга)
            const isCardRepayment = txn.direction === 'income' || 
              (txn.direction === 'transfer' && txn.transfer_to_account_id === card.id);
            const hasPrincipalInterest = isCardRepayment && (txn.principal_amount || txn.interest_amount);
            
            return (
              <div key={txn.id} className={`p-3 rounded-lg border ${txn.direction === 'income' ? 'bg-green-50 border-green-200' : txn.direction === 'transfer' ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${txn.direction === 'income' ? 'bg-green-100' : txn.direction === 'transfer' ? 'bg-blue-100' : 'bg-red-100'}`}>
                    {txn.direction === 'income' ? <ArrowDown className="h-4 w-4 text-green-600" /> : txn.direction === 'transfer' ? <ArrowLeftRight className="h-4 w-4 text-blue-600" /> : <ArrowUp className="h-4 w-4 text-red-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{txn.direction === 'transfer' ? (txn.transfer_from_account_id === card.id ? `→ ${txn.transfer_to_account_name || '?'}` : `← ${txn.transfer_from_account_name || '?'}`) : txn.counterparty || txn.note || 'Без описания'}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(txn.occurred_at)}{txn.category_name && ` • ${txn.category_name}`}</p>
                  </div>
                  <span className={`font-bold ${txn.direction === 'income' ? 'text-green-600' : txn.direction === 'transfer' ? 'text-blue-600' : 'text-red-600'}`}>
                    {txn.direction === 'income' ? '−' : txn.direction === 'transfer' ? '' : '+'}{formatMoney(txn.amount, txn.currency)}
                  </span>
                </div>
                {/* Разбивка платежа на основной долг и проценты */}
                {hasPrincipalInterest && (
                  <div className="mt-2 pt-2 border-t border-green-200 text-xs space-y-1">
                    {txn.principal_amount && txn.principal_amount > 0 && (
                      <div className="flex justify-between text-green-700">
                        <span>Основной долг:</span>
                        <span>{formatMoney(txn.principal_amount, txn.currency)}</span>
                      </div>
                    )}
                    {txn.interest_amount && txn.interest_amount > 0 && (
                      <div className="flex justify-between text-amber-700">
                        <span>Проценты:</span>
                        <span>{formatMoney(txn.interest_amount, txn.currency)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <DialogFooter><Button variant="outline" onClick={onClose}>Закрыть</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
