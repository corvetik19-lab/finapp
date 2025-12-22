"use client";

import { useState, useEffect, Children, isValidElement, cloneElement } from "react";
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Извлекаем ключи виджетов из children
  useEffect(() => {
    const keys: string[] = [];
    Children.forEach(children, (child) => {
      if (isValidElement(child) && child.key) {
        keys.push(String(child.key));
      }
    });

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
  }, [children]);

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
  const childrenArray = Children.toArray(children);
  const sortedChildren = widgetOrder
    .map((key) => childrenArray.find((child) => isValidElement(child) && child.key === key))
    .filter((child): child is React.ReactElement => isValidElement(child));

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
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={widgetOrder} strategy={verticalListSortingStrategy}>
          <div className="space-y-4">
            {sortedChildren.map((child) => {
              const key = String(child.key ?? "");
              const title = WIDGET_TITLES[key] || key;
              return (
                <CollapsibleWidget key={key} id={key} title={title}>
                  {child}
                </CollapsibleWidget>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      {showCustomizeButton && isSettingsOpen && (
        <DashboardCustomizer onClose={() => setIsSettingsOpen(false)} />
      )}
    </div>
  );
}
