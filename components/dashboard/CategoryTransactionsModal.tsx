"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { formatMoney } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import type { CategoryTransactionItem } from "@/lib/dashboard/category-management";

export type CategoryTransactionsModalProps = {
  open: boolean;
  onClose: () => void;
  categoryName: string | null;
  currency: string;
  transactions: CategoryTransactionItem[];
  loading: boolean;
  error: string | null;
};

export default function CategoryTransactionsModal({
  open,
  onClose,
  categoryName,
  currency,
  transactions,
  loading,
  error,
}: CategoryTransactionsModalProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Транзакции категории{categoryName && <Badge variant="secondary" className="ml-2">{categoryName}</Badge>}</DialogTitle></DialogHeader>
        <div className="max-h-96 overflow-y-auto">
          {loading && <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /><span className="ml-2">Загрузка...</span></div>}
          {error && <div className="text-destructive text-sm p-3 bg-destructive/10 rounded">{error}</div>}
          {!loading && !error && transactions.length === 0 && <div className="text-center text-muted-foreground py-8">Нет транзакций за выбранный период.</div>}
          {!loading && !error && transactions.length > 0 && (
            <ul className="space-y-2">
              {transactions.map((item) => (
                <li key={item.id} className="p-3 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{new Date(item.occurredAt).toLocaleString("ru-RU")}</span>
                    <span className={cn("font-semibold", item.direction === "income" ? "text-green-600" : item.direction === "expense" ? "text-red-600" : "")}>{item.direction === "income" ? "+" : item.direction === "expense" ? "−" : ""}{formatMoney(item.amountMinor, item.currency || currency)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-sm"><span>{item.counterparty || item.note || "Без описания"}</span>{item.accountName && <Badge variant="outline" className="text-xs">{item.accountName}</Badge>}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
