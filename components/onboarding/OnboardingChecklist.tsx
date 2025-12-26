"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { X, ChevronUp, ChevronDown, Check, ArrowRight, PartyPopper, Lightbulb } from "lucide-react";

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  link?: string;
  completed: boolean;
}

/**
 * Чек-лист "Первые шаги" для новых пользователей
 * Показывается на дашборде пока не выполнены все пункты
 */
export default function OnboardingChecklist() {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const checkTourSettings = async () => {
      try {
        // Проверяем настройки тура из API
        const response = await fetch('/api/settings/tour');
        if (response.ok) {
          const settings = await response.json();
          
          // Если туры отключены глобально - не показываем чек-лист
          if (!settings.enabled) {
            setIsVisible(false);
            setIsMounted(true);
            return;
          }
        }
      } catch (error) {
        console.error('Failed to load tour settings for checklist:', error);
      }
      
      // Если туры включены, проверяем localStorage
      const hidden = localStorage.getItem('onboarding_checklist_hidden') === 'true';
      
      if (!hidden) {
        setIsVisible(true);
      }
      
      setIsMounted(true);
      
      // Загружаем данные
      loadChecklist();
      
      // Проверяем каждые 2 секунды (для обновления прогресса)
      const interval = setInterval(loadChecklist, 2000);
      return () => clearInterval(interval);
    };
    
    checkTourSettings();
  }, []);

  const loadChecklist = async () => {
    try {
      // Проверяем прогресс из localStorage
      const saved = JSON.parse(localStorage.getItem('onboarding_checklist') || '{}');
      const hidden = localStorage.getItem('onboarding_checklist_hidden') === 'true';
      
      if (hidden) {
        setIsVisible(false);
        return;
      }

      // Проверяем реальный прогресс из БД
      const response = await fetch('/api/onboarding/progress');
      if (!response.ok) return;
      
      const progress = await response.json();

      const checklistItems: ChecklistItem[] = [
        {
          id: 'tour_completed',
          title: 'Пройти тур по приложению',
          description: 'Узнайте основные возможности FinApp',
          icon: '🗺️',
          completed: saved.tour_completed || false,
        },
        {
          id: 'account_created',
          title: 'Создать первый счёт',
          description: 'Добавьте карту или наличные',
          icon: '💳',
          link: '/cards',
          completed: progress.accounts > 0,
        },
        {
          id: 'transaction_created',
          title: 'Добавить первую транзакцию',
          description: 'Запишите доход или расход',
          icon: '💸',
          link: '/transactions',
          completed: progress.transactions > 0,
        },
        {
          id: 'category_created',
          title: 'Создать категорию',
          description: 'Настройте категории под себя',
          icon: '📂',
          link: '/budgets',
          completed: progress.categories > 0,
        },
        {
          id: 'budget_created',
          title: 'Установить бюджет',
          description: 'Контролируйте расходы по категориям',
          icon: '🎯',
          link: '/budgets',
          completed: progress.budgets > 0,
        },
        {
          id: 'ai_chat_used',
          title: 'Попробовать AI чат',
          description: 'Задайте вопрос или используйте команду',
          icon: '🤖',
          link: '/finance/ai-chat',
          completed: progress.ai_messages > 0,
        },
      ];

      setItems(checklistItems);

      // Автоматически скрываем чек-лист если всё выполнено
      const allCompleted = checklistItems.every(item => item.completed);
      if (allCompleted && !hidden) {
        setTimeout(() => {
          setIsVisible(false);
          localStorage.setItem('onboarding_checklist_hidden', 'true');
        }, 3000); // Показываем "Поздравляем!" 3 секунды
      }
    } catch (error) {
      console.error('Failed to load checklist:', error);
    }
  };

  const handleItemClick = (item: ChecklistItem) => {
    if (item.link && !item.completed) {
      window.location.href = item.link;
    }
  };

  const handleHide = () => {
    setIsVisible(false);
    localStorage.setItem('onboarding_checklist_hidden', 'true');
  };

  const completedCount = items.filter(item => item.completed).length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const allCompleted = completedCount === totalCount;

  // Не показываем компонент пока не проверили localStorage (предотвращает мигание)
  if (!isMounted || !isVisible) {
    return null;
  }

  return (
    <Card className={cn(isMinimized && "pb-0")}>
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><CardTitle className="text-base">🚀 Первые шаги</CardTitle>{!allCompleted && <span className="text-sm text-muted-foreground">{completedCount} из {totalCount}</span>}</div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsMinimized(!isMinimized)}>{isMinimized ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}</Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleHide}><X className="h-4 w-4" /></Button>
          </div>
        </div>
      </CardHeader>
      {!isMinimized && (
        <CardContent className="space-y-4">
          {allCompleted ? (
            <div className="flex flex-col items-center text-center py-6"><PartyPopper className="h-12 w-12 text-yellow-500 mb-4" /><h4 className="font-semibold text-lg">Поздравляем!</h4><p className="text-muted-foreground mb-4">Вы освоили основы FinApp!</p><Button onClick={handleHide}>Отлично!</Button></div>
          ) : (
            <>
              <Progress value={progress} className="h-2" />
              <div className="space-y-2">
                {items.map(item => (
                  <div key={item.id} className={cn("flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors", item.completed && "opacity-60", item.link && !item.completed && "cursor-pointer")} onClick={() => handleItemClick(item)}>
                    <div className="flex-shrink-0">{item.completed ? <div className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center"><Check className="h-4 w-4 text-white" /></div> : <span className="text-xl">{item.icon}</span>}</div>
                    <div className="flex-1 min-w-0"><div className={cn("font-medium text-sm", item.completed && "line-through")}>{item.title}</div><div className="text-xs text-muted-foreground">{item.description}</div></div>
                    {item.link && !item.completed && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
                  </div>
                ))}
              </div>
              <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-sm"><Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5" /><p><strong>Совет:</strong> Используйте AI чат для быстрых команд</p></div>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}
