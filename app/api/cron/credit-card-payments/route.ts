import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/helpers";

/**
 * API endpoint для автоматического создания платежей по кредитным картам
 * Вызывается CRON задачей ежедневно или вручную для тестирования
 */
export async function POST(req: Request) {
  try {
    // Проверка авторизации (опционально - можно добавить секретный токен)
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createRouteClient();

    // Вызываем функцию создания платежей
    const { data, error } = await supabase.rpc("auto_create_credit_card_payments");

    if (error) {
      console.error("Failed to auto-create credit card payments:", error);
      return NextResponse.json(
        { 
          success: false, 
          error: error.message 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      result: data,
      message: `Создано платежей: ${data?.[0]?.created_count ?? 0}`,
    });
  } catch (error) {
    console.error("Error in credit-card-payments CRON:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}

// GET endpoint для проверки статуса
export async function GET() {
  return NextResponse.json({
    endpoint: "credit-card-payments",
    description: "Автоматическое создание платежей по кредитным картам за 10 дней до срока оплаты",
    schedule: "Ежедневно в 9:00 UTC (12:00 МСК)",
    method: "POST",
  });
}
