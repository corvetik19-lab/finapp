"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { X, Check, ArrowRight, PartyPopper } from "lucide-react";

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  action?: string;
  icon: string;
}

export default function FirstStepsChecklist() {
  const router = useRouter();
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [isVisible, setIsVisible] = useState(true);
  const [loading, setLoading] = useState(true);

  const loadChecklist = useCallback(async () => {
    try {
      const res = await fetch("/api/onboarding/checklist");
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || getDefaultItems());
        setIsVisible(!data.all_completed);
      } else {
        setItems(getDefaultItems());
      }
    } catch (error) {
      console.error("Failed to load checklist:", error);
      setItems(getDefaultItems());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChecklist();
  }, [loadChecklist]);

  function getDefaultItems(): ChecklistItem[] {
    return [
      {
        id: "add_account",
        title: "Добавить счёт",
        description: "Создайте первый счёт (наличные, карта или банк)",
        completed: false,
        action: "/finance/cards",
        icon: "💳",
      },
      {
        id: "add_transaction",
        title: "Добавить транзакцию",
        description: "Запишите первый доход или расход",
        completed: false,
        action: "/finance/transactions",
        icon: "💰",
      },
      {
        id: "create_category",
        title: "Создать категорию",
        description: "Настройте категории под свои нужды",
        completed: false,
        action: "/finance/settings",
        icon: "📂",
      },
      {
        id: "set_budget",
        title: "Установить бюджет",
        description: "Создайте первый бюджет для контроля трат",
        completed: false,
        action: "/finance/budgets",
        icon: "🎯",
      },
      {
        id: "try_ai",
        title: "Попробовать AI",
        description: "Задайте вопрос AI помощнику о ваших финансах",
        completed: false,
        action: "/finance/ai-chat",
        icon: "🤖",
      },
    ];
  }

  async function markCompleted(itemId: string) {
    try {
      await fetch("/api/onboarding/checklist", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: itemId, completed: true }),
      });

      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, completed: true } : item
        )
      );

      // Проверяем, все ли выполнено
      const allCompleted = items.every(
        (item) => item.id === itemId || item.completed
      );
      if (allCompleted) {
        setTimeout(() => setIsVisible(false), 2000);
      }
    } catch (error) {
      console.error("Failed to mark completed:", error);
    }
  }

  function handleAction(item: ChecklistItem) {
    if (item.action) {
      router.push(item.action);
    }
  }

  function dismiss() {
    setIsVisible(false);
    localStorage.setItem("finapp_checklist_dismissed", "true");
  }

  if (loading || !isVisible) {
    return null;
  }

  const completedCount = items.filter((item) => item.completed).length;
  const progress = (completedCount / items.length) * 100;
  const allCompleted = completedCount === items.length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div><CardTitle className="text-base">{allCompleted ? "🎉 Отличная работа!" : "🚀 Первые шаги"}</CardTitle><p className="text-sm text-muted-foreground">{allCompleted ? "Вы освоили основы Finappka!" : `${completedCount} из ${items.length} выполнено`}</p></div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={dismiss}><X className="h-4 w-4" /></Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={progress} className="h-2" />
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className={cn("flex items-start gap-3 p-3 rounded-lg border", item.completed && "bg-muted/50")}>
              <div className="flex-shrink-0 mt-0.5">
                {item.completed ? <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center"><Check className="h-3 w-3 text-white" /></div> : <Checkbox checked={false} onCheckedChange={() => markCompleted(item.id)} />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2"><span>{item.icon}</span><h4 className={cn("font-medium", item.completed && "line-through text-muted-foreground")}>{item.title}</h4></div>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
              {!item.completed && item.action && <Button variant="outline" size="sm" onClick={() => handleAction(item)}>Перейти<ArrowRight className="h-4 w-4 ml-1" /></Button>}
            </div>
          ))}
        </div>
        {allCompleted && <div className="flex items-center gap-2 p-4 rounded-lg bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300"><PartyPopper className="h-5 w-5" /><p>Теперь вы готовы эффективно управлять финансами!</p></div>}
      </CardContent>
    </Card>
  );
}
