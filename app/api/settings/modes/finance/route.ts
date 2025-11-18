import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createRouteClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { currency, date_format, first_day_of_week } = await request.json();

    // Получаем организацию пользователя
    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: "Not a member of any organization" }, { status: 403 });
    }

    // Upsert настроек режима
    const { error } = await supabase
      .from("organization_mode_settings")
      .upsert({
        organization_id: membership.organization_id,
        mode: "finance",
        settings: {
          currency,
          date_format,
          first_day_of_week,
        },
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "organization_id,mode",
      });

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving finance mode settings:", error);
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }
}
