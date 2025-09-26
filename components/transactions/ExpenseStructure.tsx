"use client";
import React from "react";
import styles from "@/components/transactions/Transactions.module.css";

export type ExpenseStructItem = {
  label: string;
  amountMajor: number; // positive major units
  percent: number; // 0..100
};

export default function ExpenseStructure({ items, currency = "RUB" }: { items: ExpenseStructItem[]; currency?: string }) {
  const total = items.reduce((s, i) => s + i.amountMajor, 0) || 1;
  const fmt = (v: number) => new Intl.NumberFormat("ru-RU").format(v);
  return (
    <section className={styles.structCard}>
      <div className={styles.structHeader}>
        <div className={styles.structTitle}>Структура расходов</div>
        <div className={styles.structSub}>{fmt(total)} {currency}</div>
      </div>
      <div className={styles.structList}>
        {items.map((it, idx) => {
          const pct = Math.round((it.amountMajor / total) * 1000) / 10; // 1 decimal
          return (
            <div key={`${it.label}-${idx}`} className={styles.structRow}>
              <div className={styles.structLabel}>{it.label}</div>
              <div className={styles.structBarWrap}>
                <div className={styles.structBar} style={{ width: `${pct}%` }} />
              </div>
              <div className={styles.structAmount}>{fmt(it.amountMajor)}</div>
              <div className={styles.structPct}>{pct}%</div>
            </div>
          );
        })}
        {items.length === 0 && (
          <div className={styles.structEmpty}>Нет расходов в текущем наборе транзакций</div>
        )}
      </div>
    </section>
  );
}
