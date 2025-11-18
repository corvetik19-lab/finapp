import type { TransactionRecord } from "@/lib/transactions/service";

export type MonthlyTrend = {
  labels: string[];
  income: number[]; // major units
  expense: number[]; // major units (positive)
};

export type ExpenseBreakdown = {
  labels: string[];
  values: number[]; // major units
};

export type ProductBreakdown = {
  labels: string[]; // product names
  values: number[]; // total amounts in major units
  quantities: number[]; // total quantities
  units: string[]; // units
};

export type ReportAggregates = {
  currency: string;
  monthlyTrend: MonthlyTrend;
  expenseBreakdown: ExpenseBreakdown;
  productBreakdown: ProductBreakdown;
  periodLabel: string;
};

type CategoryMap = Record<string, string>;

type TransactionItem = {
  name: string;
  quantity: number;
  unit: string;
  total_amount: number;
  occurred_at: string;
};

type AggregateOptions = {
  categories: CategoryMap;
  items?: TransactionItem[];
  now?: Date;
};

const MONTH_NAMES_RU = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

function toMajor(amountMinor: number | bigint) {
  return Number(amountMinor) / 100;
}

export function aggregateReports(
  records: Pick<TransactionRecord, "occurred_at" | "amount" | "direction" | "currency" | "category_id">[],
  options: AggregateOptions,
): ReportAggregates {
  const now = options.now ? new Date(options.now) : new Date();
  const currency = records[0]?.currency || "RUB";

  // Build last 12 months timeline (inclusive current month, oldest first)
  const months: { key: string; label: string }[] = [];
  const trendIncome = new Map<string, number>();
  const trendExpense = new Map<string, number>();
  const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  for (let i = 11; i >= 0; i -= 1) {
    const dt = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() - i, 1));
    const key = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}`;
    months.push({ key, label: `${MONTH_NAMES_RU[dt.getUTCMonth()]} ${dt.getUTCFullYear()}` });
    trendIncome.set(key, 0);
    trendExpense.set(key, 0);
  }

  const startOfCurrentMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const startOfNextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  const expenseByCategory = new Map<string, number>();

  for (const record of records) {
    const occurredAt = new Date(record.occurred_at);
    const monthKey = `${occurredAt.getUTCFullYear()}-${String(occurredAt.getUTCMonth() + 1).padStart(2, "0")}`;
    const valueMajor = toMajor(record.amount);

    if (record.direction === "income") {
      if (trendIncome.has(monthKey)) {
        trendIncome.set(monthKey, (trendIncome.get(monthKey) || 0) + valueMajor);
      }
    } else if (record.direction === "expense") {
      if (trendExpense.has(monthKey)) {
        // store as positive number for charts
        trendExpense.set(monthKey, (trendExpense.get(monthKey) || 0) + Math.abs(valueMajor));
      }
      if (occurredAt >= startOfCurrentMonth && occurredAt < startOfNextMonth) {
        const categoryName = record.category_id ? options.categories[record.category_id] ?? "Без категории" : "Без категории";
        expenseByCategory.set(categoryName, (expenseByCategory.get(categoryName) || 0) + Math.abs(valueMajor));
      }
    }
  }

  const monthlyTrend: MonthlyTrend = {
    labels: months.map((m) => m.label),
    income: months.map((m) => Number((trendIncome.get(m.key) || 0).toFixed(2))),
    expense: months.map((m) => Number((trendExpense.get(m.key) || 0).toFixed(2))),
  };

  const breakdownEntries = Array.from(expenseByCategory.entries()).sort((a, b) => b[1] - a[1]);
  const topEntries = breakdownEntries.slice(0, 5);
  const otherTotal = breakdownEntries.slice(5).reduce((sum, [, val]) => sum + val, 0);
  if (otherTotal > 0) {
    topEntries.push(["Остальное", otherTotal]);
  }

  const expenseBreakdown: ExpenseBreakdown = {
    labels: topEntries.map(([label]) => label),
    values: topEntries.map(([, value]) => Number(value.toFixed(2))),
  };

  // Агрегация товаров
  const productByName = new Map<string, { 
    totalAmount: number; 
    totalQuantity: number;
    unit: string;
  }>();

  if (options.items) {
    options.items.forEach((item) => {
      const occurredAt = new Date(item.occurred_at);
      // Только товары из текущего месяца
      if (occurredAt >= startOfCurrentMonth && occurredAt < startOfNextMonth) {
        const key = item.name;
        if (!productByName.has(key)) {
          productByName.set(key, {
            totalAmount: 0,
            totalQuantity: 0,
            unit: item.unit,
          });
        }
        const productData = productByName.get(key)!;
        productData.totalAmount += toMajor(item.total_amount);
        productData.totalQuantity += item.quantity;
      }
    });
  }

  const productEntries = Array.from(productByName.entries())
    .sort((a, b) => b[1].totalAmount - a[1].totalAmount)
    .slice(0, 10); // топ-10 товаров

  const productBreakdown: ProductBreakdown = {
    labels: productEntries.map(([name]) => name),
    values: productEntries.map(([, data]) => Number(data.totalAmount.toFixed(2))),
    quantities: productEntries.map(([, data]) => Number(data.totalQuantity.toFixed(2))),
    units: productEntries.map(([, data]) => data.unit),
  };

  const periodLabel = `${MONTH_NAMES_RU[startOfCurrentMonth.getUTCMonth()]} ${startOfCurrentMonth.getUTCFullYear()}`;

  return {
    currency,
    monthlyTrend,
    expenseBreakdown,
    productBreakdown,
    periodLabel,
  };
}
