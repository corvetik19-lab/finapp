import styles from "@/components/budgets/Budgets.module.css";
import { createRSCClient } from "@/lib/supabase/helpers";
import { listBudgetsWithUsage } from "@/lib/budgets/service";
import { formatMoney } from "@/lib/utils/format";
import { createBudget, deleteBudget } from "./actions";

function formatDate(date: string) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "numeric" });
}

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
        {budgets.length === 0 ? (
          <div className={styles.empty}>Бюджеты ещё не настроены. Создайте первый лимит в форме выше.</div>
        ) : (
          budgets.map((budget) => {
            const cardClass =
              budget.status === "over"
                ? `${styles.card} ${styles.statusOver}`
                : budget.status === "warning"
                  ? `${styles.card} ${styles.statusWarning}`
                  : `${styles.card} ${styles.statusOk}`;

            return (
              <div key={budget.id} className={cardClass}>
                <div className={styles.cardHeader}>
                  <div>
                    <div className={styles.cardTitle}>{budget.category?.name ?? "Без категории"}</div>
                    <div className={styles.cardPeriod}>
                      {formatDate(budget.period_start)} — {formatDate(budget.period_end)}
                    </div>
                  </div>
                  <form action={deleteBudget} className={styles.actions}>
                    <input type="hidden" name="id" value={budget.id} />
                    <button type="submit" className={styles.deleteBtn}>
                      <span className="material-icons" aria-hidden>
                        delete
                      </span>
                      Удалить
                    </button>
                  </form>
                </div>

                <div className={styles.cardAmounts}>
                  <div className={styles.amountItem}>
                    <span className={styles.amountLabel}>Лимит</span>
                    <span className={styles.amountValue}>{formatMoney(budget.limit_minor, budget.currency)}</span>
                  </div>
                  <div className={styles.amountItem}>
                    <span className={styles.amountLabel}>Потрачено</span>
                    <span className={styles.amountValue}>{formatMoney(budget.spent_minor, budget.currency)}</span>
                  </div>
                  <div className={styles.amountItem}>
                    <span className={styles.amountLabel}>{budget.remaining_minor >= 0 ? "Остаток" : "Перерасход"}</span>
                    <span className={styles.amountValue}>{formatMoney(budget.remaining_minor, budget.currency)}</span>
                  </div>
                </div>

                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${Math.min(Math.max(budget.progress, 0), 1) * 100}%` }}
                  />
                </div>

                <div
                  className={`${styles.statusLine} ${
                    budget.status === "over"
                      ? styles.statusLineOver
                      : budget.status === "warning"
                        ? styles.statusLineWarning
                        : styles.statusLineOk
                  }`}
                >
                  <span
                    className={`${styles.statusDot} ${
                      budget.status === "over"
                        ? styles.statusDotOver
                        : budget.status === "warning"
                          ? styles.statusDotWarning
                          : styles.statusDotOk
                    }`}
                  />
                  {budget.status === "over"
                    ? "Лимит превышен"
                    : budget.status === "warning"
                      ? "Осталось менее 15%"
                      : "В пределах лимита"}
                </div>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
