"use server";

import { createRSCClient } from "@/lib/supabase/server";
import type { Investment } from "./types";
import { INVESTMENT_STATUS_LABELS } from "./types";
import { formatMoney } from "./calculations";
import { getUpcomingPayments, getOverdueInvestments } from "./returns";

// ============================================
// Email уведомления для модуля инвестиций
// ============================================

export type NotificationType = 
  | "payment_reminder"      // Напоминание о платеже
  | "payment_overdue"       // Просрочка платежа
  | "investment_created"    // Инвестиция создана
  | "investment_received"   // Средства получены
  | "investment_completed"  // Инвестиция завершена
  | "status_changed";       // Статус изменён

export interface NotificationTemplate {
  type: NotificationType;
  subject: string;
  body: string;
}

export interface NotificationSettings {
  userId: string;
  emailPaymentReminders: boolean;
  emailOverdueAlerts: boolean;
  emailStatusChanges: boolean;
  reminderDaysBefore: number;
}

export interface PendingNotification {
  id: string;
  userId: string;
  investmentId: string;
  notificationType: NotificationType;
  recipientEmail: string;
  subject: string;
  body: string;
  status: "pending" | "sent" | "failed";
  scheduledAt: string;
  sentAt: string | null;
  error: string | null;
}

/**
 * Получение настроек уведомлений пользователя
 */
export async function getNotificationSettings(userId: string): Promise<NotificationSettings> {
  const supabase = await createRSCClient();
  
  const { data } = await supabase
    .from("investor_notification_settings")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (data) {
    return {
      userId: data.user_id,
      emailPaymentReminders: data.email_payment_reminders,
      emailOverdueAlerts: data.email_overdue_alerts,
      emailStatusChanges: data.email_status_changes,
      reminderDaysBefore: data.reminder_days_before,
    };
  }

  // Возвращаем дефолтные настройки
  return {
    userId,
    emailPaymentReminders: true,
    emailOverdueAlerts: true,
    emailStatusChanges: true,
    reminderDaysBefore: 3,
  };
}

/**
 * Сохранение настроек уведомлений
 */
export async function saveNotificationSettings(
  settings: NotificationSettings
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  
  const { error } = await supabase
    .from("investor_notification_settings")
    .upsert({
      user_id: settings.userId,
      email_payment_reminders: settings.emailPaymentReminders,
      email_overdue_alerts: settings.emailOverdueAlerts,
      email_status_changes: settings.emailStatusChanges,
      reminder_days_before: settings.reminderDaysBefore,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Создание уведомления о платеже
 */
export async function createPaymentReminderNotification(
  investment: Investment,
  recipientEmail: string,
  daysUntilDue: number
): Promise<{ success: boolean; notificationId?: string }> {
  const supabase = await createRSCClient();
  
  const remaining = investment.total_return_amount - investment.returned_principal - investment.returned_interest;

  const subject = `Напоминание: платёж по инвестиции ${investment.investment_number} через ${daysUntilDue} дн.`;
  const body = generatePaymentReminderEmail(investment, daysUntilDue, remaining);

  const { data, error } = await supabase
    .from("investor_notifications")
    .insert({
      user_id: investment.user_id,
      investment_id: investment.id,
      notification_type: "payment_reminder",
      recipient_email: recipientEmail,
      subject,
      body,
      status: "pending",
      scheduled_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating notification:", error);
    return { success: false };
  }

  return { success: true, notificationId: data.id };
}

/**
 * Создание уведомления о просрочке
 */
export async function createOverdueNotification(
  investment: Investment,
  recipientEmail: string,
  daysOverdue: number
): Promise<{ success: boolean; notificationId?: string }> {
  const supabase = await createRSCClient();
  
  const remaining = investment.total_return_amount - investment.returned_principal - investment.returned_interest;

  const subject = `⚠️ Просрочка: инвестиция ${investment.investment_number} — ${daysOverdue} дн.`;
  const body = generateOverdueEmail(investment, daysOverdue, remaining);

  const { data, error } = await supabase
    .from("investor_notifications")
    .insert({
      user_id: investment.user_id,
      investment_id: investment.id,
      notification_type: "payment_overdue",
      recipient_email: recipientEmail,
      subject,
      body,
      status: "pending",
      scheduled_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating notification:", error);
    return { success: false };
  }

  return { success: true, notificationId: data.id };
}

/**
 * Создание уведомления об изменении статуса
 */
export async function createStatusChangeNotification(
  investment: Investment,
  recipientEmail: string,
  oldStatus: string,
  newStatus: string
): Promise<{ success: boolean; notificationId?: string }> {
  const supabase = await createRSCClient();

  const subject = `Статус инвестиции ${investment.investment_number} изменён`;
  const body = generateStatusChangeEmail(investment, oldStatus, newStatus);

  const { data, error } = await supabase
    .from("investor_notifications")
    .insert({
      user_id: investment.user_id,
      investment_id: investment.id,
      notification_type: "status_changed",
      recipient_email: recipientEmail,
      subject,
      body,
      status: "pending",
      scheduled_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating notification:", error);
    return { success: false };
  }

  return { success: true, notificationId: data.id };
}

/**
 * Обработка напоминаний о возвратах (для CRON)
 */
export async function processPaymentReminders(): Promise<{
  processed: number;
  reminders: number;
  overdueAlerts: number;
}> {
  const supabase = await createRSCClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { processed: 0, reminders: 0, overdueAlerts: 0 };
  }

  const settings = await getNotificationSettings(user.id);
  
  let reminders = 0;
  let overdueAlerts = 0;

  // Обрабатываем предстоящие платежи
  if (settings.emailPaymentReminders) {
    const upcoming = await getUpcomingPayments(settings.reminderDaysBefore);
    
    for (const investment of upcoming) {
      const dueDate = new Date(investment.due_date);
      const today = new Date();
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / 86400000);
      
      // Проверяем, не отправляли ли уже
      const { data: existing } = await supabase
        .from("investor_notifications")
        .select("id")
        .eq("investment_id", investment.id)
        .eq("notification_type", "payment_reminder")
        .gte("scheduled_at", new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString())
        .single();

      if (!existing && user.email) {
        await createPaymentReminderNotification(investment, user.email, daysUntilDue);
        reminders++;
      }
    }
  }

  // Обрабатываем просрочки
  if (settings.emailOverdueAlerts) {
    const overdue = await getOverdueInvestments();
    
    for (const investment of overdue) {
      const dueDate = new Date(investment.due_date);
      const today = new Date();
      const daysOverdue = Math.ceil((today.getTime() - dueDate.getTime()) / 86400000);
      
      // Проверяем, не отправляли ли уже сегодня
      const { data: existing } = await supabase
        .from("investor_notifications")
        .select("id")
        .eq("investment_id", investment.id)
        .eq("notification_type", "payment_overdue")
        .gte("scheduled_at", new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString())
        .single();

      if (!existing && user.email) {
        await createOverdueNotification(investment, user.email, daysOverdue);
        overdueAlerts++;
      }
    }
  }

  return {
    processed: reminders + overdueAlerts,
    reminders,
    overdueAlerts,
  };
}

/**
 * Получение истории уведомлений
 */
export async function getNotificationHistory(
  investmentId?: string,
  limit: number = 50
): Promise<PendingNotification[]> {
  const supabase = await createRSCClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return [];

  let query = supabase
    .from("investor_notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("scheduled_at", { ascending: false })
    .limit(limit);

  if (investmentId) {
    query = query.eq("investment_id", investmentId);
  }

  const { data } = await query;

  return (data || []).map(n => ({
    id: n.id,
    userId: n.user_id,
    investmentId: n.investment_id,
    notificationType: n.notification_type,
    recipientEmail: n.recipient_email,
    subject: n.subject,
    body: n.body,
    status: n.status,
    scheduledAt: n.scheduled_at,
    sentAt: n.sent_at,
    error: n.error,
  }));
}

// ============================================
// Генераторы email контента
// ============================================

function generatePaymentReminderEmail(investment: Investment, daysUntilDue: number, remaining: number): string {
  return `
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <h2>Напоминание о платеже</h2>
  
  <p>Уважаемый пользователь,</p>
  
  <p>Напоминаем, что через <strong>${daysUntilDue} ${getDaysWord(daysUntilDue)}</strong> наступает срок возврата по инвестиции:</p>
  
  <table style="border-collapse: collapse; margin: 20px 0;">
    <tr><td style="padding: 8px; border: 1px solid #ddd;">Номер:</td><td style="padding: 8px; border: 1px solid #ddd;"><strong>${investment.investment_number}</strong></td></tr>
    <tr><td style="padding: 8px; border: 1px solid #ddd;">Источник:</td><td style="padding: 8px; border: 1px solid #ddd;">${investment.source?.name || "—"}</td></tr>
    <tr><td style="padding: 8px; border: 1px solid #ddd;">Дата возврата:</td><td style="padding: 8px; border: 1px solid #ddd;">${new Date(investment.due_date).toLocaleDateString("ru-RU")}</td></tr>
    <tr><td style="padding: 8px; border: 1px solid #ddd;">К возврату:</td><td style="padding: 8px; border: 1px solid #ddd;"><strong>${formatMoney(remaining)}</strong></td></tr>
  </table>
  
  <p>Пожалуйста, убедитесь, что платёж будет произведён вовремя.</p>
  
  <p style="color: #666; font-size: 12px;">Это автоматическое уведомление. Не отвечайте на это письмо.</p>
</body>
</html>
  `;
}

function generateOverdueEmail(investment: Investment, daysOverdue: number, remaining: number): string {
  return `
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <h2 style="color: #d32f2f;">⚠️ Просрочка платежа</h2>
  
  <p>Уважаемый пользователь,</p>
  
  <p>Срок возврата по инвестиции <strong>просрочен на ${daysOverdue} ${getDaysWord(daysOverdue)}</strong>:</p>
  
  <table style="border-collapse: collapse; margin: 20px 0;">
    <tr><td style="padding: 8px; border: 1px solid #ddd;">Номер:</td><td style="padding: 8px; border: 1px solid #ddd;"><strong>${investment.investment_number}</strong></td></tr>
    <tr><td style="padding: 8px; border: 1px solid #ddd;">Источник:</td><td style="padding: 8px; border: 1px solid #ddd;">${investment.source?.name || "—"}</td></tr>
    <tr><td style="padding: 8px; border: 1px solid #ddd;">Дата возврата:</td><td style="padding: 8px; border: 1px solid #ddd; color: #d32f2f;">${new Date(investment.due_date).toLocaleDateString("ru-RU")}</td></tr>
    <tr><td style="padding: 8px; border: 1px solid #ddd;">Задолженность:</td><td style="padding: 8px; border: 1px solid #ddd;"><strong style="color: #d32f2f;">${formatMoney(remaining)}</strong></td></tr>
  </table>
  
  <p><strong>Требуется срочное внимание!</strong> Просрочка может привести к начислению пени и ухудшению кредитной истории.</p>
  
  <p style="color: #666; font-size: 12px;">Это автоматическое уведомление. Не отвечайте на это письмо.</p>
</body>
</html>
  `;
}

function generateStatusChangeEmail(investment: Investment, oldStatus: string, newStatus: string): string {
  const oldLabel = INVESTMENT_STATUS_LABELS[oldStatus as keyof typeof INVESTMENT_STATUS_LABELS] || oldStatus;
  const newLabel = INVESTMENT_STATUS_LABELS[newStatus as keyof typeof INVESTMENT_STATUS_LABELS] || newStatus;

  return `
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <h2>Изменение статуса инвестиции</h2>
  
  <p>Уважаемый пользователь,</p>
  
  <p>Статус инвестиции <strong>${investment.investment_number}</strong> был изменён:</p>
  
  <p style="font-size: 18px; margin: 20px 0;">
    <span style="color: #666;">${oldLabel}</span>
    <span style="margin: 0 10px;">→</span>
    <span style="color: #1976d2; font-weight: bold;">${newLabel}</span>
  </p>
  
  <table style="border-collapse: collapse; margin: 20px 0;">
    <tr><td style="padding: 8px; border: 1px solid #ddd;">Источник:</td><td style="padding: 8px; border: 1px solid #ddd;">${investment.source?.name || "—"}</td></tr>
    <tr><td style="padding: 8px; border: 1px solid #ddd;">Сумма:</td><td style="padding: 8px; border: 1px solid #ddd;">${formatMoney(investment.approved_amount)}</td></tr>
  </table>
  
  <p style="color: #666; font-size: 12px;">Это автоматическое уведомление. Не отвечайте на это письмо.</p>
</body>
</html>
  `;
}

function getDaysWord(days: number): string {
  const abs = Math.abs(days);
  if (abs % 10 === 1 && abs % 100 !== 11) return "день";
  if ([2, 3, 4].includes(abs % 10) && ![12, 13, 14].includes(abs % 100)) return "дня";
  return "дней";
}
