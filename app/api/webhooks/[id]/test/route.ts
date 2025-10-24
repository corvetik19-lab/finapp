import { NextResponse } from "next/server";
import { createRSCClient } from "@/lib/supabase/server";
import { sendWebhook } from "@/lib/webhooks/sender";

export const dynamic = "force-dynamic";

/**
 * POST - отправить тестовый webhook
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createRSCClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Получаем webhook
    const { data: webhook, error } = await supabase
      .from("webhooks")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !webhook) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    // Создаём тестовое событие
    const testEvent = {
      event: "webhook.test",
      data: {
        message: "This is a test webhook from Finappka",
        webhook_id: webhook.id,
        webhook_name: webhook.name,
        timestamp: new Date().toISOString(),
      },
      user_id: user.id,
      occurred_at: new Date().toISOString(),
    };

    // Отправляем webhook
    const result = await sendWebhook(
      {
        id: webhook.id,
        url: webhook.url,
        secret: webhook.secret,
        retry_count: 1, // Только 1 попытка для теста
        timeout_seconds: webhook.timeout_seconds,
      },
      testEvent
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "Test webhook sent successfully",
        status_code: result.status_code,
        duration_ms: result.duration_ms,
        response: result.response_body?.substring(0, 500),
      });
    } else {
      return NextResponse.json({
        success: false,
        message: "Test webhook failed",
        error: result.error,
        status_code: result.status_code,
        duration_ms: result.duration_ms,
      });
    }
  } catch (error) {
    console.error("Failed to send test webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
