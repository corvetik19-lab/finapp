import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/helpers";

/**
 * API endpoint для автоматического создания всех платежей
 * Запускает создание платежей по кредитным картам и кредитам
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
    const results = {
      creditCards: { success: false, count: 0, error: null as string | null },
      loans: { success: false, count: 0, error: null as string | null },
    };

    // 1. Создаём платежи по кредитным картам
    try {
      const { data: creditCardData, error: creditCardError } = await supabase.rpc(
        "auto_create_credit_card_payments"
      );

      if (creditCardError) {
        console.error("Failed to auto-create credit card payments:", creditCardError);
        results.creditCards.error = creditCardError.message;
      } else {
        results.creditCards.success = true;
        results.creditCards.count = creditCardData?.[0]?.created_count ?? 0;
      }
    } catch (error) {
      console.error("Error creating credit card payments:", error);
      results.creditCards.error = error instanceof Error ? error.message : "Unknown error";
    }

    // 2. Создаём платежи по кредитам
    try {
      const { data: loanData, error: loanError } = await supabase.rpc(
        "auto_create_loan_payments"
      );

      if (loanError) {
        console.error("Failed to auto-create loan payments:", loanError);
        results.loans.error = loanError.message;
      } else {
        results.loans.success = true;
        results.loans.count = loanData?.[0]?.created_count ?? 0;
      }
    } catch (error) {
      console.error("Error creating loan payments:", error);
      results.loans.error = error instanceof Error ? error.message : "Unknown error";
    }

    // Формируем общий ответ
    const totalCreated = results.creditCards.count + results.loans.count;
    const hasErrors = results.creditCards.error || results.loans.error;
    const allSuccess = results.creditCards.success && results.loans.success;

    return NextResponse.json({
      success: allSuccess,
      totalCreated,
      details: {
        creditCards: {
          success: results.creditCards.success,
          count: results.creditCards.count,
          error: results.creditCards.error,
        },
        loans: {
          success: results.loans.success,
          count: results.loans.count,
          error: results.loans.error,
        },
      },
      message: hasErrors
        ? `Создано платежей: ${totalCreated}, но были ошибки`
        : `Успешно создано платежей: ${totalCreated} (кредитные карты: ${results.creditCards.count}, кредиты: ${results.loans.count})`,
    });
  } catch (error) {
    console.error("Error in auto-payments CRON:", error);
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
    endpoint: "auto-payments",
    description: "Автоматическое создание всех платежей (кредитные карты + кредиты) за 10 дней до срока оплаты",
    schedule: "Ежедневно в 9:00 UTC (12:00 МСК)",
    method: "POST",
    includes: [
      "Платежи по кредитным картам",
      "Платежи по кредитам",
    ],
  });
}
