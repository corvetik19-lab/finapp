"use client";
import { useState } from "react";
import styles from "./Settings.module.css";
import { addCategory, renameCategory, deleteCategory } from "@/app/(protected)/settings/actions";

export type Cat = { id: string; name: string; kind: "income" | "expense" };

export default function CategoriesManager({ expense, income }: { expense: Cat[]; income: Cat[] }) {
  const [tab, setTab] = useState<"expense" | "income">("expense");
  const list = tab === "expense" ? expense : income;

  return (
    <div className={styles.card}>
      <div className={styles.sectionTitle}>Управление категориями</div>

      <div className={styles.toolbar}>
        <button
          type="button"
          className={`${styles.tab} ${tab === "expense" ? styles.tabActive : ""}`}
          onClick={() => setTab("expense")}
        >
          Расходы
        </button>
        <button
          type="button"
          className={`${styles.tab} ${tab === "income" ? styles.tabActive : ""}`}
          onClick={() => setTab("income")}
        >
          Доходы
        </button>
        <div style={{ marginLeft: "auto" }} />
        <form action={addCategory} className={styles.itemForm}>
          <input type="hidden" name="kind" value={tab} />
          <input className={styles.input} name="name" placeholder="Новая категория" required />
          <button className={styles.btn} type="submit">Добавить</button>
        </form>
      </div>

      <div className={styles.list}>
        {list.map((c) => (
          <div key={c.id} className={styles.item}>
            <form action={renameCategory} className={styles.itemForm}>
              <input type="hidden" name="id" value={c.id} />
              <input className={styles.input} name="name" defaultValue={c.name} />
              <button className={`${styles.btn} secondary`} type="submit">Переименовать</button>
            </form>
            <form action={deleteCategory}>
              <input type="hidden" name="id" value={c.id} />
              <button type="submit" className={styles.del} title="Удалить">
                <span className="material-icons" aria-hidden>delete</span>
              </button>
            </form>
          </div>
        ))}
        {list.length === 0 && <div style={{ color: "#888" }}>Пока нет категорий.</div>}
      </div>
    </div>
  );
}
