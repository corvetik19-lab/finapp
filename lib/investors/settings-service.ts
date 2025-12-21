"use server";

import { createRSCClient } from "@/lib/supabase/server";

export interface InvestorNotificationSettings {
  emailPaymentReminders: boolean;
  emailOverdueAlerts: boolean;
  emailStatusChanges: boolean;
  emailTenderEvents: boolean;
  telegramEnabled: boolean;
  telegramChatId: string | null;
  reminderDaysBefore: number;
  weeklyReport: boolean;
  monthlyReport: boolean;
}

export interface InvestorDefaults {
  defaultInterestRate: number;
  defaultPeriodDays: number;
  defaultPenaltyRate: number;
  penaltyGraceDays: number;
  autoCalculatePenalty: boolean;
  defaultCommissionRate: number;
  guaranteeReminderDays: number;
  autoRenewReminder: boolean;
  showCompletedInvestments: boolean;
  defaultCurrency: string;
  dateFormat: string;
}

export interface InvestorSettings {
  notifications: InvestorNotificationSettings;
  defaults: InvestorDefaults;
}

const defaultNotificationSettings: InvestorNotificationSettings = {
  emailPaymentReminders: true,
  emailOverdueAlerts: true,
  emailStatusChanges: true,
  emailTenderEvents: true,
  telegramEnabled: false,
  telegramChatId: null,
  reminderDaysBefore: 7,
  weeklyReport: false,
  monthlyReport: true,
};

const defaultDefaults: InvestorDefaults = {
  defaultInterestRate: 24,
  defaultPeriodDays: 90,
  defaultPenaltyRate: 0.1,
  penaltyGraceDays: 3,
  autoCalculatePenalty: true,
  defaultCommissionRate: 2.5,
  guaranteeReminderDays: 30,
  autoRenewReminder: true,
  showCompletedInvestments: false,
  defaultCurrency: "RUB",
  dateFormat: "dd.MM.yyyy",
};

export async function getInvestorSettings(): Promise<InvestorSettings> {
  const supabase = await createRSCClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return {
      notifications: defaultNotificationSettings,
      defaults: defaultDefaults,
    };
  }

  const [notifResult, defaultsResult] = await Promise.all([
    supabase
      .from("investor_notification_settings")
      .select("*")
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("investor_defaults")
      .select("*")
      .eq("user_id", user.id)
      .single(),
  ]);

  const notifications: InvestorNotificationSettings = notifResult.data
    ? {
        emailPaymentReminders: notifResult.data.email_payment_reminders,
        emailOverdueAlerts: notifResult.data.email_overdue_alerts,
        emailStatusChanges: notifResult.data.email_status_changes,
        emailTenderEvents: notifResult.data.email_tender_events,
        telegramEnabled: notifResult.data.telegram_enabled,
        telegramChatId: notifResult.data.telegram_chat_id,
        reminderDaysBefore: notifResult.data.reminder_days_before,
        weeklyReport: notifResult.data.weekly_report,
        monthlyReport: notifResult.data.monthly_report,
      }
    : defaultNotificationSettings;

  const defaults: InvestorDefaults = defaultsResult.data
    ? {
        defaultInterestRate: Number(defaultsResult.data.default_interest_rate),
        defaultPeriodDays: defaultsResult.data.default_period_days,
        defaultPenaltyRate: Number(defaultsResult.data.default_penalty_rate),
        penaltyGraceDays: defaultsResult.data.penalty_grace_days,
        autoCalculatePenalty: defaultsResult.data.auto_calculate_penalty,
        defaultCommissionRate: Number(defaultsResult.data.default_commission_rate),
        guaranteeReminderDays: defaultsResult.data.guarantee_reminder_days,
        autoRenewReminder: defaultsResult.data.auto_renew_reminder,
        showCompletedInvestments: defaultsResult.data.show_completed_investments,
        defaultCurrency: defaultsResult.data.default_currency,
        dateFormat: defaultsResult.data.date_format,
      }
    : defaultDefaults;

  return { notifications, defaults };
}

export async function saveInvestorSettings(
  settings: InvestorSettings
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { success: false, error: "Не авторизован" };
  }

  const [notifError, defaultsError] = await Promise.all([
    supabase.from("investor_notification_settings").upsert({
      user_id: user.id,
      email_payment_reminders: settings.notifications.emailPaymentReminders,
      email_overdue_alerts: settings.notifications.emailOverdueAlerts,
      email_status_changes: settings.notifications.emailStatusChanges,
      email_tender_events: settings.notifications.emailTenderEvents,
      telegram_enabled: settings.notifications.telegramEnabled,
      telegram_chat_id: settings.notifications.telegramChatId,
      reminder_days_before: settings.notifications.reminderDaysBefore,
      weekly_report: settings.notifications.weeklyReport,
      monthly_report: settings.notifications.monthlyReport,
      updated_at: new Date().toISOString(),
    }),
    supabase.from("investor_defaults").upsert({
      user_id: user.id,
      default_interest_rate: settings.defaults.defaultInterestRate,
      default_period_days: settings.defaults.defaultPeriodDays,
      default_penalty_rate: settings.defaults.defaultPenaltyRate,
      penalty_grace_days: settings.defaults.penaltyGraceDays,
      auto_calculate_penalty: settings.defaults.autoCalculatePenalty,
      default_commission_rate: settings.defaults.defaultCommissionRate,
      guarantee_reminder_days: settings.defaults.guaranteeReminderDays,
      auto_renew_reminder: settings.defaults.autoRenewReminder,
      show_completed_investments: settings.defaults.showCompletedInvestments,
      default_currency: settings.defaults.defaultCurrency,
      date_format: settings.defaults.dateFormat,
      updated_at: new Date().toISOString(),
    }),
  ]);

  if (notifError.error) {
    return { success: false, error: notifError.error.message };
  }
  if (defaultsError.error) {
    return { success: false, error: defaultsError.error.message };
  }

  return { success: true };
}
