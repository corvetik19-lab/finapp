import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/helpers";

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
    const { name, description, permissions, color, is_default } = body;

    if (!name || !permissions || permissions.length === 0) {
      return NextResponse.json(
        { error: "Name and permissions are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("roles")
      .update({
        name,
        description: description || "",
        permissions,
        color: color || "#667eea",
        is_default: is_default || false,
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Failed to update role:", error);
      return NextResponse.json({ error: "Failed to update role" }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
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

    // Проверяем что роль не системная
    const { data: role } = await supabase
      .from("roles")
      .select("is_default")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (role?.is_default) {
      return NextResponse.json(
        { error: "Cannot delete default role" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("roles")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

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
