"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  DASHBOARD_WIDGETS,
  WIDGET_INFO,
  type DashboardWidgetKey,
  type WidgetVisibilityState,
} from "@/lib/dashboard/preferences/shared";
import { saveWidgetVisibility } from "@/lib/dashboard/preferences/client";
import { Wallet, LineChart, PieChart, Landmark, Flag, Calendar, Tag, Package, Settings, type LucideIcon } from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  account_balance_wallet: Wallet,
  show_chart: LineChart,
  pie_chart: PieChart,
  account_balance: Landmark,
  flag: Flag,
  event: Calendar,
  category: Tag,
  inventory_2: Package,
};

type WidgetSettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialVisibility: WidgetVisibilityState;
};

export default function WidgetSettingsModal({
  isOpen,
  onClose,
  initialVisibility,
}: WidgetSettingsModalProps) {
  const router = useRouter();
  const [hiddenWidgets, setHiddenWidgets] = useState<Set<DashboardWidgetKey>>(
    new Set(initialVisibility.hidden)
  );
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const toggleWidget = (widgetKey: DashboardWidgetKey) => {
    const newHidden = new Set(hiddenWidgets);
    if (newHidden.has(widgetKey)) {
      newHidden.delete(widgetKey);
    } else {
      newHidden.add(widgetKey);
    }
    setHiddenWidgets(newHidden);
  };

  const handleSelectAll = () => {
    setHiddenWidgets(new Set());
  };

  const handleDeselectAll = () => {
    const allWidgets = Object.values(DASHBOARD_WIDGETS) as DashboardWidgetKey[];
    setHiddenWidgets(new Set(allWidgets));
  };

  const handleSave = async () => {
    if (isSaving) return;

    setIsSaving(true);
    try {
      await saveWidgetVisibility({ hidden: Array.from(hiddenWidgets) });
      router.refresh();
      onClose();
    } catch (error) {
      console.error("Failed to save widget settings:", error);
      alert("Не удалось сохранить настройки");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Настройка виджетов</DialogTitle></DialogHeader>
        <div className="flex items-center justify-between mb-4"><p className="text-sm text-muted-foreground">Выберите виджеты для дашборда</p><div className="flex gap-2"><Button variant="outline" size="sm" onClick={handleSelectAll} disabled={isSaving}>Все</Button><Button variant="ghost" size="sm" onClick={handleDeselectAll} disabled={isSaving}>Снять</Button></div></div>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {Object.values(DASHBOARD_WIDGETS).map((widgetKey) => {
            const info = WIDGET_INFO[widgetKey];
            const isVisible = !hiddenWidgets.has(widgetKey);
            return (
              <label key={widgetKey} className={cn("flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors", isVisible ? "bg-primary/5 border-primary/30" : "hover:bg-muted")}>
                <Checkbox checked={isVisible} onCheckedChange={() => toggleWidget(widgetKey)} />
                {(() => { const Icon = ICON_MAP[info.icon] || Settings; return <Icon className="h-5 w-5 text-muted-foreground" />; })()}
                <div className="flex-1"><div className="font-medium text-sm">{info.title}</div><div className="text-xs text-muted-foreground">{info.description}</div></div>
              </label>
            );
          })}
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose} disabled={isSaving}>Отмена</Button><Button onClick={handleSave} disabled={isSaving}>{isSaving ? "Сохранение..." : "Сохранить"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
