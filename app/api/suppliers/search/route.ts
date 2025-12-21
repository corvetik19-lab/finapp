import { NextRequest, NextResponse } from "next/server";
import { createRSCClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/platform/organization";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createRSCClient();
    const companyId = await getCurrentCompanyId();

    if (!companyId) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    if (!search || search.length < 2) {
      return NextResponse.json({ suppliers: [] });
    }

    // Full-text search по name, inn, short_name
    const searchPattern = `%${search}%`;
    
    const { data: suppliers, error } = await supabase
      .from("suppliers")
      .select(`
        id,
        name,
        short_name,
        inn,
        kpp,
        phone,
        email,
        status,
        rating,
        category_id,
        supplier_categories (
          id,
          name
        )
      `)
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .or(`name.ilike.${searchPattern},short_name.ilike.${searchPattern},inn.ilike.${searchPattern}`)
      .order("name")
      .limit(limit);

    if (error) {
      console.error("Search error:", error);
      return NextResponse.json({ error: "Ошибка поиска" }, { status: 500 });
    }

    return NextResponse.json({ suppliers: suppliers || [] });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Внутренняя ошибка" }, { status: 500 });
  }
}
