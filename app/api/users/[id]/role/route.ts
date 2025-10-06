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

    // Проверяем существует ли роль
    const { data: roleData, error: roleError } = await supabase
      .from("roles")
      .select("id")
      .eq("id", role_id)
      .single();

    if (roleError || !roleData) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    // Удаляем старое назначение (если есть) и создаём новое
    // Используем upsert так как у нас UNIQUE(user_id)
    const { error: assignError } = await supabase
      .from("user_roles")
      .upsert(
        {
          user_id: id,
          role_id,
          assigned_by: user.id,
          assigned_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      );

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
