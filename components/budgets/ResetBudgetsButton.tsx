"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast/ToastContext";
import { Button } from "@/components/ui/button";
import { RotateCcw, Loader2 } from "lucide-react";
import { resetAllBudgets } from "@/app/(protected)/finance/budgets/actions";

export default function ResetBudgetsButton() {
  const router = useRouter();
  const { show: showToast } = useToast();
  const [isResetting, setIsResetting] = useState(false);

  const handleReset = async () => {
    if (!window.confirm("Сбросить все бюджеты на текущий месяц?\n\nЭто обновит период для всех бюджетов и расчёт начнётся с начала текущего месяца.")) {
      return;
    }

    setIsResetting(true);
    try {
      const result = await resetAllBudgets();
      showToast(`✅ Бюджеты сброшены на ${result.period.start} — ${result.period.end}`, { type: "success" });
      router.refresh();
    } catch (error) {
      console.error("Reset error:", error);
      const message = error instanceof Error ? error.message : "Неизвестная ошибка";
      showToast(`❌ Ошибка: ${message}`, { type: "error" });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleReset}
      disabled={isResetting}
      title="Сбросить все бюджеты на текущий месяц"
    >
      {isResetting ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <RotateCcw className="h-4 w-4 mr-2" />
      )}
      {isResetting ? "Сброс..." : "Обнулить"}
    </Button>
  );
}
