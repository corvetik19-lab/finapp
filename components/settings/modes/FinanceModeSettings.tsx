"use client";

import { useState } from "react";
import styles from "./FinanceModeSettings.module.css";

interface Category {
  id: string;
  name: string;
  kind: string;
  parent_id: string | null;
}

interface FinanceModeSettingsProps {
  settings: Record<string, unknown>;
  categories: Category[];
}

export default function FinanceModeSettings({ settings, categories }: FinanceModeSettingsProps) {
  const [currency, setCurrency] = useState((settings.currency as string) || "RUB");
  const [dateFormat, setDateFormat] = useState((settings.date_format as string) || "DD.MM.YYYY");
  const [firstDayOfWeek, setFirstDayOfWeek] = useState((settings.first_day_of_week as number) || 1);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/settings/modes/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currency,
          date_format: dateFormat,
          first_day_of_week: firstDayOfWeek,
        }),
      });

      if (!response.ok) {
        throw new Error("Ошибка сохранения настроек");
      }

      setMessage({ type: "success", text: "Настройки успешно сохранены" });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Произошла ошибка" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Настройки режима &quot;Финансы&quot;</h1>
          <p className={styles.subtitle}>Параметры, касающиеся только финансового учёта</p>
        </div>
      </div>

      <div className={styles.content}>
        {/* Основные настройки */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Основные настройки</h2>
          
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="currency" className={styles.label}>
                Валюта по умолчанию
              </label>
              <select
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className={styles.select}
              >
                <option value="RUB">₽ Российский рубль (RUB)</option>
                <option value="USD">$ Доллар США (USD)</option>
                <option value="EUR">€ Евро (EUR)</option>
                <option value="GBP">£ Фунт стерлингов (GBP)</option>
                <option value="CNY">¥ Китайский юань (CNY)</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="dateFormat" className={styles.label}>
                Формат даты
              </label>
              <select
                id="dateFormat"
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value)}
                className={styles.select}
              >
                <option value="DD.MM.YYYY">ДД.ММ.ГГГГ (31.12.2025)</option>
                <option value="MM/DD/YYYY">ММ/ДД/ГГГГ (12/31/2025)</option>
                <option value="YYYY-MM-DD">ГГГГ-ММ-ДД (2025-12-31)</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="firstDayOfWeek" className={styles.label}>
                Первый день недели
              </label>
              <select
                id="firstDayOfWeek"
                value={firstDayOfWeek}
                onChange={(e) => setFirstDayOfWeek(Number(e.target.value))}
                className={styles.select}
              >
                <option value="0">Воскресенье</option>
                <option value="1">Понедельник</option>
              </select>
            </div>

            {message && (
              <div className={`${styles.message} ${styles[message.type]}`}>
                <span className="material-icons">
                  {message.type === "success" ? "check_circle" : "error"}
                </span>
                {message.text}
              </div>
            )}

            <button type="submit" className={styles.button} disabled={isLoading}>
              {isLoading ? "Сохранение..." : "Сохранить изменения"}
            </button>
          </form>
        </section>

        {/* Категории */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Категории</h2>
          <p className={styles.sectionDesc}>
            Всего категорий: {categories.length}
          </p>
          <div className={styles.categoryGrid}>
            {categories.slice(0, 6).map((cat) => (
              <div key={cat.id} className={styles.categoryCard}>
                <span className="material-icons">category</span>
                <span>{cat.name}</span>
                <span className={styles.categoryKind}>
                  {cat.kind === "income" && "Доход"}
                  {cat.kind === "expense" && "Расход"}
                  {cat.kind === "transfer" && "Перевод"}
                </span>
              </div>
            ))}
          </div>
          {categories.length > 6 && (
            <p className={styles.moreText}>И ещё {categories.length - 6} категорий...</p>
          )}
        </section>

        {/* Функции */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Доступные функции</h2>
          <div className={styles.featureGrid}>
            <div className={styles.featureCard}>
              <span className="material-icons" style={{ color: "#10b981" }}>check_circle</span>
              <span>Транзакции</span>
            </div>
            <div className={styles.featureCard}>
              <span className="material-icons" style={{ color: "#10b981" }}>check_circle</span>
              <span>Счета</span>
            </div>
            <div className={styles.featureCard}>
              <span className="material-icons" style={{ color: "#10b981" }}>check_circle</span>
              <span>Бюджеты</span>
            </div>
            <div className={styles.featureCard}>
              <span className="material-icons" style={{ color: "#10b981" }}>check_circle</span>
              <span>Планы</span>
            </div>
            <div className={styles.featureCard}>
              <span className="material-icons" style={{ color: "#10b981" }}>check_circle</span>
              <span>Отчёты</span>
            </div>
            <div className={styles.featureCard}>
              <span className="material-icons" style={{ color: "#10b981" }}>check_circle</span>
              <span>AI Аналитика</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
