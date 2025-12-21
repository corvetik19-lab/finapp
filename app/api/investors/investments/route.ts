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
      .from("investments")
      .select(`
        *,
        source:investment_sources!investments_source_id_fkey(id, name, source_type),
        tender:tenders(id, subject, purchase_number)
      `)
      .order("created_at", { ascending: false });

    if (tenderId) {
      query = query.eq("tender_id", tenderId);
    }

    const { data, error } = await query;

    if (error) {
      logger.error("Error fetching investments:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    logger.error("API Error:", error);
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}
