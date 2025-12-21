import { NextRequest, NextResponse } from "next/server";
import { createRSCClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createRSCClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("investor_reconciliation_acts")
      .select(`
        *,
        investment:investments(
          id,
          investment_number,
          source:investment_sources!investments_source_id_fkey(name)
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const acts = (data || []).map((act) => ({
      id: act.id,
      investment_id: act.investment_id,
      investment_number: act.investment?.investment_number || "—",
      investor_name: act.investment?.source?.name || "—",
      act_number: act.act_number,
      period_start: act.period_start,
      period_end: act.period_end,
      opening_balance: act.opening_balance,
      total_invested: act.total_invested,
      total_returned: act.total_returned,
      closing_balance: act.closing_balance,
      status: act.status,
    }));

    return NextResponse.json({ data: acts });
  } catch (error) {
    console.error("Error fetching reconciliation acts:", error);
    return NextResponse.json({ error: "Ошибка загрузки" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createRSCClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const body = await request.json();
    const { investment_id, period_start, period_end } = body;

    if (!investment_id || !period_start || !period_end) {
      return NextResponse.json(
        { error: "Заполните все обязательные поля" },
        { status: 400 }
      );
    }

    // Получаем инвестицию
    const { data: investment } = await supabase
      .from("investments")
      .select("*")
      .eq("id", investment_id)
      .eq("user_id", user.id)
      .single();

    if (!investment) {
      return NextResponse.json(
        { error: "Инвестиция не найдена" },
        { status: 404 }
      );
    }

    // Рассчитываем балансы
    const openingBalance = investment.approved_amount;
    const totalInvested = investment.approved_amount;
    const totalReturned = (investment.returned_principal || 0) + (investment.returned_interest || 0);
    const closingBalance = totalInvested - totalReturned;

    // Генерируем номер акта
    const actNumber = `ACT-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`;

    const { data, error } = await supabase
      .from("investor_reconciliation_acts")
      .insert({
        user_id: user.id,
        investment_id,
        act_number: actNumber,
        period_start,
        period_end,
        opening_balance: openingBalance,
        total_invested: totalInvested,
        total_returned: totalReturned,
        closing_balance: closingBalance,
        status: "draft",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, success: true });
  } catch (error) {
    console.error("Error creating reconciliation act:", error);
    return NextResponse.json({ error: "Ошибка создания" }, { status: 500 });
  }
}
