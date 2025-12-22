"use client";

import { useState, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

type CollapsibleWidgetProps = {
  id: string;
  title: string;
  children: React.ReactNode;
  defaultCollapsed?: boolean;
  isDraggable?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
};

export function CollapsibleWidget({
  id,
  title,
  children,
  defaultCollapsed = false,
  isDraggable = true,
  onCollapsedChange,
}: CollapsibleWidgetProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !isDraggable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  useEffect(() => {
    // Загружаем состояние сворачивания из localStorage
    const saved = localStorage.getItem(`widget-collapsed-${id}`);
    if (saved !== null) {
      setIsCollapsed(saved === "true");
    }
  }, [id]);

  const toggleCollapsed = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem(`widget-collapsed-${id}`, String(newState));
    onCollapsedChange?.(newState);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative rounded-lg border bg-card transition-all",
        isDragging && "opacity-50 shadow-lg z-50",
        isCollapsed && "pb-0"
      )}
    >
      {/* Header with drag handle and collapse toggle */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30 rounded-t-lg">
        <div className="flex items-center gap-2">
          {isDraggable && (
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted"
              title="Перетащить виджет"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
          <span className="font-medium text-sm">{title}</span>
        </div>
        <button
          onClick={toggleCollapsed}
          className="p-1 rounded hover:bg-muted transition-colors"
          title={isCollapsed ? "Развернуть" : "Свернуть"}
        >
          {isCollapsed ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </div>

      {/* Content */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-300",
          isCollapsed ? "max-h-0" : "max-h-[2000px]"
        )}
      >
        <div className="p-0">{children}</div>
      </div>
    </div>
  );
}

export default CollapsibleWidget;
