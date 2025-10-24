"use client";

import styles from "./ThemeSelector.module.css";

interface ThemeSelectorProps {
  value: "light" | "dark" | "auto";
  onChange: (theme: "light" | "dark" | "auto") => void;
}

const THEMES = [
  {
    value: "light" as const,
    name: "Светлая",
    icon: "☀️",
    description: "Классическая светлая тема",
  },
  {
    value: "dark" as const,
    name: "Тёмная",
    icon: "🌙",
    description: "Тёмная тема для работы ночью",
  },
  {
    value: "auto" as const,
    name: "Авто",
    icon: "🔄",
    description: "Следует системным настройкам",
  },
];

export function ThemeSelector({ value, onChange }: ThemeSelectorProps) {
  return (
    <div className={styles.themeSelector}>
      {THEMES.map((theme) => (
        <button
          key={theme.value}
          className={`${styles.themeCard} ${
            value === theme.value ? styles.active : ""
          }`}
          onClick={() => onChange(theme.value)}
        >
          <div className={styles.icon}>{theme.icon}</div>
          <div className={styles.info}>
            <div className={styles.name}>{theme.name}</div>
            <div className={styles.description}>{theme.description}</div>
          </div>
          {value === theme.value && (
            <div className={styles.checkmark}>✓</div>
          )}
        </button>
      ))}
    </div>
  );
}
