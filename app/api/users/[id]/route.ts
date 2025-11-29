import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/helpers";

// PATCH /api/users/[id] - обновить пользователя (email и/или пароль)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { email, password, full_name } = body;

    const supabase = await createRouteClient();
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Получаем профили для проверки ролей
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('global_role')
      .eq('id', currentUser.id)
      .single();

    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('global_role')
      .eq('id', id)
      .single();

    // Защита иерархии:
    // 1. Только супер-админ может редактировать других супер-админов
    if (targetProfile?.global_role === 'super_admin') {
      if (currentProfile?.global_role !== 'super_admin') {
        return NextResponse.json(
          { error: "Only Super Admin can modify other Super Admins" },
          { status: 403 }
        );
      }
    }

    // Используем Admin API для обновления пользователя
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const { createClient } = await import("@supabase/supabase-js");
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Формируем данные для обновления
    const updateData: {
      email?: string;
      password?: string;
      user_metadata?: { full_name?: string };
    } = {};

    if (email && email.trim()) {
      updateData.email = email.trim();
    }

    if (password && password.trim()) {
      if (password.length < 6) {
        return NextResponse.json(
          { error: "Password must be at least 6 characters" },
          { status: 400 }
        );
      }
      updateData.password = password.trim();
    }

    if (full_name !== undefined) {
      updateData.user_metadata = { full_name: full_name.trim() || undefined };
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No update data provided" },
        { status: 400 }
      );
    }

    const { data: updatedUser, error: updateError } = await adminClient.auth.admin.updateUserById(
      id,
      updateData
    );

    if (updateError) {
      console.error("Failed to update user:", updateError);
      return NextResponse.json(
        { error: updateError.message || "Failed to update user" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("PATCH /api/users/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/users/[id] - удалить пользователя
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createRouteClient();
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Нельзя удалить самого себя
    if (currentUser.id === id) {
      return NextResponse.json(
        { error: "Cannot delete yourself" },
        { status: 400 }
      );
    }

    // Получаем профили для проверки ролей
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('global_role')
      .eq('id', currentUser.id)
      .single();

    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('global_role')
      .eq('id', id)
      .single();

    // Защита иерархии:
    // 1. Супер-админа удалить нельзя (или только другим супер-админом)
    // Требование: "админ ... кроме удаления самого суперадмина"
    if (targetProfile?.global_role === 'super_admin') {
      if (currentProfile?.global_role !== 'super_admin') {
        return NextResponse.json(
          { error: "Only Super Admin can delete Super Admins" },
          { status: 403 }
        );
      }
    }

    // Используем Admin API для удаления пользователя
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const { createClient } = await import("@supabase/supabase-js");
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(id);

    if (deleteError) {
      console.error("Failed to delete user:", deleteError);
      return NextResponse.json(
        { error: deleteError.message || "Failed to delete user" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/users/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

