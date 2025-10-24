import { NextRequest, NextResponse } from "next/server";
import { createRSCClient } from "@/lib/supabase/helpers";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createRSCClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { active } = body;
    const { id: workflowId } = await params;

    if (typeof active !== "boolean") {
      return NextResponse.json(
        { error: "Active status is required" },
        { status: 400 }
      );
    }

    // Получаем настройки n8n
    const { data: settings, error: settingsError } = await supabase
      .from("user_preferences")
      .select("n8n_url, n8n_api_key")
      .eq("user_id", user.id)
      .single();

    if (settingsError || !settings?.n8n_url || !settings?.n8n_api_key) {
      return NextResponse.json(
        { error: "N8n not configured" },
        { status: 400 }
      );
    }

    // Реальный запрос к n8n API для изменения статуса воркфлоу
    try {
      const response = await fetch(`${settings.n8n_url}/api/v1/workflows/${workflowId}`, {
        method: 'PATCH',
        headers: {
          'X-N8N-API-KEY': settings.n8n_api_key,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ active }),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('N8n workflow update error:', response.status, errorText);
        throw new Error(`Failed to update workflow: ${response.status}`);
      }

      const result = await response.json();

      return NextResponse.json({
        success: true,
        workflowId,
        active,
        data: result,
      });
    } catch (error) {
      console.error("Workflow toggle error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to update workflow";
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Workflow update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
