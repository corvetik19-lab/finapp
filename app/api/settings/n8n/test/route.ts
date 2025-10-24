import { NextRequest, NextResponse } from "next/server";
import { createRSCClient } from "@/lib/supabase/helpers";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createRSCClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { url, apiKey } = body;

    if (!url || !apiKey) {
      return NextResponse.json(
        { error: "URL and API key are required" },
        { status: 400 }
      );
    }

    // Проверяем подключение к n8n
    try {
      // Реальный запрос к n8n API для проверки подключения
      const response = await fetch(`${url}/api/v1/workflows`, {
        headers: {
          'X-N8N-API-KEY': apiKey,
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(10000), // 10 sec timeout
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('N8n API error:', response.status, errorText);
        throw new Error(`Connection failed: ${response.status} ${response.statusText}`);
      }

      // Проверяем, что ответ валидный
      const data = await response.json();
      const workflowCount = Array.isArray(data) ? data.length : (data.data?.length || 0);

      return NextResponse.json({
        success: true,
        connected: true,
        message: `Подключение успешно установлено. Найдено воркфлоу: ${workflowCount}`,
      });
    } catch (error) {
      console.error("N8n connection test failed:", error);
      const errorMessage = error instanceof Error ? error.message : "Не удалось подключиться к n8n";
      return NextResponse.json(
        { success: false, connected: false, error: errorMessage },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("N8n test error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
