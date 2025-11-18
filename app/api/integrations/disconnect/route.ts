import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createRouteClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { integration_id } = await request.json();

    if (!integration_id) {
      return NextResponse.json({ error: "Integration ID is required" }, { status: 400 });
    }

    // Отключаем интеграцию
    const { error } = await supabase
      .from("organization_integrations")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", integration_id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error disconnecting integration:", error);
    return NextResponse.json(
      { error: "Failed to disconnect integration" },
      { status: 500 }
    );
  }
}
