"use client";

import { useState, useEffect } from "react";
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
import { SortableWidget } from "./SortableWidget";
import { WidgetLibrary } from "./WidgetLibrary";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export interface Widget {
  id: string;
  enabled: boolean;
  order: number;
  name?: string;
  description?: string;
}

interface DashboardCustomizerProps {
  onClose: () => void;
}

const AVAILABLE_WIDGETS = [
  {
    id: "budget",
    name: "Бюджет на месяц",
    description: "Использование бюджетов по категориям",
    icon: "💰",
  },
  {
    id: "financial-trends",
    name: "Финансовые тенденции",
    description: "График доходов и расходов за период",
    icon: "📊",
  },
  {
    id: "expense-by-category",
    name: "Расходы по категориям",
    description: "Пончик-диаграмма распределения расходов",
    icon: "🥧",
  },
  {
    id: "net-worth",
    name: "Чистые активы",
    description: "Обзор активов и долгов (счета, кредиты)",
    icon: "🏦",
  },
  {
    id: "plans",
    name: "Планы",
    description: "Прогресс достижения финансовых целей",
    icon: "🎯",
  },
  {
    id: "upcoming-payments",
    name: "Предстоящие платежи",
    description: "Ближайшие обязательные платежи",
    icon: "📅",
  },
  {
    id: "category-management",
    name: "Управление категориями",
    description: "Быстрое редактирование категорий",
    icon: "📂",
  },
  {
    id: "top-products",
    name: "Управление товарами",
    description: "Отслеживание и анализ покупок товаров",
    icon: "📦",
  },
];

export function DashboardCustomizer({ onClose }: DashboardCustomizerProps) {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Загружаем настройки видимости виджетов
      const visibilityResponse = await fetch("/api/widget-visibility");
      const visibilityData = await visibilityResponse.json();
      const hiddenWidgets = new Set(visibilityData.hidden || []);

      // Загружаем настройки дашборда (порядок виджетов)
      const settingsResponse = await fetch("/api/dashboard/settings");
      const settingsData = await settingsResponse.json();
      
      // Создаём список виджетов с учётом видимости
      let widgetsList: Widget[];
      
      if (settingsData.widget_layout && settingsData.widget_layout.length > 0) {
        // Если есть сохранённый порядок, используем его
        widgetsList = settingsData.widget_layout.map((w: Widget) => {
          const widgetInfo = AVAILABLE_WIDGETS.find((aw) => aw.id === w.id);
          return {
            ...w,
            ...widgetInfo,
            enabled: !hiddenWidgets.has(w.id),
          };
        });
      } else {
        // Иначе используем дефолтный порядок из AVAILABLE_WIDGETS
        widgetsList = AVAILABLE_WIDGETS.map((w, index) => ({
          id: w.id,
          name: w.name,
          description: w.description,
          icon: w.icon,
          enabled: !hiddenWidgets.has(w.id),
          order: index,
        }));
      }
      
      setWidgets(widgetsList);
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      // Сохраняем настройки виджетов через API видимости
      const hiddenWidgets = widgets
        .filter((w) => !w.enabled)
        .map((w) => w.id);

      const visibilityResponse = await fetch("/api/widget-visibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hidden: hiddenWidgets,
        }),
      });

      if (!visibilityResponse.ok) throw new Error("Failed to save widget visibility");

      // Сохраняем порядок виджетов
      const settingsResponse = await fetch("/api/dashboard/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          widget_layout: widgets.map((w, index) => ({
            id: w.id,
            enabled: w.enabled,
            order: index,
          })),
        }),
      });

      if (!settingsResponse.ok) throw new Error("Failed to save widget layout");
      
      // Закрыть через 1 секунду и перезагрузить страницу
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error("Error saving settings:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setWidgets((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const toggleWidget = (id: string) => {
    setWidgets((items) =>
      items.map((item) =>
        item.id === id ? { ...item, enabled: !item.enabled } : item
      )
    );
  };

  const addWidget = (widgetId: string) => {
    const widgetInfo = AVAILABLE_WIDGETS.find((w) => w.id === widgetId);
    if (!widgetInfo) return;

    const newWidget: Widget = {
      ...widgetInfo,
      enabled: true,
      order: widgets.length,
    };

    setWidgets([...widgets, newWidget]);
  };

  const removeWidget = (id: string) => {
    setWidgets((items) => items.filter((item) => item.id !== id));
  };

  const availableToAdd = AVAILABLE_WIDGETS.filter(
    (aw) => !widgets.some((w) => w.id === aw.id)
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Настройка дашборда</DialogTitle>
          <DialogDescription>Выберите, какие виджеты показывать на главной странице</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Загрузка настроек...
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-6 py-4">
            <section>
              <h3 className="font-semibold mb-2">Активные виджеты</h3>
              <p className="text-sm text-muted-foreground mb-3">Перетаскивайте виджеты для изменения порядка</p>

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={widgets.map((w) => w.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {widgets.map((widget) => (
                      <SortableWidget key={widget.id} widget={widget} onToggle={toggleWidget} onRemove={removeWidget} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              {widgets.length === 0 && (
                <div className="text-center text-muted-foreground py-6">
                  Нет виджетов. Добавьте из библиотеки ниже.
                </div>
              )}
            </section>

            {availableToAdd.length > 0 && (
              <section>
                <h3 className="font-semibold mb-2">➕ Добавить виджеты ({availableToAdd.length})</h3>
                <WidgetLibrary widgets={availableToAdd} onAdd={addWidget} />
              </section>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button onClick={saveSettings} disabled={saving}>
            {saving ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Сохранение...</> : "Сохранить и применить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
