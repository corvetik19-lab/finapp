import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateNotifications, sendNotifications } from "@/lib/notifications/notification-manager";

// Service role client для CRON задач
function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes

/**
 * CRON задача: Генерация умных уведомлений
 * Запускается ежедневно в 09:00
 * 
 * Использует новую систему детекторов:
 * - spending-detector: аномалии трат
 * - activity-detector: напоминания о транзакциях
 * - payment-detector: предстоящие платежи
 * - budget-detector: бюджетные алерты
 */
export async function GET(request: Request) {
  try {
    // Проверка auth токена для CRON
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getServiceClient();
    const results = {
      processed: 0,
      total_alerts: 0,
      sent: 0,
      failed: 0,
      errors: 0,
    };

    // Получаем всех пользователей с активными настройками уведомлений
    // и фильтруем по расписанию
    const currentTime = new Date();
    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();
    const currentDay = currentTime.getDay() || 7; // 0=вс → 7, 1-6 остаются как есть

    const { data: settings, error: settingsError } = await supabase
      .from("notification_preferences")
      .select("user_id, schedule_enabled, schedule_time, schedule_days, quiet_hours_start, quiet_hours_end")
      .or("overspend_alerts.eq.true,missing_transaction_reminders.eq.true,upcoming_payment_reminders.eq.true,budget_warnings.eq.true");

    if (settingsError) {
      console.error("Error fetching notification settings:", settingsError);
      throw settingsError;
    }

    // Фильтруем пользователей по расписанию
    const usersToNotify = (settings || []).filter((s) => {
      // Проверяем, включено ли расписание
      if (!s.schedule_enabled) return false;

      // Проверяем день недели
      if (!s.schedule_days || !s.schedule_days.includes(currentDay)) {
        return false;
      }

      // Проверяем время (с допуском ±30 минут)
      if (s.schedule_time) {
        const [scheduleHour, scheduleMinute] = s.schedule_time.split(":").map(Number);
        const scheduleTotalMinutes = scheduleHour * 60 + scheduleMinute;
        const currentTotalMinutes = currentHour * 60 + currentMinute;
        const diff = Math.abs(scheduleTotalMinutes - currentTotalMinutes);
        
        if (diff > 30) return false;
      }

      // Проверяем тихие часы
      if (s.quiet_hours_start && s.quiet_hours_end) {
        const [qhStartHour, qhStartMinute] = s.quiet_hours_start.split(":").map(Number);
        const [qhEndHour, qhEndMinute] = s.quiet_hours_end.split(":").map(Number);
        const qhStart = qhStartHour * 60 + qhStartMinute;
        const qhEnd = qhEndHour * 60 + qhEndMinute;
        const current = currentHour * 60 + currentMinute;

        // Обрабатываем переход через полночь
        if (qhStart < qhEnd) {
          if (current >= qhStart && current < qhEnd) return false;
        } else {
          if (current >= qhStart || current < qhEnd) return false;
        }
      }

      return true;
    });

    const uniqueUserIds = usersToNotify.map((s) => s.user_id);

    console.log(`Processing notifications for ${uniqueUserIds.length} users`);

    for (const userId of uniqueUserIds) {
      try {
        results.processed++;

        // Генерируем все уведомления для пользователя
        const notifications = await generateNotifications(supabase, userId);
        results.total_alerts += notifications.summary.total_alerts;

        // Отправляем уведомления (email, push, etc.)
        if (notifications.summary.total_alerts > 0) {
          const sendResult = await sendNotifications(supabase, notifications);
          results.sent += sendResult.sent;
          results.failed += sendResult.failed;

          console.log(`User ${userId}: ${notifications.summary.total_alerts} alerts generated, ${sendResult.sent} sent`);
        }
      } catch (error) {
        console.error(`Error processing user ${userId}:`, error);
        results.errors++;
      }
    }

    console.log(`CRON completed: ${results.processed} users, ${results.total_alerts} alerts, ${results.sent} sent`);

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("CRON smart notifications error:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
