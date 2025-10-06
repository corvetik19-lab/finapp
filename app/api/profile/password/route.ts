import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/helpers";

// POST /api/profile/password - смена пароля
export async function POST(req: Request) {
  try {
    const supabase = await createRouteClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { newPassword } = body;

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: "Пароль должен быть не менее 6 символов" },
        { status: 400 }
      );
    }

    // Обновляем пароль
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (updateError) {
      console.error("Update password error:", updateError);
      return NextResponse.json(
        { error: "Не удалось изменить пароль. Проверьте текущий пароль." },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/profile/password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
