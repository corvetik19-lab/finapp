import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/helpers";
import { loanFormSchema } from "@/lib/loans/schema";

// GET /api/loans - получить все кредиты
export async function GET() {
  try {
    const supabase = await createRouteClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("loans")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch loans:", error);
      return NextResponse.json({ error: "Failed to fetch loans" }, { status: 500 });
    }

    return NextResponse.json({ success: true, loans: data });
  } catch (error) {
    console.error("GET /api/loans error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/loans - создать новый кредит
export async function POST(req: Request) {
  try {
    const supabase = await createRouteClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = loanFormSchema.parse(body);

    const { data, error } = await supabase
      .from("loans")
      .insert({
        user_id: user.id,
        name: validatedData.name,
        bank: validatedData.bank,
        principal_amount: Math.round(validatedData.principalAmount * 100),
        interest_rate: validatedData.interestRate,
        monthly_payment: Math.round(validatedData.monthlyPayment * 100),
        issue_date: validatedData.issueDate,
        end_date: validatedData.endDate || null,
        term_months: validatedData.termMonths || null,
        payment_type: validatedData.paymentType || "annuity",
        contract_number: validatedData.contractNumber || null,
        next_payment_date: validatedData.nextPaymentDate || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create loan:", error);
      return NextResponse.json({ error: "Failed to create loan" }, { status: 500 });
    }

    return NextResponse.json({ success: true, loan: data });
  } catch (error) {
    console.error("POST /api/loans error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/loans - обновить кредит
export async function PUT(req: Request) {
  try {
    const supabase = await createRouteClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = loanFormSchema.parse(body);

    if (!validatedData.id) {
      return NextResponse.json({ error: "Loan ID is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("loans")
      .update({
        name: validatedData.name,
        bank: validatedData.bank,
        principal_amount: Math.round(validatedData.principalAmount * 100),
        interest_rate: validatedData.interestRate,
        monthly_payment: Math.round(validatedData.monthlyPayment * 100),
        issue_date: validatedData.issueDate,
        end_date: validatedData.endDate || null,
        term_months: validatedData.termMonths || null,
        payment_type: validatedData.paymentType || "annuity",
        contract_number: validatedData.contractNumber || null,
        next_payment_date: validatedData.nextPaymentDate || null,
      })
      .eq("id", validatedData.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Failed to update loan:", error);
      return NextResponse.json({ error: "Failed to update loan" }, { status: 500 });
    }

    return NextResponse.json({ success: true, loan: data });
  } catch (error) {
    console.error("PUT /api/loans error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/loans?id=... - удалить кредит
export async function DELETE(req: Request) {
  try {
    const supabase = await createRouteClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Loan ID is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("loans")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Failed to delete loan:", error);
      return NextResponse.json({ error: "Failed to delete loan" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/loans error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
