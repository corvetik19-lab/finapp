import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  createBackup,
  uploadBackupToStorage,
  cleanOldBackups,
} from "@/lib/backup/backup";

// Service role client для CRON задач
function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes

/**
 * CRON задача: Автоматическое резервное копирование
 * Запускается еженедельно (каждое воскресенье в 02:00)
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
      successful: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Получаем всех активных пользователей
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) throw usersError;

    for (const user of users.users || []) {
      try {
        results.processed++;

        // Создаём backup для пользователя
        const backup = await createBackup(supabase, user.id);

        // Загружаем в Storage
        const uploadResult = await uploadBackupToStorage(
          supabase,
          user.id,
          backup
        );

        if (!uploadResult.success) {
          results.failed++;
          results.errors.push(
            `User ${user.email}: ${uploadResult.error}`
          );
          continue;
        }

        // Очищаем старые backup'ы (оставляем последние 5)
        await cleanOldBackups(supabase, user.id, 5);

        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push(
          `User ${user.email}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("CRON auto-backup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
