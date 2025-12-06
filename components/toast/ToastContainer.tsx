"use client";

import React from "react";
import { useToast } from "./ToastContext";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

const typeStyles = {
  success: "bg-green-500 text-white",
  error: "bg-destructive text-destructive-foreground",
  info: "bg-primary text-primary-foreground",
};

export default function ToastContainer() {
  const { toasts, hide } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2" aria-live="polite" aria-atomic>
      {toasts.map((t) => (
        <div key={t.id} className={cn("flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg min-w-[280px] animate-in slide-in-from-right", typeStyles[t.type])} role="status">
          <span className="flex-1 text-sm font-medium">{t.message}</span>
          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-70 hover:opacity-100 hover:bg-transparent" aria-label="Закрыть" onClick={() => hide(t.id)}><X className="h-4 w-4" /></Button>
        </div>
      ))}
    </div>
  );
}
