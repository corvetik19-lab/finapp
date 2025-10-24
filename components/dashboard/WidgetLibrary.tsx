"use client";

import styles from "./WidgetLibrary.module.css";

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
    <div className={styles.library}>
      {widgets.map((widget) => (
        <div key={widget.id} className={styles.widgetCard}>
          <div className={styles.icon}>{widget.icon}</div>
          <div className={styles.info}>
            <div className={styles.name}>{widget.name}</div>
            <div className={styles.description}>{widget.description}</div>
          </div>
          <button
            className={styles.addButton}
            onClick={() => onAdd(widget.id)}
            title="Добавить виджет"
          >
            ➕
          </button>
        </div>
      ))}

      {widgets.length === 0 && (
        <div className={styles.emptyState}>
          <p>Все доступные виджеты уже добавлены</p>
        </div>
      )}
    </div>
  );
}
