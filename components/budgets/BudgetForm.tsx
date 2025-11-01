"use client";

import { useState } from "react";
import styles from "./Budgets.module.css";

type Category = {
  id: string;
  name: string;
  kind: "income" | "expense" | "transfer";
};

type BudgetFormProps = {
  categories: Category[];
  onSubmit: (formData: FormData) => void;
};

export default function BudgetForm({ categories, onSubmit }: BudgetFormProps) {
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");

  const setCurrentMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    
    // Первый день месяца
    const firstDay = `${year}-${month}-01`;
    
    // Последний день месяца
    const lastDay = new Date(year, now.getMonth() + 1, 0);
    const lastDayStr = `${year}-${month}-${String(lastDay.getDate()).padStart(2, "0")}`;
    
    setPeriodStart(firstDay);
    setPeriodEnd(lastDayStr);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    onSubmit(formData);
  };

  return (
    <section className={styles.formCard}>
      <div className={styles.formTitle}>Создать бюджет</div>
      <form onSubmit={handleSubmit} className={styles.formGrid}>
        <label>
          <span className={styles.label}>Категория</span>
          <select name="category_id" className={styles.select} required>
            <option value="">— выберите категорию —</option>
            <optgroup label="💰 Доходы">
              {categories.filter(c => c.kind === "income").map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="💸 Расходы">
              {categories.filter(c => c.kind === "expense").map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        
        <label>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
            <span className={styles.label} style={{ margin: 0 }}>Начало</span>
            <button
              type="button"
              onClick={setCurrentMonth}
              className={styles.quickBtnSmall}
              title="Текущий месяц"
            >
              <span className="material-icons" style={{ fontSize: 14 }}>
                today
              </span>
            </button>
          </div>
          <input
            type="date"
            name="period_start"
            className={styles.input}
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
            required
          />
        </label>
        
        <label>
          <span className={styles.label}>Окончание</span>
          <input
            type="date"
            name="period_end"
            className={styles.input}
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            required
          />
        </label>
        
        <label>
          <span className={styles.label}>Лимит (₽)</span>
          <input type="text" name="limit_amount" inputMode="decimal" className={styles.input} required />
        </label>
        
        <input type="hidden" name="currency" value="RUB" />
        
        <div className={styles.submitRow}>
          <button type="submit" className={styles.primaryBtn}>
            <span className="material-icons" aria-hidden>
              add
            </span>
            Сохранить бюджет
          </button>
        </div>
      </form>
    </section>
  );
}
