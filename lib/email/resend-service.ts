import { Resend } from "resend";
import { render } from "@react-email/render";
import BudgetAlertEmail from "./templates/BudgetAlert";
import LargeTransactionAlert from "./templates/LargeTransactionAlert";
import WeeklySummary from "./templates/WeeklySummary";

// Инициализация Resend
const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "Finapp <noreply@finapp.com>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * Отправка email уведомления о превышении бюджета
 */
export async function sendBudgetAlertEmail(params: {
  to: string;
  userName: string;
  categoryName: string;
  budgetLimit: number;
  currentSpent: number;
  percentage: number;
}) {
  try {
    const emailHtml = (await render(
      BudgetAlertEmail({
        ...params,
        appUrl: APP_URL,
      })
    )) as unknown as string;

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: `⚠️ Бюджет "${params.categoryName}": ${params.percentage.toFixed(0)}% использовано`,
      html: emailHtml,
    });

    if (error) {
      console.error("Budget alert email error:", error);
      throw error;
    }

    console.log("Budget alert email sent:", data?.id);
    return { success: true, id: data?.id };
  } catch (error) {
    console.error("Failed to send budget alert email:", error);
    return { success: false, error };
  }
}

/**
 * Отправка уведомления о крупной транзакции
 */
export async function sendLargeTransactionEmail(params: {
  to: string;
  userName: string;
  amount: number;
  categoryName: string;
  description: string;
  date: string;
  averageAmount: number;
}) {
  try {
    const emailHtml = (await render(
      LargeTransactionAlert({
        ...params,
        appUrl: APP_URL,
      })
    )) as unknown as string;

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: `💸 Крупная транзакция: ${(params.amount / 100).toFixed(2)} ₽`,
      html: emailHtml,
    });

    if (error) {
      console.error("Large transaction email error:", error);
      throw error;
    }

    console.log("Large transaction email sent:", data?.id);
    return { success: true, id: data?.id };
  } catch (error) {
    console.error("Failed to send large transaction email:", error);
    return { success: false, error };
  }
}

/**
 * Отправка еженедельного отчёта
 */
export async function sendWeeklySummaryEmail(params: {
  to: string;
  userName: string;
  weekStart: string;
  weekEnd: string;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  topCategories: Array<{
    name: string;
    amount: number;
    percentage: number;
  }>;
  transactionCount: number;
}) {
  try {
    const emailHtml = (await render(
      WeeklySummary({
        ...params,
        appUrl: APP_URL,
      })
    )) as unknown as string;

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: `📊 Ваш финансовый отчёт за ${params.weekStart} - ${params.weekEnd}`,
      html: emailHtml,
    });

    if (error) {
      console.error("Weekly summary email error:", error);
      throw error;
    }

    console.log("Weekly summary email sent:", data?.id);
    return { success: true, id: data?.id };
  } catch (error) {
    console.error("Failed to send weekly summary email:", error);
    return { success: false, error };
  }
}

/**
 * Проверка настроек email уведомлений пользователя
 */
export async function checkEmailPreferences(userId: string, type: "budget" | "transaction" | "weekly"): Promise<boolean> {
  try {
    // Динамический импорт для избежания циклических зависимостей
    const { createClient } = await import("@supabase/supabase-js");
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from("user_email_preferences")
      .select("budget_alerts_enabled, transaction_alerts_enabled, weekly_summary_enabled")
      .eq("user_id", userId)
      .single();

    // Если настроек нет, используем дефолтные значения
    if (error && error.code === "PGRST116") {
      return type !== "weekly"; // По умолчанию бюджет и транзакции включены, еженедельная сводка выключена
    }

    if (error) {
      console.error("Check email preferences error:", error);
      return true; // В случае ошибки отправляем уведомление
    }

    // Проверяем соответствующую настройку
    switch (type) {
      case "budget":
        return data.budget_alerts_enabled ?? true;
      case "transaction":
        return data.transaction_alerts_enabled ?? true;
      case "weekly":
        return data.weekly_summary_enabled ?? false;
      default:
        return true;
    }
  } catch (error) {
    console.error("Check email preferences error:", error);
    return true; // В случае ошибки отправляем уведомление
  }
}

/**
 * Отправка тестового email
 */
export async function sendTestEmail(to: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: "✅ Тестовое письмо от Finapp",
      html: `
        <h1>Поздравляем!</h1>
        <p>Email уведомления настроены и работают корректно.</p>
        <p>Теперь вы будете получать важные уведомления о ваших финансах.</p>
      `,
    });

    if (error) throw error;

    return { success: true, id: data?.id };
  } catch (error) {
    console.error("Test email error:", error);
    return { success: false, error };
  }
}
