"use client";

import { useState, useEffect } from "react";
import TransactionsGroupedList, { type Txn, type Category, type Account } from "./TransactionsGroupedList";
import { Button } from "@/components/ui/button";

interface ClientPaginatedListProps {
  initialTransactions: Txn[];
  initialCount: number;
  totalCount: number | null;
  categories: Category[];
  accounts: Account[];
  filters: {
    from?: string;
    to?: string;
    direction?: string;
    accountIds?: string[];
    categoryIds?: string[];
    search?: string;
  };
}

export default function ClientPaginatedList({
  initialTransactions,
  initialCount,
  categories,
  accounts,
}: ClientPaginatedListProps) {
  const [transactions, setTransactions] = useState<Txn[]>(initialTransactions);

  // Синхронизируем state с props при обновлении через router.refresh()
  useEffect(() => {
    setTransactions(initialTransactions);
  }, [initialTransactions, initialCount]);

  return (
    <>
      <TransactionsGroupedList txns={transactions} categories={categories} accounts={accounts} />
      
      {transactions.length === 0 && (
        <div className="flex items-center gap-3 text-muted-foreground">
          <span>Ничего не найдено по текущим фильтрам.</span>
          <Button variant="link" asChild className="p-0 h-auto"><a href="/finance/transactions">Сбросить фильтры</a></Button>
        </div>
      )}

      {transactions.length > 0 && (
        <div className="text-sm text-muted-foreground text-center py-4">
          Всего транзакций: {transactions.length}
        </div>
      )}
    </>
  );
}
