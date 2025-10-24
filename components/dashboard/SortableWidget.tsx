"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Widget } from "./DashboardCustomizer";
import styles from "./SortableWidget.module.css";

interface SortableWidgetProps {
  widget: Widget;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}

export function SortableWidget({ widget, onToggle, onRemove }: SortableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.widget} ${!widget.enabled ? styles.disabled : ""}`}
    >
      <div className={styles.dragHandle} {...attributes} {...listeners}>
        <span className={styles.dragIcon}>⋮⋮</span>
      </div>

      <div className={styles.info}>
        <div className={styles.icon}>{"icon" in widget ? (widget as { icon: string }).icon : "📦"}</div>
        <div className={styles.details}>
          <div className={styles.name}>{"name" in widget ? (widget as { name: string }).name : widget.id}</div>
          <div className={styles.description}>
            {"description" in widget ? (widget as { description: string }).description : "Виджет дашборда"}
          </div>
        </div>
      </div>

      <div className={styles.actions}>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={widget.enabled}
            onChange={() => onToggle(widget.id)}
          />
          <span className={styles.slider}></span>
        </label>

        <button
          className={styles.removeButton}
          onClick={() => onRemove(widget.id)}
          title="Удалить виджет"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}
