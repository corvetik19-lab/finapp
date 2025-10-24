import { NextResponse } from "next/server";
import { createRSCClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

/**
 * GET - получить список webhooks пользователя
 */
export async function GET() {
  try {
    const supabase = await createRSCClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("webhooks")
      .select("id, name, url, events, is_active, retry_count, timeout_seconds, created_at, updated_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Также получаем статистику для каждого webhook
    const webhooksWithStats = await Promise.all(
      (data || []).map(async (webhook) => {
        const { data: logs } = await supabase
          .from("webhook_logs")
          .select("success")
          .eq("webhook_id", webhook.id)
          .limit(100);

        const totalCalls = logs?.length || 0;
        const successfulCalls = logs?.filter((log) => log.success).length || 0;
        const successRate =
          totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0;

        return {
          ...webhook,
          stats: {
            total_calls: totalCalls,
            successful_calls: successfulCalls,
            success_rate: successRate,
          },
        };
      })
    );

    return NextResponse.json({ webhooks: webhooksWithStats });
  } catch (error) {
    console.error("Failed to fetch webhooks:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST - создать новый webhook
 */
export async function POST(request: Request) {
  try {
    const supabase = await createRSCClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      url,
      events = [],
      retry_count = 3,
      timeout_seconds = 10,
    } = body;

    if (!name || !url || !events.length) {
      return NextResponse.json(
        { error: "Missing required fields: name, url, events" },
        { status: 400 }
      );
    }

    // Валидация URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // Генерируем секретный ключ для HMAC подписи
    const secret = randomBytes(32).toString("hex");

    const { data, error } = await supabase
      .from("webhooks")
      .insert({
        user_id: user.id,
        name,
        url,
        secret,
        events,
        retry_count,
        timeout_seconds,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      webhook: {
        ...data,
        secret_hint: secret.substring(0, 8) + "...", // Показываем только начало
      },
      warning:
        "Сохраните секретный ключ в безопасном месте. Он нужен для проверки подписи webhook.",
      secret, // Показываем полностью только при создании
    });
  } catch (error) {
    console.error("Failed to create webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
