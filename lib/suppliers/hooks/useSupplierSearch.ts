"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Supplier } from "../types";

// =====================================================
// Debounced full-text search для поставщиков
// =====================================================

export interface UseSupplierSearchOptions {
  debounceMs?: number;
  minQueryLength?: number;
  limit?: number;
}

export interface UseSupplierSearchResult {
  query: string;
  setQuery: (query: string) => void;
  results: Supplier[];
  isSearching: boolean;
  hasSearched: boolean;
  clearSearch: () => void;
}

export function useSupplierSearch(
  options: UseSupplierSearchOptions = {}
): UseSupplierSearchResult {
  const { debounceMs = 300, minQueryLength = 2, limit = 20 } = options;
  
  const [query, setQueryState] = useState("");
  const [results, setResults] = useState<Supplier[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < minQueryLength) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    // Отменяем предыдущий запрос
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsSearching(true);

    try {
      const params = new URLSearchParams({
        search: searchQuery,
        limit: limit.toString(),
      });

      const response = await fetch(`/api/suppliers/search?${params}`, {
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error("Search failed");
      }

      const data = await response.json();
      setResults(data.suppliers || []);
      setHasSearched(true);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return; // Запрос отменён
      }
      console.error("Search error:", error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [minQueryLength, limit]);

  const setQuery = useCallback((newQuery: string) => {
    setQueryState(newQuery);

    // Отменяем предыдущий таймер
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Если запрос пустой - очищаем результаты сразу
    if (!newQuery.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    // Debounce
    debounceTimerRef.current = setTimeout(() => {
      performSearch(newQuery.trim());
    }, debounceMs);
  }, [debounceMs, performSearch]);

  const clearSearch = useCallback(() => {
    setQueryState("");
    setResults([]);
    setHasSearched(false);
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    query,
    setQuery,
    results,
    isSearching,
    hasSearched,
    clearSearch,
  };
}

// =====================================================
// Hook для поиска дубликатов по ИНН
// =====================================================

export interface UseDuplicateCheckResult {
  checkDuplicate: (inn: string) => Promise<Supplier | null>;
  isChecking: boolean;
  duplicate: Supplier | null;
  clearDuplicate: () => void;
}

export function useDuplicateCheck(): UseDuplicateCheckResult {
  const [isChecking, setIsChecking] = useState(false);
  const [duplicate, setDuplicate] = useState<Supplier | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const checkDuplicate = useCallback(async (inn: string): Promise<Supplier | null> => {
    if (!inn || inn.length < 10) {
      setDuplicate(null);
      return null;
    }

    // Отменяем предыдущий запрос
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsChecking(true);

    try {
      const response = await fetch(`/api/suppliers/check-duplicate?inn=${inn}`, {
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error("Check failed");
      }

      const data = await response.json();
      setDuplicate(data.supplier || null);
      return data.supplier || null;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return null;
      }
      console.error("Duplicate check error:", error);
      return null;
    } finally {
      setIsChecking(false);
    }
  }, []);

  const clearDuplicate = useCallback(() => {
    setDuplicate(null);
  }, []);

  return {
    checkDuplicate,
    isChecking,
    duplicate,
    clearDuplicate,
  };
}
