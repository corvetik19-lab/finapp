import { NextRequest, NextResponse } from "next/server";
import { createRSCClient } from "@/lib/supabase/server";

// GET /api/v1/webhooks - Получить все webhooks пользователя
export async function GET() {
  try {
    const supabase = await createRSCClient();

    // Проверка авторизации
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Получаем webhooks
    const { data: webhooks, error } = await supabase
      .from("webhooks")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching webhooks:", error);
      return NextResponse.json(
        { error: "Failed to fetch webhooks" },
        { status: 500 }
      );
    }

    return NextResponse.json({ webhooks });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/v1/webhooks - Создать новый webhook
export async function POST(request: NextRequest) {
  try {
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
    const { url, events, secret, name, description } = body;

    // Валидация
    if (!url || !events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: "URL and events are required" },
        { status: 400 }
      );
    }

    // Проверка URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // Валидация событий
    const validEvents = [
      "transaction.created",
      "transaction.updated",
      "transaction.deleted",
      "budget.exceeded",
      "plan.completed",
    ];

    const invalidEvents = events.filter(
      (event: string) => !validEvents.includes(event)
    );
    if (invalidEvents.length > 0) {
      return NextResponse.json(
        {
          error: `Invalid events: ${invalidEvents.join(", ")}`,
          valid_events: validEvents,
        },
        { status: 400 }
      );
    }

    // Создаём webhook
    const { data: webhook, error } = await supabase
      .from("webhooks")
      .insert({
        user_id: user.id,
        url,
        events,
        secret,
        name,
        description,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating webhook:", error);
      return NextResponse.json(
        { error: "Failed to create webhook" },
        { status: 500 }
      );
    }

    return NextResponse.json({ webhook }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
