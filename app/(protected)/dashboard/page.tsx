import { createRSCClient } from "@/lib/supabase/helpers";
import styles from "@/components/dashboard/Dashboard.module.css";
import IncomeExpenseChart from "@/components/dashboard/IncomeExpenseChart";
import { formatMoney } from "@/lib/utils/format";

type Tx = {
  id: string;
  occurred_at: string;
  amount: number; // minor
  currency: string;
  direction: "income" | "expense" | "transfer";
  note: string | null;
};

function monthKey(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function lastMonths(n: number) {
  const now = new Date();
  const arr: { key: string; label: string }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    arr.push({
      key: monthKey(d),
      label: d.toLocaleString("ru-RU", { month: "short" }).replace(".", ""),
    });
  }
  return arr;
}

export default async function DashboardPage() {
  const supabase = await createRSCClient();

  // Build period (last 8 months)
  const months = lastMonths(8);
  const periodStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - 7, 1));

  const { data: txns = [] } = await supabase
    .from("transactions")
    .select("id,occurred_at,amount,currency,direction,note")
    .gte("occurred_at", periodStart.toISOString())
    .order("occurred_at", { ascending: false })
    .limit(200);

  // Aggregate by month in major units
  const incomeBy: Record<string, number> = {};
  const expenseBy: Record<string, number> = {};
  for (const t of (txns as Tx[])) {
    const d = new Date(t.occurred_at);
    const key = monthKey(d);
    const v = Number(t.amount) / 100;
    if (t.direction === "income") incomeBy[key] = (incomeBy[key] || 0) + v;
    if (t.direction === "expense") expenseBy[key] = (expenseBy[key] || 0) + v;
  }
  const labels = months.map((m) => m.label);
  const income = months.map((m) => Math.round(incomeBy[m.key] || 0));
  const expense = months.map((m) => Math.round(expenseBy[m.key] || 0));

  const currentKey = monthKey(new Date());
  const monthIncome = Math.round(incomeBy[currentKey] || 0);
  const monthExpense = Math.round(expenseBy[currentKey] || 0);
  const monthNet = monthIncome - monthExpense;

  const { data: recent = [] } = await supabase
    .from("transactions")
    .select("id,occurred_at,amount,currency,direction,note")
    .order("occurred_at", { ascending: false })
    .limit(6);

  return (
    <div className={styles.wrapper}>
      <div className={styles.topBar}>
        <div className={styles.pageTitle}>Дашборд</div>
        <div className={styles.actions}>
          <i className="material-icons" aria-hidden>search</i>
          <i className="material-icons" aria-hidden>notifications</i>
        </div>
      </div>

      <section className={styles.banner}>
        <div>
          <div className={styles.bannerTitle}>Добро пожаловать!</div>
          <div className={styles.bannerSub}>Краткий обзор ваших финансов за последние месяцы</div>
        </div>
        <div className="material-icons" aria-hidden style={{ fontSize: 56, opacity: 0.9 }}>insights</div>
      </section>

      <section className={styles.summaryGrid}>
        <div className={styles.card}>
          <div className={`${styles.cardIcon} balance`}><span className="material-icons">account_balance_wallet</span></div>
          <div className={styles.cardTitle}>Итог месяца</div>
          <div className={styles.cardValue}>{formatMoney(monthNet * 100, "RUB")}</div>
        </div>
        <div className={styles.card}>
          <div className={`${styles.cardIcon} income`}><span className="material-icons">trending_up</span></div>
          <div className={styles.cardTitle}>Доходы (месяц)</div>
          <div className={styles.cardValue}>{formatMoney(monthIncome * 100, "RUB")}</div>
        </div>
        <div className={styles.card}>
          <div className={`${styles.cardIcon} expense`}><span className="material-icons">trending_down</span></div>
          <div className={styles.cardTitle}>Расходы (месяц)</div>
          <div className={styles.cardValue}>{formatMoney(monthExpense * 100, "RUB")}</div>
        </div>
        <div className={styles.card}>
          <div className={`${styles.cardIcon} invest`}><span className="material-icons">savings</span></div>
          <div className={styles.cardTitle}>Инвестиции</div>
          <div className={styles.cardValue}>—</div>
        </div>
      </section>

      <section className={styles.grid2}>
        <div className={styles.chartCard}>
          <IncomeExpenseChart labels={labels} income={income} expense={expense} currency="RUB" />
        </div>
        <div className={styles.listCard}>
          <div style={{ fontWeight: 500, marginBottom: 8 }}>Последние транзакции</div>
          <div>
            {(recent as Tx[]).map((t) => (
              <div key={t.id} className={styles.listItem}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{t.note || (t.direction === "income" ? "Доход" : t.direction === "expense" ? "Расход" : "Перевод")}</div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{new Date(t.occurred_at).toLocaleString("ru-RU")}</div>
                </div>
                <div className={t.direction === "income" ? styles.amountIncome : styles.amountExpense}>
                  {formatMoney(t.amount, t.currency)}
                </div>
              </div>
            ))}
            {(recent as Tx[]).length === 0 && (
              <div style={{ color: "#888" }}>Нет данных</div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
