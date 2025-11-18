import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createRouteClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { service, config } = await request.json();

    if (!service || !config) {
      return NextResponse.json({ error: "Service and config are required" }, { status: 400 });
    }

    // Получаем организацию пользователя
    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: "Not a member of any organization" }, { status: 403 });
    }

    // Создаём или обновляем интеграцию
    const { error } = await supabase
      .from("organization_integrations")
      .upsert({
        organization_id: membership.organization_id,
        service,
        config,
        is_active: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "organization_id,service",
      });

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error connecting integration:", error);
    return NextResponse.json(
      { error: "Failed to connect integration" },
      { status: 500 }
    );
  }
}
