import { NextRequest, NextResponse } from "next/server";
import { createRSCClient } from "@/lib/supabase/server";

// GET /api/v1/webhooks/[id] - Получить один webhook
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createRSCClient();

    // Проверка авторизации
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
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

    return NextResponse.json({ webhook });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/v1/webhooks/[id] - Обновить webhook
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createRSCClient();

    // Проверка авторизации
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Парсим тело запроса
    const body = await request.json();
    const { url, events, secret, name, description, is_active } = body;

    // Подготавливаем данные для обновления
    const updateData: Record<string, unknown> = {};
    if (url !== undefined) updateData.url = url;
    if (events !== undefined) updateData.events = events;
    if (secret !== undefined) updateData.secret = secret;
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (is_active !== undefined) updateData.is_active = is_active;

    // Обновляем webhook
    const { data: webhook, error } = await supabase
      .from("webhooks")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error || !webhook) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    return NextResponse.json({ webhook });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/v1/webhooks/[id] - Удалить webhook
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createRSCClient();

    // Проверка авторизации
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Удаляем webhook
    const { error } = await supabase
      .from("webhooks")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
