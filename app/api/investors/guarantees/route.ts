import { NextRequest, NextResponse } from "next/server";
import { createRSCClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/platform/organization";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createRSCClient();
    const companyId = await getCurrentCompanyId();

    if (!companyId) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tenderId = searchParams.get("tender_id");

    let query = supabase
      .from("bank_guarantees")
      .select(`
        *,
        source:investment_sources(id, name, source_type),
        tender:tenders(id, subject, purchase_number)
      `)
      .eq("company_id", companyId)
      .order("end_date", { ascending: true });

    if (tenderId) {
      query = query.eq("tender_id", tenderId);
    }

    const { data, error } = await query;

    if (error) {
      logger.error("Error fetching guarantees:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    logger.error("API Error:", error);
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createRSCClient();
    const { data: { user } } = await supabase.auth.getUser();
    const companyId = await getCurrentCompanyId();

    if (!user || !companyId) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const body = await request.json();

    const { data, error } = await supabase
      .from("bank_guarantees")
      .insert({
        user_id: user.id,
        company_id: companyId,
        ...body,
      })
      .select()
      .single();

    if (error) {
      logger.error("Error creating guarantee:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    logger.error("API Error:", error);
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}
