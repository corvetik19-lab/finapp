import { NextRequest, NextResponse } from "next/server";
import { createRSCClient } from "@/lib/supabase/helpers";

type N8nNodeDefinition = {
  parameters: Record<string, unknown>;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
};

type N8nConnectionBranch = { node: string; type: string; index: number };

type N8nConnectionDefinition = Record<string, { main?: N8nConnectionBranch[][] }>;

type N8nTemplateDefinition = {
  name: string;
  nodes: N8nNodeDefinition[];
  connections: N8nConnectionDefinition;
};

export async function POST(req: NextRequest) {
  try {
    const supabase = await createRSCClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { templateId } = body;

    if (!templateId) {
      return NextResponse.json(
        { error: "Template ID is required" },
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

    // Библиотека шаблонов
    const templates: Record<string, N8nTemplateDefinition> = {
      "telegram-receipt-parser": {
        name: "Telegram Receipt Parser",
        nodes: [
          {
            parameters: {
              updates: ["message"],
            },
            name: "Telegram Trigger",
            type: "n8n-nodes-base.telegramTrigger",
            typeVersion: 1,
            position: [250, 300],
          },
          {
            parameters: {
              url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/telegram-receipt`,
              options: {},
            },
            name: "HTTP Request",
            type: "n8n-nodes-base.httpRequest",
            typeVersion: 3,
            position: [450, 300],
          },
        ],
        connections: {
          "Telegram Trigger": {
            main: [[{ node: "HTTP Request", type: "main", index: 0 }]],
          },
        },
      },
      "expense-categorization": {
        name: "AI Expense Categorization",
        nodes: [
          {
            parameters: {
              pollTimes: { item: [{ mode: "everyMinute" }] },
            },
            name: "Schedule Trigger",
            type: "n8n-nodes-base.scheduleTrigger",
            typeVersion: 1,
            position: [250, 300],
          },
        ],
        connections: {},
      },
      "budget-alerts": {
        name: "Budget Alert System",
        nodes: [
          {
            parameters: {
              pollTimes: { item: [{ mode: "everyHour" }] },
            },
            name: "Schedule Trigger",
            type: "n8n-nodes-base.scheduleTrigger",
            typeVersion: 1,
            position: [250, 300],
          },
        ],
        connections: {},
      },
    };

    const template = templates[templateId];
    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    // Создаём новый воркфлоу в n8n из шаблона
    try {
      const response = await fetch(`${settings.n8n_url}/api/v1/workflows`, {
        method: 'POST',
        headers: {
          'X-N8N-API-KEY': settings.n8n_api_key,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          name: template.name,
          nodes: template.nodes,
          connections: template.connections,
          active: false,
          settings: {},
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('N8n template install error:', response.status, errorText);
        throw new Error(`Failed to install template: ${response.status}`);
      }

      const result = await response.json();

      return NextResponse.json({
        success: true,
        templateId,
        workflowId: result.id,
        message: "Шаблон успешно установлен",
      });
    } catch (error) {
      console.error("Template install error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to install template";
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Template installation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
