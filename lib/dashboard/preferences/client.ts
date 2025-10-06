"use client";

import { useCallback, useEffect, useState } from "react";

import type { CategoryWidgetPreferencesState, WidgetVisibilityState } from "./shared";

const DEFAULT_STATE: CategoryWidgetPreferencesState = { visibleIds: [] };

export function useCategoryPreferences(initial: CategoryWidgetPreferencesState) {
  const [state, setState] = useState<CategoryWidgetPreferencesState>(() =>
    initial.visibleIds.length > 0 ? initial : DEFAULT_STATE
  );
  const [isDirty, setDirty] = useState(false);

  useEffect(() => {
    if (!isDirty && initial.visibleIds.length > 0) {
      setState(initial);
    }
  }, [initial.visibleIds, initial, isDirty]);

  const update = useCallback((updater: (prev: CategoryWidgetPreferencesState) => CategoryWidgetPreferencesState) => {
    setState((prev) => {
      const next = updater(prev);
      if (next.visibleIds !== prev.visibleIds) {
        setDirty(true);
      }
      return next;
    });
  }, []);

  const resetDirty = useCallback(() => setDirty(false), []);

  return { state, setState, update, isDirty, resetDirty };
}

// Функция для сохранения настроек видимости виджетов на клиенте
export async function saveWidgetVisibility(state: WidgetVisibilityState): Promise<void> {
  const response = await fetch("/api/widget-visibility", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(state),
  });

  if (!response.ok) {
    throw new Error("Failed to save widget visibility");
  }
}
