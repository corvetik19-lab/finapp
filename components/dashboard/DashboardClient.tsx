"use client";

import { useState, useEffect, Children, isValidElement, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Settings2 } from "lucide-react";
import { DashboardCustomizer } from "./DashboardCustomizer";
import type { WidgetVisibilityState } from "@/lib/dashboard/preferences/shared";
import TourGuide from "@/components/onboarding/TourGuide";
import OnboardingChecklist from "@/components/onboarding/OnboardingChecklist";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CollapsibleWidget } from "./CollapsibleWidget";

const WIDGET_TITLES: Record<string, string> = {
  "budget": "Бюджет на месяц",
  "financial-trends": "Финансовые тенденции",
  "expense-by-category": "Расходы по категориям",
  "net-worth": "Чистые активы",
  "upcoming-payments": "Предстоящие платежи",
  "category-management": "Управление категориями",
  "top-products": "Управление товарами",
  "top-products-ranking": "Топ-10 покупок",
};

// Извлекает чистый ключ без React-префикса (.$key -> key)
const getCleanKey = (key: string | null): string => {
  if (!key) return "";
  // React добавляет префикс ".$" или "." к ключам
  return key.replace(/^\.\$?/, "");
};

type DashboardClientProps = {
  children: React.ReactNode;
  widgetVisibility: WidgetVisibilityState;
  showCustomizeButton?: boolean;
};

export default function DashboardClient({
  children,
  showCustomizeButton = true,
}: DashboardClientProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [widgetOrder, setWidgetOrder] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Преобразуем children в массив с чистыми ключами
  const childrenWithKeys = useMemo(() => {
    const result: Array<{ element: React.ReactElement; cleanKey: string }> = [];
    Children.forEach(children, (child) => {
      if (isValidElement(child) && child.key) {
        const cleanKey = getCleanKey(String(child.key));
        if (cleanKey) {
          result.push({ element: child, cleanKey });
        }
      }
    });
    return result;
  }, [children]);

  // Извлекаем ключи виджетов из children
  useEffect(() => {
    const keys = childrenWithKeys.map((c) => c.cleanKey);
    
    if (keys.length === 0) {
      setIsInitialized(true);
      return;
    }

    // Загружаем сохранённый порядок
    const savedOrder = localStorage.getItem("dashboard-widget-order");
    if (savedOrder) {
      try {
        const parsed = JSON.parse(savedOrder) as string[];
        // Фильтруем только существующие виджеты
        const validOrder = parsed.filter((k) => keys.includes(k));
        // Добавляем новые виджеты в конец
        const newKeys = keys.filter((k) => !validOrder.includes(k));
        setWidgetOrder([...validOrder, ...newKeys]);
      } catch {
        setWidgetOrder(keys);
      }
    } else {
      setWidgetOrder(keys);
    }
    setIsInitialized(true);
  }, [childrenWithKeys]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setWidgetOrder((items) => {
        const oldIndex = items.indexOf(String(active.id));
        const newIndex = items.indexOf(String(over.id));
        const newOrder = arrayMove(items, oldIndex, newIndex);
        localStorage.setItem("dashboard-widget-order", JSON.stringify(newOrder));
        return newOrder;
      });
    }
  };

  // Сортируем children по widgetOrder
  const sortedChildren = useMemo(() => {
    if (widgetOrder.length === 0) {
      // Если порядок ещё не загружен, показываем в исходном порядке
      return childrenWithKeys;
    }
    return widgetOrder
      .map((key) => childrenWithKeys.find((c) => c.cleanKey === key))
      .filter((c): c is { element: React.ReactElement; cleanKey: string } => c !== undefined);
  }, [widgetOrder, childrenWithKeys]);

  return (
    <div className="space-y-6">
      {/* Интерактивный тур по дашборду */}
      <TourGuide page="dashboard" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Дашборд</h1>
          <p className="text-sm text-muted-foreground">Обзор ваших финансов</p>
        </div>
        {showCustomizeButton && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSettingsOpen(true)}
          >
            <Settings2 className="mr-2 h-4 w-4" />
            Настроить
          </Button>
        )}
      </div>

      {/* Чек-лист "Первые шаги" */}
      <OnboardingChecklist />

      {/* Виджеты с drag & drop и сворачиванием */}
      {isInitialized && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sortedChildren.map((c) => c.cleanKey)} strategy={verticalListSortingStrategy}>
            <div className="space-y-4">
              {sortedChildren.map(({ element, cleanKey }) => {
                const title = WIDGET_TITLES[cleanKey] || cleanKey;
                return (
                  <CollapsibleWidget key={cleanKey} id={cleanKey} title={title}>
                    {element}
                  </CollapsibleWidget>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {showCustomizeButton && isSettingsOpen && (
        <DashboardCustomizer onClose={() => setIsSettingsOpen(false)} />
      )}
    </div>
  );
}
