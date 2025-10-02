"use client";

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

export type ToastType = "success" | "error" | "info";

export type Toast = {
  id: string;
  message: string;
  type: ToastType;
  duration: number; // ms
};

export type ToastContextValue = {
  toasts: Toast[];
  show: (message: string, opts?: { type?: ToastType; duration?: number }) => void;
  hide: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Record<string, number>>({});

  const hide = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timers = timersRef.current;
    if (timers[id]) {
      window.clearTimeout(timers[id]);
      delete timers[id];
    }
  }, []);

  const show = useCallback((message: string, opts?: { type?: ToastType; duration?: number }) => {
    const id = Math.random().toString(36).slice(2);
    const toast: Toast = {
      id,
      message,
      type: opts?.type ?? "info",
      duration: opts?.duration ?? 2500,
    };
    setToasts((prev) => [...prev, toast]);

    const timeoutId = window.setTimeout(() => hide(id), toast.duration);
    timersRef.current[id] = timeoutId;
  }, [hide]);

  const value = useMemo<ToastContextValue>(() => ({ toasts, show, hide }), [toasts, show, hide]);

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
