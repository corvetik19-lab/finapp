import { NextResponse } from "next/server";
import { createRouteClient, createAdminClient } from "@/lib/supabase/helpers";

// PATCH /api/roles/[id] - обновить роль
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
    const { name, description, permissions, color, is_default, allowed_modes } = body;

    if (!name || !permissions || permissions.length === 0) {
      return NextResponse.json(
        { error: "Name and permissions are required" },
        { status: 400 }
      );
    }

    // Проверяем, является ли пользователь супер-админом
    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from("profiles")
      .select("global_role")
      .eq("id", user.id)
      .single();

    const isSuperAdmin = profile?.global_role === "super_admin";

    // Сначала проверяем, что роль существует
    const { data: existingRole } = await adminClient
      .from("roles")
      .select("id, user_id, company_id, is_system")
      .eq("id", id)
      .single();

    if (!existingRole) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    // Для системных ролей требуется супер-админ
    if (existingRole.is_system && !isSuperAdmin) {
      return NextResponse.json({ error: "Only super admin can edit system roles" }, { status: 403 });
    }

    // Используем admin client для обновления (обходит RLS)
    const { data, error } = await adminClient
      .from("roles")
      .update({
        name,
        description: description || "",
        permissions,
        color: color || "#667eea",
        is_default: is_default || false,
        allowed_modes: allowed_modes || null,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Failed to update role:", error.message, error.details, error.hint);
      return NextResponse.json({ error: `Failed to update role: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, role: data });
  } catch (error) {
    console.error("PATCH /api/roles/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/roles/[id] - удалить роль
export async function DELETE(
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

    // Проверяем что роль существует и не системная
    const { data: role } = await supabase
      .from("roles")
      .select("id, is_system, is_default, user_id, company_id")
      .eq("id", id)
      .single();

    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    if (role.is_system || role.is_default) {
      return NextResponse.json(
        { error: "Нельзя удалить системную роль" },
        { status: 400 }
      );
    }

    // Проверяем, не назначена ли роль сотрудникам
    const { count } = await supabase
      .from("employees")
      .select("id", { count: "exact", head: true })
      .eq("role_id", id);

    if (count && count > 0) {
      return NextResponse.json(
        { error: `Нельзя удалить роль, она назначена ${count} сотрудникам` },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("roles")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Failed to delete role:", error);
      return NextResponse.json({ error: "Failed to delete role" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/roles/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
