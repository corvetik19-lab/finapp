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
    const inn = searchParams.get("inn");
    const name = searchParams.get("name");
    const excludeId = searchParams.get("excludeId");

    if (!inn && !name) {
      return NextResponse.json({ supplier: null });
    }

    let query = supabase
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
        created_at
      `)
      .eq("company_id", companyId)
      .is("deleted_at", null);

    // Поиск по ИНН (приоритет)
    if (inn) {
      query = query.eq("inn", inn);
    } else if (name) {
      // Поиск по точному совпадению названия
      query = query.ilike("name", name);
    }

    // Исключаем текущего поставщика при редактировании
    if (excludeId) {
      query = query.neq("id", excludeId);
    }

    const { data: supplier, error } = await query.maybeSingle();

    if (error) {
      console.error("Duplicate check error:", error);
      return NextResponse.json({ error: "Ошибка проверки" }, { status: 500 });
    }

    return NextResponse.json({ 
      supplier,
      isDuplicate: !!supplier 
    });
  } catch (error) {
    console.error("Duplicate check error:", error);
    return NextResponse.json({ error: "Внутренняя ошибка" }, { status: 500 });
  }
}
