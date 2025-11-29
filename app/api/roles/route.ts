import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/helpers";

// GET /api/roles - получить роли
// Параметры: company_id - ID компании для получения ролей компании
export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("company_id");

    let query = supabase
      .from("roles")
      .select("*")
      .order("is_system", { ascending: false }) // Системные роли первыми
      .order("name", { ascending: true });

    if (companyId) {
      // Роли конкретной компании
      query = query.eq("company_id", companyId);
    } else {
      // Личные роли пользователя (для обратной совместимости)
      query = query.eq("user_id", user.id);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Failed to fetch roles:", error);
      return NextResponse.json({ error: "Failed to fetch roles" }, { status: 500 });
    }

    return NextResponse.json({ success: true, roles: data });
  } catch (error) {
    console.error("GET /api/roles error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/roles - создать роль
export async function POST(req: Request) {
  try {
    const supabase = await createRouteClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, permissions, color, is_default, company_id, allowed_modes } = body;

    if (!name || !permissions || permissions.length === 0) {
      return NextResponse.json(
        { error: "Name and permissions are required" },
        { status: 400 }
      );
    }

    // Определяем, создаём роль компании или личную роль
    const insertData: Record<string, unknown> = {
      name,
      description: description || "",
      permissions,
      color: color || "#667eea",
      is_system: is_default || false,
      allowed_modes: allowed_modes || null,
    };

    if (company_id) {
      insertData.company_id = company_id;
    } else {
      insertData.user_id = user.id;
    }

    const { data, error } = await supabase
      .from("roles")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Failed to create role:", error);
      return NextResponse.json({ error: "Failed to create role" }, { status: 500 });
    }

    return NextResponse.json({ success: true, role: data });
  } catch (error) {
    console.error("POST /api/roles error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
