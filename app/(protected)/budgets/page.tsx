import styles from "@/components/budgets/Budgets.module.css";
import { createRSCClient } from "@/lib/supabase/helpers";
import { listBudgetsWithUsage } from "@/lib/budgets/service";
import { formatMoney } from "@/lib/utils/format";
import { createBudget } from "./actions";
import BudgetsList from "@/components/budgets/BudgetsList";

// Делаем страницу динамической
export const dynamic = 'force-dynamic';

export default async function BudgetsPage() {
  const supabase = await createRSCClient();

  const { data: categoriesRaw } = await supabase
    .from("categories")
    .select("id,name,kind")
    .eq("kind", "expense")
    .order("name", { ascending: true });

  const categories = (categoriesRaw ?? []) as { id: string; name: string; kind: "income" | "expense" | "transfer" }[];

  const budgets = await listBudgetsWithUsage();

  const totalLimitMinor = budgets.reduce((acc, b) => acc + b.limit_minor, 0);
  const totalSpentMinor = budgets.reduce((acc, b) => acc + b.spent_minor, 0);
  const totalRemainingMinor = totalLimitMinor - totalSpentMinor;

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <div className={styles.pageTitle}>Бюджеты</div>
      </div>

      <section className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Всего бюджетов</div>
          <div className={styles.summaryValue}>{budgets.length}</div>
          <div className={styles.summaryMeta}>Активные лимиты</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Суммарный лимит</div>
          <div className={styles.summaryValue}>{formatMoney(totalLimitMinor, "RUB")}</div>
          <div className={styles.summaryMeta}>По всем бюджетам</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Уже потрачено</div>
          <div className={styles.summaryValue}>{formatMoney(totalSpentMinor, "RUB")}</div>
          <div className={styles.summaryMeta}>Определено по транзакциям</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Осталось</div>
          <div className={styles.summaryValue}>{formatMoney(totalRemainingMinor, "RUB")}</div>
          <div className={styles.summaryMeta}>Сумма до достижения лимитов</div>
        </div>
      </section>

      <section className={styles.formCard}>
        <div className={styles.formTitle}>Создать бюджет</div>
        <form action={createBudget} className={styles.formGrid}>
          <label>
            <span className={styles.label}>Категория</span>
            <select name="category_id" className={styles.select} required>
              <option value="">— выберите категорию —</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={styles.label}>Дата начала</span>
            <input type="date" name="period_start" className={styles.input} required />
          </label>
          <label>
            <span className={styles.label}>Дата окончания</span>
            <input type="date" name="period_end" className={styles.input} required />
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

      <section className={styles.list}>
        <BudgetsList budgets={budgets} categories={categories} />
      </section>
    </div>
  );
}
