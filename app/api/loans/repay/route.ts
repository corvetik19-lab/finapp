import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/helpers";
import { loanRepaymentSchema } from "@/lib/loans/schema";

// POST /api/loans/repay - погасить кредит
export async function POST(req: Request) {
  try {
    const supabase = await createRouteClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = loanRepaymentSchema.parse(body);

    // Создать запись платежа
    const { data: payment, error: paymentError } = await supabase
      .from("loan_payments")
      .insert({
        user_id: user.id,
        loan_id: validatedData.loanId,
        payment_date: validatedData.paymentDate,
        amount: Math.round(validatedData.amount * 100),
        principal_amount: Math.round(validatedData.principalAmount * 100),
        interest_amount: Math.round(validatedData.interestAmount * 100),
        note: validatedData.note || null,
      })
      .select()
      .single();

    if (paymentError) {
      console.error("Failed to create payment:", paymentError);
      return NextResponse.json({ error: "Failed to create payment" }, { status: 500 });
    }

    // Обновить сумму выплат в кредите
    const { data: loan, error: loanError } = await supabase
      .from("loans")
      .select("principal_paid, interest_paid")
      .eq("id", validatedData.loanId)
      .single();

    if (!loanError && loan) {
      await supabase
        .from("loans")
        .update({
          principal_paid: (loan.principal_paid || 0) + Math.round(validatedData.principalAmount * 100),
          interest_paid: (loan.interest_paid || 0) + Math.round(validatedData.interestAmount * 100),
        })
        .eq("id", validatedData.loanId);
    }

    return NextResponse.json({ success: true, payment });
  } catch (error) {
    console.error("POST /api/loans/repay error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
