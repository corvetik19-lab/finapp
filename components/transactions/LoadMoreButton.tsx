"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import styles from "./LoadMoreButton.module.css";

interface LoadMoreButtonProps {
  currentCount: number;
  totalCount: number | null;
  limit: number;
}

export default function LoadMoreButton({ currentCount, totalCount, limit }: LoadMoreButtonProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  
  // Максимальный лимит 150 транзакций чтобы избежать timeout
  const MAX_LIMIT = 150;
  const hasMore = (totalCount === null || currentCount < totalCount) && limit < MAX_LIMIT;
  
  const handleLoadMore = () => {
    const params = new URLSearchParams(searchParams.toString());
    const increment = 25; // Уменьшили до 25 для стабильности
    const newLimit = Math.min(limit + increment, MAX_LIMIT); // Не больше 150
    params.set("limit", newLimit.toString());
    
    startTransition(() => {
      router.push(`/finance/transactions?${params.toString()}`, { scroll: false });
    });
  };

  if (!hasMore) {
    return (
      <div className={styles.info}>
        {limit >= MAX_LIMIT 
          ? `Показано максимум ${currentCount} транзакций. Используйте фильтры для уточнения.`
          : `Показаны все транзакции (${currentCount})`}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.info}>
        Показано {currentCount} из {totalCount ?? "?"} транзакций
      </div>
      <button 
        onClick={handleLoadMore} 
        className={styles.button}
        disabled={isPending}
      >
        {isPending ? "Загрузка..." : "Загрузить ещё 25 транзакций"}
      </button>
    </div>
  );
}
