"use client";

import { useState, useTransition, useEffect } from "react";
import TransactionsGroupedList, { type Txn, type Category, type Account } from "./TransactionsGroupedList";
import styles from "./LoadMoreButton.module.css";

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
  totalCount,
  categories,
  accounts,
  filters,
}: ClientPaginatedListProps) {
  const [transactions, setTransactions] = useState<Txn[]>(initialTransactions);
  const [offset, setOffset] = useState(initialCount);
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(false);

  // Синхронизируем state с props при обновлении через router.refresh()
  useEffect(() => {
    setTransactions(initialTransactions);
    setOffset(initialCount);
  }, [initialTransactions, initialCount]);

  const hasMore = totalCount === null || offset < totalCount;

  const loadMore = async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    try {
      // Делаем запрос к API на клиенте
      const params = new URLSearchParams({
        offset: offset.toString(),
        limit: "50",
        ...(filters.from && { from: filters.from }),
        ...(filters.to && { to: filters.to }),
        ...(filters.direction && filters.direction !== "all" && { direction: filters.direction }),
        ...(filters.accountIds?.length && { accountIds: filters.accountIds.join(",") }),
        ...(filters.categoryIds?.length && { categoryIds: filters.categoryIds.join(",") }),
        ...(filters.search && { search: filters.search }),
      });

      const response = await fetch(`/api/transactions?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to load transactions");

      const data = await response.json();
      
      startTransition(() => {
        setTransactions((prev) => [...prev, ...data.transactions]);
        setOffset((prev) => prev + data.transactions.length);
      });
    } catch (error) {
      console.error("Error loading more transactions:", error);
      alert("Ошибка при загрузке транзакций");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <TransactionsGroupedList txns={transactions} categories={categories} accounts={accounts} />
      
      {transactions.length === 0 && (
        <div style={{ color: "#888", display: "flex", alignItems: "center", gap: 10 }}>
          <span>Ничего не найдено по текущим фильтрам.</span>
          <a className={styles.lightBtn} href="/finance/transactions" style={{ textDecoration: "none" }}>
            Сбросить фильтры
          </a>
        </div>
      )}

      {hasMore && transactions.length > 0 && (
        <div className={styles.container}>
          <div className={styles.info}>
            Показано {transactions.length} из {totalCount ?? "?"} транзакций
          </div>
          <button
            onClick={loadMore}
            className={styles.button}
            disabled={isLoading || isPending}
          >
            {isLoading || isPending ? "Загрузка..." : "Загрузить ещё 50 транзакций"}
          </button>
        </div>
      )}

      {!hasMore && transactions.length > 0 && (
        <div className={styles.info}>
          Показаны все транзакции ({transactions.length})
        </div>
      )}
    </>
  );
}
