"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Supplier } from "../types";

// =====================================================
// Курсорная пагинация для поставщиков
// =====================================================

export interface PaginationState {
  cursor: string | null;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
}

export interface UseSuppliersPaginationOptions {
  pageSize?: number;
  filters?: Record<string, unknown>;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
}

export interface UseSuppliersPaginationResult {
  suppliers: Supplier[];
  pagination: PaginationState;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  setFilters: (filters: Record<string, unknown>) => void;
  setSorting: (sortBy: string, direction: "asc" | "desc") => void;
  totalCount: number;
}

export function useSuppliersPagination(
  options: UseSuppliersPaginationOptions = {}
): UseSuppliersPaginationResult {
  const { pageSize = 50 } = options;
  
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFiltersState] = useState<Record<string, unknown>>(options.filters || {});
  const [sortBy, setSortBy] = useState(options.sortBy || "created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(options.sortDirection || "desc");
  const [pagination, setPagination] = useState<PaginationState>({
    cursor: null,
    hasMore: true,
    isLoading: true,
    isLoadingMore: false,
  });
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchSuppliers = useCallback(async (
    cursor: string | null,
    append: boolean = false
  ) => {
    // Отменяем предыдущий запрос
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setPagination(prev => ({
      ...prev,
      isLoading: !append,
      isLoadingMore: append,
    }));

    try {
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        sortBy,
        sortDirection,
        ...Object.fromEntries(
          Object.entries(filters)
            .filter(([, v]) => v !== undefined && v !== null && v !== "")
            .map(([k, v]) => [k, String(v)])
        ),
      });

      if (cursor) {
        params.set("cursor", cursor);
      }

      const response = await fetch(`/api/suppliers?${params}`, {
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error("Failed to fetch suppliers");
      }

      const data = await response.json();
      
      setSuppliers(prev => append ? [...prev, ...data.suppliers] : data.suppliers);
      setTotalCount(data.totalCount || 0);
      setPagination({
        cursor: data.nextCursor || null,
        hasMore: data.hasMore || false,
        isLoading: false,
        isLoadingMore: false,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return; // Запрос отменён
      }
      console.error("Error fetching suppliers:", error);
      setPagination(prev => ({
        ...prev,
        isLoading: false,
        isLoadingMore: false,
      }));
    }
  }, [pageSize, filters, sortBy, sortDirection]);

  // Загрузка при изменении фильтров/сортировки
  useEffect(() => {
    fetchSuppliers(null, false);
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchSuppliers]);

  const loadMore = useCallback(async () => {
    if (!pagination.hasMore || pagination.isLoadingMore) return;
    await fetchSuppliers(pagination.cursor, true);
  }, [fetchSuppliers, pagination.cursor, pagination.hasMore, pagination.isLoadingMore]);

  const refresh = useCallback(async () => {
    await fetchSuppliers(null, false);
  }, [fetchSuppliers]);

  const setFilters = useCallback((newFilters: Record<string, unknown>) => {
    setFiltersState(newFilters);
  }, []);

  const setSorting = useCallback((newSortBy: string, direction: "asc" | "desc") => {
    setSortBy(newSortBy);
    setSortDirection(direction);
  }, []);

  return {
    suppliers,
    pagination,
    loadMore,
    refresh,
    setFilters,
    setSorting,
    totalCount,
  };
}
