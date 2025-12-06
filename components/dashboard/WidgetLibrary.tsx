"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface WidgetInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface WidgetLibraryProps {
  widgets: WidgetInfo[];
  onAdd: (widgetId: string) => void;
}

export function WidgetLibrary({ widgets, onAdd }: WidgetLibraryProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {widgets.map((widget) => (
        <div key={widget.id} className="flex items-center gap-2 p-2 rounded-lg border bg-muted/50 hover:bg-muted transition-colors">
          <div className="text-xl">{widget.icon}</div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{widget.name}</div>
            <div className="text-xs text-muted-foreground truncate">{widget.description}</div>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => onAdd(widget.id)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      ))}

      {widgets.length === 0 && (
        <div className="col-span-2 text-center text-muted-foreground py-4">
          Все доступные виджеты уже добавлены
        </div>
      )}
    </div>
  );
}
