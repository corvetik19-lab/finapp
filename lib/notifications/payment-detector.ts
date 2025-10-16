/**
 * Детектор предстоящих платежей
 * 
 * Отслеживает:
 * - Платежи за 3 дня
 * - Платежи завтра
 * - Просроченные платежи
 */

import { SupabaseClient } from "@supabase/supabase-js";

export interface PaymentAlert {
  type: "upcoming_payment" | "payment_today" | "overdue_payment";
  severity: "high" | "medium" | "low";
  payment_id: string;
  payment_name: string;
  amount: number;
  due_date: string;
  days_until_due: number;
  message: string;
  recommendation: string;
}

/**
 * Проверяет предстоящие платежи и генерирует уведомления
 */
export async function detectUpcomingPayments(
  supabase: SupabaseClient,
  userId: string
): Promise<PaymentAlert[]> {
  const alerts: PaymentAlert[] = [];

  // Получаем активные платежи на ближайшие 7 дней
  const now = new Date();
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const { data: payments } = await supabase
    .from("upcoming_payments")
    .select("*")
    .eq("user_id", userId)
    .lte("next_date", sevenDaysLater.toISOString())
    .order("next_date", { ascending: true });

  if (!payments || payments.length === 0) {
    return alerts;
  }

  payments.forEach((payment) => {
    const dueDate = new Date(payment.next_date);
    const daysUntil = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Просроченный платеж
    if (daysUntil < 0) {
      alerts.push({
        type: "overdue_payment",
        severity: "high",
        payment_id: payment.id,
        payment_name: payment.name,
        amount: payment.amount,
        due_date: payment.next_date,
        days_until_due: daysUntil,
        message: `Просроченный платёж: "${payment.name}" (${Math.abs(daysUntil)} ${getDaysWord(Math.abs(daysUntil))} назад)`,
        recommendation: `Срочно оплатите "${payment.name}" на сумму ${formatMoney(payment.amount)}`,
      });
    }
    // Сегодня
    else if (daysUntil === 0) {
      alerts.push({
        type: "payment_today",
        severity: "high",
        payment_id: payment.id,
        payment_name: payment.name,
        amount: payment.amount,
        due_date: payment.next_date,
        days_until_due: daysUntil,
        message: `Платёж сегодня: "${payment.name}" (${formatMoney(payment.amount)})`,
        recommendation: `Не забудьте оплатить "${payment.name}" сегодня`,
      });
    }
    // Завтра
    else if (daysUntil === 1) {
      alerts.push({
        type: "upcoming_payment",
        severity: "high",
        payment_id: payment.id,
        payment_name: payment.name,
        amount: payment.amount,
        due_date: payment.next_date,
        days_until_due: daysUntil,
        message: `Платёж завтра: "${payment.name}" (${formatMoney(payment.amount)})`,
        recommendation: `Подготовьте средства для оплаты "${payment.name}"`,
      });
    }
    // Через 2-3 дня
    else if (daysUntil <= 3) {
      alerts.push({
        type: "upcoming_payment",
        severity: "medium",
        payment_id: payment.id,
        payment_name: payment.name,
        amount: payment.amount,
        due_date: payment.next_date,
        days_until_due: daysUntil,
        message: `Скоро платёж: "${payment.name}" через ${daysUntil} ${getDaysWord(daysUntil)}`,
        recommendation: `Запланируйте оплату "${payment.name}" на ${formatMoney(payment.amount)}`,
      });
    }
    // Через 4-7 дней (только для крупных платежей)
    else if (daysUntil <= 7 && payment.amount >= 50000) { // >= 500 рублей
      alerts.push({
        type: "upcoming_payment",
        severity: "low",
        payment_id: payment.id,
        payment_name: payment.name,
        amount: payment.amount,
        due_date: payment.next_date,
        days_until_due: daysUntil,
        message: `Крупный платёж через ${daysUntil} ${getDaysWord(daysUntil)}: "${payment.name}"`,
        recommendation: `Убедитесь, что у вас достаточно средств для "${payment.name}"`,
      });
    }
  });

  return alerts.sort((a, b) => {
    // Сортируем: просроченные > сегодня > завтра > по дате
    const severityOrder = { high: 0, medium: 1, low: 2 };
    if (a.severity !== b.severity) {
      return severityOrder[a.severity] - severityOrder[b.severity];
    }
    return a.days_until_due - b.days_until_due;
  });
}

/**
 * Получает сводку платежей на неделю
 */
export async function getWeeklyPaymentsSummary(
  supabase: SupabaseClient,
  userId: string
): Promise<{
  total_amount: number;
  payments_count: number;
  critical_count: number; // просроченные + сегодня + завтра
}> {
  const now = new Date();
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const { data: payments } = await supabase
    .from("upcoming_payments")
    .select("amount, next_date")
    .eq("user_id", userId)
    .lte("next_date", sevenDaysLater.toISOString());

  if (!payments) {
    return { total_amount: 0, payments_count: 0, critical_count: 0 };
  }

  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  
  const criticalCount = payments.filter((p) => {
    const dueDate = new Date(p.next_date);
    const daysUntil = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntil <= 1; // сегодня, завтра или просрочено
  }).length;

  return {
    total_amount: totalAmount,
    payments_count: payments.length,
    critical_count: criticalCount,
  };
}

function getDaysWord(days: number): string {
  if (days % 10 === 1 && days % 100 !== 11) {
    return "день";
  } else if ([2, 3, 4].includes(days % 10) && ![12, 13, 14].includes(days % 100)) {
    return "дня";
  } else {
    return "дней";
  }
}

function formatMoney(kopecks: number): string {
  const rubles = kopecks / 100;
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(rubles);
}
