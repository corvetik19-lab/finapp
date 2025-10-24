import { NextResponse } from "next/server";
import { createRSCClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET - получить детали webhook
 */
export async function GET(
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

    const { data, error } = await supabase
      .from("webhooks")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    // Получаем последние 50 логов
    const { data: logs } = await supabase
      .from("webhook_logs")
      .select("*")
      .eq("webhook_id", id)
      .order("created_at", { ascending: false })
      .limit(50);

    return NextResponse.json({
      webhook: {
        ...data,
        secret: undefined, // Не показываем секрет
        secret_hint: data.secret.substring(0, 8) + "...",
      },
      logs: logs || [],
    });
  } catch (error) {
    console.error("Failed to fetch webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT - обновить webhook
 */
export async function PUT(
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

    const body = await request.json();
    const { name, url, events, is_active, retry_count, timeout_seconds } = body;

    // Валидация URL если предоставлен
    if (url) {
      try {
        new URL(url);
      } catch {
        return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
      }
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (url !== undefined) updateData.url = url;
    if (events !== undefined) updateData.events = events;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (retry_count !== undefined) updateData.retry_count = retry_count;
    if (timeout_seconds !== undefined) updateData.timeout_seconds = timeout_seconds;

    const { data, error } = await supabase
      .from("webhooks")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ webhook: data });
  } catch (error) {
    console.error("Failed to update webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - удалить webhook
 */
export async function DELETE(
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

    const { error } = await supabase
      .from("webhooks")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
