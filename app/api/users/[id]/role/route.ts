import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/helpers";

// PATCH /api/users/[id]/role - назначить роль пользователю
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createRouteClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { role_id } = body;

    // Если role_id пустой - удаляем назначение роли
    if (!role_id) {
      const { error: deleteError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", id);

      if (deleteError) {
        console.error("Failed to remove role:", deleteError);
        return NextResponse.json(
          { error: "Failed to remove role" },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    }

    // Проверяем существует ли роль и получаем её company_id
    const { data: roleData, error: roleError } = await supabase
      .from("roles")
      .select("id, company_id")
      .eq("id", role_id)
      .single();

    if (roleError || !roleData) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    // Сначала удаляем старое назначение для этой компании (если есть)
    // Потом создаём новое. Это нужно т.к. UNIQUE может быть на (user_id, company_id)
    await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", id)
      .eq("company_id", roleData.company_id);

    // Создаём новое назначение роли
    const { error: assignError } = await supabase
      .from("user_roles")
      .insert({
        user_id: id,
        role_id,
        company_id: roleData.company_id,
        assigned_by: user.id,
        assigned_at: new Date().toISOString(),
      });

    if (assignError) {
      console.error("Failed to assign role:", assignError);
      return NextResponse.json(
        { error: "Failed to assign role" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/users/[id]/role error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
