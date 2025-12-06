"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronDown } from "lucide-react";

interface LoadMoreButtonProps {
  currentCount: number;
  totalCount: number | null;
  limit: number;
}

export default function LoadMoreButton({ currentCount, totalCount, limit }: LoadMoreButtonProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  
  const MAX_LIMIT = 150;
  const hasMore = (totalCount === null || currentCount < totalCount) && limit < MAX_LIMIT;
  
  const handleLoadMore = () => {
    const params = new URLSearchParams(searchParams.toString());
    const newLimit = Math.min(limit + 25, MAX_LIMIT);
    params.set("limit", newLimit.toString());
    startTransition(() => {
      router.push(`/finance/transactions?${params.toString()}`, { scroll: false });
    });
  };

  if (!hasMore) {
    return (
      <div className="text-center text-sm text-muted-foreground py-4">
        {limit >= MAX_LIMIT 
          ? `Показано максимум ${currentCount} транзакций. Используйте фильтры для уточнения.`
          : `Показаны все транзакции (${currentCount})`}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 py-4">
      <div className="text-sm text-muted-foreground">Показано {currentCount} из {totalCount ?? "?"} транзакций</div>
      <Button variant="outline" onClick={handleLoadMore} disabled={isPending}>
        {isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ChevronDown className="h-4 w-4 mr-1" />}
        {isPending ? "Загрузка..." : "Загрузить ещё 25"}
      </Button>
    </div>
  );
}
