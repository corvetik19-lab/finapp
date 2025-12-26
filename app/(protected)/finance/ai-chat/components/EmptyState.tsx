"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Sparkles, 
  Receipt, 
  TrendingUp, 
  Target,
  Wallet
} from "lucide-react";

interface EmptyStateProps {
  onSendMessage: (message: string) => void;
}

const suggestions = [
  {
    icon: Wallet,
    title: "Баланс",
    description: "Проверить баланс счетов",
    prompt: "Сколько у меня денег на счетах?",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: Receipt,
    title: "Расходы",
    description: "Анализ за месяц",
    prompt: "Покажи мои расходы за этот месяц по категориям",
    color: "from-orange-500 to-red-500",
  },
  {
    icon: TrendingUp,
    title: "Транзакция",
    description: "Записать расход",
    prompt: "Потратил 1500 рублей на продукты",
    color: "from-green-500 to-emerald-500",
  },
  {
    icon: Target,
    title: "Планы",
    description: "Создать цель",
    prompt: "Создай план накопить 100000 на отпуск",
    color: "from-purple-500 to-pink-500",
  },
];

const quickActions = [
  { label: "💰 Мои счета", prompt: "Покажи мои счета" },
  { label: "📊 Аналитика", prompt: "Дай финансовую сводку за месяц" },
  { label: "💳 Последние траты", prompt: "Покажи последние 10 транзакций" },
  { label: "🎯 Мои бюджеты", prompt: "Покажи мои бюджеты" },
];

export default function EmptyState({ onSendMessage }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white mb-4 shadow-lg">
          <Sparkles className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Финансовый AI-ассистент</h2>
        <p className="text-muted-foreground max-w-md">
          Управляйте финансами через естественный разговор. 
          Я могу записывать транзакции, показывать аналитику и помогать с планированием.
        </p>
      </div>

      {/* Suggestion cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-3xl mb-6">
        {suggestions.map((item, index) => (
          <Card
            key={index}
            className="cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5 border-muted"
            onClick={() => onSendMessage(item.prompt)}
          >
            <CardContent className="p-4">
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center text-white mb-3 shadow-sm`}
              >
                <item.icon className="w-5 h-5" />
              </div>
              <h3 className="font-medium text-sm mb-1">{item.title}</h3>
              <p className="text-xs text-muted-foreground">{item.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2 justify-center">
        {quickActions.map((action, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => onSendMessage(action.prompt)}
          >
            {action.label}
          </Button>
        ))}
      </div>

      {/* Tip */}
      <p className="text-xs text-muted-foreground mt-8 text-center max-w-md">
        💡 Пишите естественным языком — например: «Потратил 500 на такси» или «Сколько я потратил в октябре?»
      </p>
    </div>
  );
}
