import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/helpers";

// PATCH /api/profile - обновление профиля
export async function PATCH(req: Request) {
  try {
    const supabase = await createRouteClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { fullName, phone } = body;

    // Обновляем метаданные пользователя
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        full_name: fullName,
        phone: phone,
      }
    });

    if (updateError) {
      console.error("Update profile error:", updateError);
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/profile error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
