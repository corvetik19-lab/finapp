import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * CRON endpoint для обработки уведомлений инвесторов
 * Запускается ежедневно через Vercel Cron
 * 
 * Функции:
 * - Напоминания о предстоящих платежах
 * - Уведомления о просрочках
 * - Расчёт пени при просрочке
 */
export async function GET(request: NextRequest) {
  // Проверка авторизации CRON
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  let processedReminders = 0;
  let processedOverdue = 0;
  let penaltyCalculated = 0;

  try {
    // 1. Получаем все активные инвестиции с настройками уведомлений
    const { data: investments, error: invError } = await supabase
      .from("investments")
      .select(`
        *,
        source:investment_sources!investments_source_id_fkey(id, name)
      `)
      .in("status", ["active", "in_progress", "overdue"])
      .order("due_date", { ascending: true });

    if (invError) {
      throw new Error(`Failed to fetch investments: ${invError.message}`);
    }

    // 2. Получаем настройки уведомлений для всех пользователей
    const userIds = [...new Set(investments?.map(i => i.user_id) || [])];
    
    const { data: settings } = await supabase
      .from("investor_notification_settings")
      .select("*")
      .in("user_id", userIds);

    const settingsMap = new Map(
      (settings || []).map(s => [s.user_id, s])
    );

    // 3. Получаем email пользователей
    const { data: users } = await supabase.auth.admin.listUsers();
    const emailMap = new Map(
      (users?.users || []).map(u => [u.id, u.email])
    );

    // 4. Обрабатываем каждую инвестицию
    for (const inv of investments || []) {
      const userSettings = settingsMap.get(inv.user_id) || {
        email_payment_reminders: true,
        email_overdue_alerts: true,
        reminder_days_before: 7,
      };
      const userEmail = emailMap.get(inv.user_id);

      if (!userEmail) continue;

      const dueDate = new Date(inv.due_date);
      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / 86400000);

      // Напоминание о предстоящем платеже
      if (userSettings.email_payment_reminders && daysUntilDue > 0 && daysUntilDue <= userSettings.reminder_days_before) {
        // Проверяем, не отправляли ли уже сегодня
        const { data: existing } = await supabase
          .from("investor_notifications")
          .select("id")
          .eq("investment_id", inv.id)
          .eq("notification_type", "payment_reminder")
          .gte("scheduled_at", `${today}T00:00:00`)
          .maybeSingle();

        if (!existing) {
          const remaining = inv.total_return_amount - (inv.returned_principal || 0) - (inv.returned_interest || 0);
          
          await supabase.from("investor_notifications").insert({
            user_id: inv.user_id,
            investment_id: inv.id,
            notification_type: "payment_reminder",
            recipient_email: userEmail,
            subject: `Напоминание: платёж по ${inv.investment_number} через ${daysUntilDue} дн.`,
            body: generateReminderBody(inv, daysUntilDue, remaining),
            status: "pending",
            scheduled_at: now.toISOString(),
          });
          processedReminders++;
        }
      }

      // Уведомление о просрочке
      if (userSettings.email_overdue_alerts && daysUntilDue < 0) {
        const daysOverdue = Math.abs(daysUntilDue);

        // Обновляем статус на overdue если ещё не обновлён
        if (inv.status !== "overdue") {
          await supabase
            .from("investments")
            .update({ status: "overdue", updated_at: now.toISOString() })
            .eq("id", inv.id);
        }

        // Отправляем уведомление раз в 3 дня
        const { data: lastNotif } = await supabase
          .from("investor_notifications")
          .select("scheduled_at")
          .eq("investment_id", inv.id)
          .eq("notification_type", "payment_overdue")
          .order("scheduled_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const shouldNotify = !lastNotif || 
          (now.getTime() - new Date(lastNotif.scheduled_at).getTime()) > 3 * 24 * 60 * 60 * 1000;

        if (shouldNotify) {
          const remaining = inv.total_return_amount - (inv.returned_principal || 0) - (inv.returned_interest || 0);
          
          await supabase.from("investor_notifications").insert({
            user_id: inv.user_id,
            investment_id: inv.id,
            notification_type: "payment_overdue",
            recipient_email: userEmail,
            subject: `⚠️ Просрочка: ${inv.investment_number} — ${daysOverdue} дн.`,
            body: generateOverdueBody(inv, daysOverdue, remaining),
            status: "pending",
            scheduled_at: now.toISOString(),
          });
          processedOverdue++;
        }

        // 5. Расчёт пени при просрочке
        if (inv.penalty_rate && inv.penalty_rate > 0) {
          const graceDays = inv.penalty_grace_days || 0;
          if (daysOverdue > graceDays) {
            const penaltyDays = daysOverdue - graceDays;
            const remaining = inv.total_return_amount - (inv.returned_principal || 0) - (inv.returned_interest || 0);
            const dailyPenalty = Math.round(remaining * (inv.penalty_rate / 100));
            const totalPenalty = dailyPenalty * penaltyDays;

            if (totalPenalty !== inv.accumulated_penalty) {
              await supabase
                .from("investments")
                .update({
                  accumulated_penalty: totalPenalty,
                  updated_at: now.toISOString(),
                })
                .eq("id", inv.id);
              penaltyCalculated++;
            }
          }
        }
      }
    }

    logger.info(`CRON investor-notifications: reminders=${processedReminders}, overdue=${processedOverdue}, penalty=${penaltyCalculated}`);

    return NextResponse.json({
      success: true,
      processed: {
        reminders: processedReminders,
        overdueAlerts: processedOverdue,
        penaltyCalculations: penaltyCalculated,
      },
      timestamp: now.toISOString(),
    });
  } catch (error) {
    logger.error("CRON investor-notifications error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

interface InvestmentData {
  due_date: string;
  investment_number: string;
  source?: { name: string } | null;
}

function generateReminderBody(inv: InvestmentData, daysUntilDue: number, remaining: number): string {
  const dueDate = new Date(inv.due_date).toLocaleDateString("ru-RU");
  const amount = (remaining / 100).toLocaleString("ru-RU", { style: "currency", currency: "RUB" });

  return `
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6;">
  <h2>Напоминание о платеже</h2>
  <p>Через <strong>${daysUntilDue} дн.</strong> наступает срок возврата:</p>
  <ul>
    <li>Инвестиция: <strong>${inv.investment_number}</strong></li>
    <li>Источник: ${inv.source?.name || "—"}</li>
    <li>Дата возврата: ${dueDate}</li>
    <li>К возврату: <strong>${amount}</strong></li>
  </ul>
</body>
</html>`;
}

function generateOverdueBody(inv: InvestmentData, daysOverdue: number, remaining: number): string {
  const dueDate = new Date(inv.due_date).toLocaleDateString("ru-RU");
  const amount = (remaining / 100).toLocaleString("ru-RU", { style: "currency", currency: "RUB" });

  return `
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6;">
  <h2 style="color: #d32f2f;">⚠️ Просрочка платежа</h2>
  <p>Срок возврата просрочен на <strong>${daysOverdue} дн.</strong>:</p>
  <ul>
    <li>Инвестиция: <strong>${inv.investment_number}</strong></li>
    <li>Источник: ${inv.source?.name || "—"}</li>
    <li>Дата возврата: ${dueDate}</li>
    <li>Задолженность: <strong style="color: #d32f2f;">${amount}</strong></li>
  </ul>
  <p><strong>Требуется срочное внимание!</strong></p>
</body>
</html>`;
}
