import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/helpers";

/**
 * POST /api/loans/recalculate - пересчитать principal_paid для всех кредитов
 * Этот endpoint пересчитывает уже оплаченную сумму для всех существующих кредитов
 */
export async function POST() {
  try {
    const supabase = await createRouteClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Получаем все кредиты пользователя
    const { data: loans, error: fetchError } = await supabase
      .from("loans")
      .select("id, issue_date, monthly_payment, principal_amount")
      .is("deleted_at", null)
      .eq("user_id", user.id);

    if (fetchError) {
      console.error("Failed to fetch loans:", fetchError);
      return NextResponse.json({ error: "Failed to fetch loans" }, { status: 500 });
    }

    if (!loans || loans.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: "No loans found",
        updated: 0 
      });
    }

    const now = new Date();
    let updated = 0;
    const errors: string[] = [];

    for (const loan of loans) {
      const issueDate = new Date(loan.issue_date);
      const monthlyPayment = loan.monthly_payment / 100; // Конвертируем из копеек
      const principalAmount = loan.principal_amount;

      // Рассчитываем количество полных месяцев с даты выдачи
      const monthsPassed = (now.getFullYear() - issueDate.getFullYear()) * 12 + (now.getMonth() - issueDate.getMonth());

      let principalPaid = 0;
      if (monthsPassed > 0 && monthlyPayment > 0) {
        // Предполагаем что все платежи были сделаны вовремя
        principalPaid = Math.round(monthlyPayment * monthsPassed * 100);
        
        // Не может быть больше суммы кредита
        principalPaid = Math.min(principalPaid, principalAmount);
      }

      // Обновляем кредит
      const { error: updateError } = await supabase
        .from("loans")
        .update({ principal_paid: principalPaid })
        .eq("id", loan.id)
        .eq("user_id", user.id);

      if (updateError) {
        console.error(`Failed to update loan ${loan.id}:`, updateError);
        errors.push(`Loan ${loan.id}: ${updateError.message}`);
      } else {
        updated++;
      }
    }

    return NextResponse.json({ 
      success: true,
      message: `Successfully recalculated ${updated} loans`,
      updated,
      total: loans.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error("POST /api/loans/recalculate error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
