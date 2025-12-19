import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";

// GET - список задач пользователя
export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Необходима авторизация" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabase
      .from("kie_tasks")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (category) {
      query = query.eq("category", category);
    }

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching kie_tasks:", error);
      return NextResponse.json(
        { error: "Ошибка получения истории задач" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      tasks: data || [],
      count: data?.length || 0,
    });

  } catch (error) {
    console.error("Kie tasks list error:", error);
    return NextResponse.json(
      { error: "Неизвестная ошибка" },
      { status: 500 }
    );
  }
}

// POST - сохранение новой задачи
export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Необходима авторизация" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { taskId, model, modelName, category, input } = body;

    if (!taskId || !model || !category) {
      return NextResponse.json(
        { error: "Отсутствуют обязательные поля" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("kie_tasks")
      .insert({
        user_id: user.id,
        task_id: taskId,
        model,
        model_name: modelName || model,
        category,
        status: "waiting",
        input: input || {},
      })
      .select()
      .single();

    if (error) {
      console.error("Error inserting kie_task:", error);
      return NextResponse.json(
        { error: "Ошибка сохранения задачи" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      task: data,
    });

  } catch (error) {
    console.error("Kie task create error:", error);
    return NextResponse.json(
      { error: "Неизвестная ошибка" },
      { status: 500 }
    );
  }
}
