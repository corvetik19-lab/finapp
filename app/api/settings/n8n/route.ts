import { NextRequest, NextResponse } from "next/server";
import { createRSCClient } from "@/lib/supabase/helpers";

export async function GET() {
  try {
    const supabase = await createRSCClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Получаем настройки n8n из базы
    const { data: settings, error } = await supabase
      .from("user_preferences")
      .select("n8n_url, n8n_api_key")
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching n8n settings:", error);
      return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
    }

    // Получаем список воркфлоу (если настройки есть)
    let workflows: Array<{
      id: string;
      name: string;
      active: boolean;
      description: string;
      tags?: string[];
    }> = [];
    let connected = false;

    if (settings?.n8n_url && settings?.n8n_api_key) {
      try {
        // Реальный запрос к n8n API для получения воркфлоу
        const response = await fetch(`${settings.n8n_url}/api/v1/workflows`, {
          headers: { 
            'X-N8N-API-KEY': settings.n8n_api_key,
            'Accept': 'application/json'
          },
          signal: AbortSignal.timeout(10000), // 10 sec timeout
        });

        if (response.ok) {
          const data = await response.json();
          // n8n возвращает массив воркфлоу
          const workflowsData = (data.data || data) as Array<{
            id: string | number;
            name: string;
            active?: boolean;
            settings?: { errorWorkflow?: string };
            tags?: string[];
            updatedAt?: string;
          }>;
          workflows = workflowsData.map((w) => ({
            id: String(w.id),
            name: w.name || 'Unnamed Workflow',
            active: w.active ?? false,
            description: w.settings?.errorWorkflow || w.name || '',
            tags: w.tags,
          }));
          connected = true;
        } else {
          console.warn('N8n API returned non-OK status:', response.status);
          connected = false;
        }
      } catch (err) {
        console.error("Error fetching workflows from n8n:", err);
        connected = false;
      }
    }

    return NextResponse.json({
      url: settings?.n8n_url || "",
      apiKey: settings?.n8n_api_key ? "***" : "",
      connected,
      workflows,
    });
  } catch (error) {
    console.error("N8n settings GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createRSCClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { url, apiKey } = body;

    // Валидация
    if (!url || !apiKey) {
      return NextResponse.json(
        { error: "URL and API key are required" },
        { status: 400 }
      );
    }

    // Сохраняем настройки в user_preferences
    const { error: upsertError } = await supabase
      .from("user_preferences")
      .upsert(
        {
          user_id: user.id,
          n8n_url: url,
          n8n_api_key: apiKey,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      );

    if (upsertError) {
      console.error("Error saving n8n settings:", upsertError);
      return NextResponse.json(
        { error: "Failed to save settings" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("N8n settings POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
