import { NextResponse } from "next/server";
import { createRSCClient } from "@/lib/supabase/server";
import { detectSpendingAnomalies } from "@/lib/ai/anomaly-detector";
import { sendBudgetAlertEmail, sendLargeTransactionEmail, checkEmailPreferences } from "@/lib/email/resend-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/ai/anomaly-detector
 * 
 * Анализирует траты пользователя и возвращает предупреждения о рисках
 */
export async function GET() {
  try {
    const supabase = await createRSCClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const report = await detectSpendingAnomalies(supabase, user.id);

    // Отправка email при критических алертах (с проверкой настроек)
    const criticalAlerts = report.alerts.filter((a) => a.severity === "critical" || a.severity === "high");
    
    if (criticalAlerts.length > 0 && user.email) {
      // Проверяем настройки email уведомлений
      const budgetAlertsEnabled = await checkEmailPreferences(user.id, "budget");
      const transactionAlertsEnabled = await checkEmailPreferences(user.id, "transaction");
      
      // Отправляем email асинхронно (не ждём результата)
      for (const alert of criticalAlerts) {
        // Бюджетные алерты
        if ((alert.type === "overspending" || alert.type === "budget_risk") && budgetAlertsEnabled && alert.category) {
          const alertData = alert as unknown as { budget_limit?: number; current_spent?: number; percentage?: number };
          const budgetLimit = alertData.budget_limit || 0;
          const currentSpent = alertData.current_spent || 0;
          const percentage = alertData.percentage || 0;
          
          sendBudgetAlertEmail({
            to: user.email,
            userName: user.user_metadata?.full_name || "Пользователь",
            categoryName: alert.category,
            budgetLimit,
            currentSpent,
            percentage,
          }).catch(err => console.error("Failed to send budget alert email:", err));
        } 
        // Алерты крупных транзакций
        else if (alert.type === "large_transaction" && transactionAlertsEnabled) {
          const alertData = alert as unknown as { transaction?: { amount?: number; note?: string; occurred_at?: string }; average_amount?: number };
          const transaction = alertData.transaction;
          const averageAmount = alertData.average_amount || 0;
          
          if (transaction) {
            sendLargeTransactionEmail({
              to: user.email,
              userName: user.user_metadata?.full_name || "Пользователь",
              amount: transaction.amount || 0,
              categoryName: alert.category || "Без категории",
              description: transaction.note || "Крупная транзакция",
              date: new Date(transaction.occurred_at || Date.now()).toLocaleDateString("ru-RU"),
              averageAmount,
            }).catch(err => console.error("Failed to send large transaction email:", err));
          }
        }
      }
    }

    return NextResponse.json({
      report,
      has_alerts: report.alerts.length > 0,
      alert_count: report.alerts.length,
      critical_count: report.alerts.filter((a) => a.severity === "critical").length,
      high_count: report.alerts.filter((a) => a.severity === "high").length,
      emails_sent: criticalAlerts.length,
    });
  } catch (error) {
    console.error("Anomaly detection error:", error);
    return NextResponse.json(
      {
        error: "Ошибка при анализе трат",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
