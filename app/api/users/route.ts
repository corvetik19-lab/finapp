import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/helpers";

// POST /api/users - создать пользователя
export async function POST(req: Request) {
  try {
    const supabase = await createRouteClient();
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { email, password, full_name, role_id } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // ПРОВЕРКА ПРАВ НА НАЗНАЧЕНИЕ РОЛИ
    // Если указана роль, проверяем, имеет ли право текущий пользователь ее назначить
    if (role_id) {
      const { data: roleData } = await supabase
        .from("roles")
        .select("name")
        .eq("id", role_id)
        .single();

      if (roleData && (roleData.name === 'super_admin' || roleData.name === 'admin')) {
        // Только super_admin может назначать администраторов
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('global_role')
          .eq('id', currentUser.id)
          .single();

        if (currentProfile?.global_role !== 'super_admin') {
          return NextResponse.json(
            { error: "Only Super Admin can create Admin users" },
            { status: 403 }
          );
        }
      }
    }

    // Используем Admin API для создания пользователя
    // Примечание: Требуется service_role_key в переменных окружения
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      console.error("SUPABASE_SERVICE_ROLE_KEY not found in environment");
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

    // Создаём пользователя через Admin API
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Автоматически подтверждаем email
      user_metadata: {
        full_name: full_name || "",
      },
    });

    if (createError || !newUser.user) {
      console.error("Failed to create user:", createError);
      return NextResponse.json(
        { error: createError?.message || "Failed to create user" },
        { status: 400 }
      );
    }

    // Назначаем роль если указана
    if (role_id) {
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: newUser.user.id,
          role_id,
          assigned_by: currentUser.id,
        });

      if (roleError) {
        console.error("Failed to assign role:", roleError);
        // Не критично, пользователь уже создан
      }
    }

    // Получаем роль для ответа
    let role_name = null;
    let role_color = null;
    
    if (role_id) {
      const { data: roleData } = await supabase
        .from("roles")
        .select("name, color")
        .eq("id", role_id)
        .single();
      
      if (roleData) {
        role_name = roleData.name;
        role_color = roleData.color;
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
        full_name: full_name || null,
        role_id: role_id || null,
        role_name,
        role_color,
        created_at: newUser.user.created_at,
        last_sign_in_at: null,
      },
    });
  } catch (error) {
    console.error("POST /api/users error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

