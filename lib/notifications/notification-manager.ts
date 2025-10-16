/**
 * Центральный менеджер уведомлений
 * 
 * Координирует все детекторы и генерирует уведомления
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { detectSpendingAnomalies, type SpendingAlert } from "./spending-detector";
import { detectInactivity, detectLowActivity, type ActivityAlert } from "./activity-detector";
import { detectUpcomingPayments, type PaymentAlert } from "./payment-detector";
import { detectBudgetAlerts, type BudgetAlert } from "./budget-detector";
import { sendTelegramMessage } from "@/lib/telegram/bot";

export interface NotificationPackage {
  user_id: string;
  spending_alerts: SpendingAlert[];
  activity_alerts: ActivityAlert[];
  payment_alerts: PaymentAlert[];
  budget_alerts: BudgetAlert[];
  summary: {
    total_alerts: number;
    high_priority: number;
    medium_priority: number;
    low_priority: number;
  };
  generated_at: string;
}

/**
 * Генерирует все уведомления для пользователя
 */
export async function generateNotifications(
  supabase: SupabaseClient,
  userId: string
): Promise<NotificationPackage> {
  // Запускаем все детекторы параллельно
  const [spendingAlerts, inactivityAlert, lowActivityAlert, paymentAlerts, budgetAlerts] =
    await Promise.all([
      detectSpendingAnomalies(supabase, userId),
      detectInactivity(supabase, userId),
      detectLowActivity(supabase, userId),
      detectUpcomingPayments(supabase, userId),
      detectBudgetAlerts(supabase, userId),
    ]);

  // Собираем activity alerts
  const activityAlerts: ActivityAlert[] = [];
  if (inactivityAlert) activityAlerts.push(inactivityAlert);
  if (lowActivityAlert) activityAlerts.push(lowActivityAlert);

  // Подсчитываем приоритеты
  const allAlerts = [
    ...spendingAlerts.map((a) => a.severity),
    ...activityAlerts.map((a) => a.severity),
    ...paymentAlerts.map((a) => a.severity),
    ...budgetAlerts.map((a) => a.severity),
  ];

  const highPriority = allAlerts.filter((s) => s === "high").length;
  const mediumPriority = allAlerts.filter((s) => s === "medium").length;
  const lowPriority = allAlerts.filter((s) => s === "low").length;

  return {
    user_id: userId,
    spending_alerts: spendingAlerts,
    activity_alerts: activityAlerts,
    payment_alerts: paymentAlerts,
    budget_alerts: budgetAlerts,
    summary: {
      total_alerts: allAlerts.length,
      high_priority: highPriority,
      medium_priority: mediumPriority,
      low_priority: lowPriority,
    },
    generated_at: new Date().toISOString(),
  };
}

/**
 * Сохраняет уведомления в базу данных (для истории)
 */
export async function saveNotifications(
  supabase: SupabaseClient,
  notifications: NotificationPackage
): Promise<void> {
  // Здесь можно сохранить в таблицу notifications_history, если она существует
  // Пока просто логируем
  console.log(`Generated ${notifications.summary.total_alerts} notifications for user ${notifications.user_id}`);
}

/**
 * Отправляет уведомления пользователю (Telegram, email, push, etc.)
 */
export async function sendNotifications(
  supabase: SupabaseClient,
  notifications: NotificationPackage
): Promise<{
  sent: number;
  failed: number;
}> {
  // Получаем настройки уведомлений пользователя
  const { data: settings } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", notifications.user_id)
    .single();

  if (!settings) {
    console.log(`No notification settings found for user ${notifications.user_id}`);
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  const failed = 0;

  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  // Собираем все алерты для отправки
  const alertsToSend: Array<{
    type: string;
    title: string;
    message: string;
    severity: string;
  }> = [];

  // Функция для генерации заголовка из типа
  const getTitle = (type: string): string => {
    const titles: Record<string, string> = {
      overspending: "Превышение трат",
      unusual_category: "Необычная категория",
      high_frequency: "Высокая частота трат",
      large_transaction: "Крупная транзакция",
      missing_transactions: "Забыли внести транзакции?",
      low_activity: "Низкая активность",
      reminder: "Напоминание",
      upcoming_payment: "Предстоящий платёж",
      payment_today: "Платёж сегодня",
      overdue_payment: "Просроченный платёж",
      budget_warning: "Внимание: бюджет",
      budget_critical: "Критично: бюджет",
      budget_exceeded: "Бюджет превышен",
    };
    return titles[type] || "Уведомление";
  };

  if (settings.overspend_alerts && notifications.spending_alerts.length > 0) {
    alertsToSend.push(
      ...notifications.spending_alerts.map((a) => ({
        type: "spending",
        title: getTitle(a.type),
        message: a.message,
        severity: a.severity,
      }))
    );
  }

  if (settings.missing_transaction_reminders && notifications.activity_alerts.length > 0) {
    alertsToSend.push(
      ...notifications.activity_alerts.map((a) => ({
        type: "activity",
        title: getTitle(a.type),
        message: a.message,
        severity: a.severity,
      }))
    );
  }

  if (settings.upcoming_payment_reminders && notifications.payment_alerts.length > 0) {
    alertsToSend.push(
      ...notifications.payment_alerts.map((a) => ({
        type: "payment",
        title: getTitle(a.type),
        message: a.message,
        severity: a.severity,
      }))
    );
  }

  if (settings.budget_warnings && notifications.budget_alerts.length > 0) {
    alertsToSend.push(
      ...notifications.budget_alerts.map((a) => ({
        type: "budget",
        title: getTitle(a.type),
        message: a.message,
        severity: a.severity,
      }))
    );
  }

  // Отправляем в Telegram если включено
  if (settings.telegram_enabled && settings.telegram_chat_id && botToken && alertsToSend.length > 0) {
    try {
      // Форматируем сообщение
      const severityEmoji: Record<string, string> = {
        high: "🚨",
        medium: "⚠️",
        low: "ℹ️",
      };

      let telegramMessage = `*🔔 Уведомления (${alertsToSend.length})*\n\n`;

      for (const alert of alertsToSend) {
        const emoji = severityEmoji[alert.severity] || "•";
        telegramMessage += `${emoji} *${alert.title}*\n${alert.message}\n\n`;
      }

      telegramMessage += `_Отправлено: ${new Date().toLocaleString("ru-RU")}_`;

      const success = await sendTelegramMessage(botToken, {
        chat_id: settings.telegram_chat_id,
        text: telegramMessage,
        parse_mode: "Markdown",
      });

      if (success) {
        sent += alertsToSend.length;
        console.log(`Sent ${alertsToSend.length} notifications to Telegram chat ${settings.telegram_chat_id}`);
      } else {
        console.error(`Failed to send notifications to Telegram chat ${settings.telegram_chat_id}`);
      }
    } catch (error) {
      console.error("Telegram send error:", error);
    }
  } else if (alertsToSend.length > 0) {
    // Если Telegram не включен, просто логируем
    console.log(`Would send ${alertsToSend.length} notifications (Telegram disabled or not configured)`);
    sent += alertsToSend.length;
  }

  return { sent, failed };
}
